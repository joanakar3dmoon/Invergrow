import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'sandbox';
const PAYPAL_BASE = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const ADMIN_CODE = process.env.ADMIN_CODE || 'joan123';
const STATE_ID = 'invergrow_main';

async function supa(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...((opts.headers as Record<string, string>) || {}),
    },
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function getState(): Promise<any> {
  const arr = await supa(`apps?id=eq.${STATE_ID}&select=description`);
  if (Array.isArray(arr) && arr[0]?.description) return JSON.parse(arr[0].description);
  return { balance: 0, netGains: 0, reinvestmentFund: 0, totalWithdrawals: 0, transactions: [], aiWorkers: [], aiLogs: [] };
}

async function saveState(state: any): Promise<void> {
  await supa(`apps?id=eq.${STATE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ description: JSON.stringify(state) }),
    headers: { Prefer: 'return=minimal' },
  });
}

async function getPayPalToken(): Promise<string> {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const d = await r.json() as any;
  if (!d.access_token) throw new Error(`PayPal auth failed: ${d.error_description || d.error || 'unknown'}`);
  return d.access_token;
}

async function sendPayPalPayout(token: string, amount: number, email: string, note: string): Promise<string> {
  const batchId = `INVERGROW-${Date.now()}`;
  const r = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: batchId,
        email_subject: 'Retiro InverGrow',
        email_message: note,
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: { value: amount.toFixed(2), currency: 'EUR' },
        note,
        receiver: email,
        sender_item_id: `item-${Date.now()}`,
      }],
    }),
  });
  const d = await r.json() as any;
  if (d.batch_header?.payout_batch_id) return d.batch_header.payout_batch_id;
  throw new Error(`PayPal payout failed: ${JSON.stringify(d).slice(0, 200)}`);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — listar retiros del historial
  if (req.method === 'GET') {
    try {
      const state = await getState();
      const withdrawals = (state.transactions || [])
        .filter((t: any) => t.type === 'WITHDRAWAL')
        .slice(0, 20);
      return res.status(200).json({
        withdrawals,
        totalWithdrawals: state.totalWithdrawals || 0,
        availableBalance: state.netGains || 0,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — procesar retiro
  if (req.method === 'POST') {
    try {
      const { adminCode, amount, method = 'paypal', destination, notes } = req.body || {};

      // Validar código de admin
      if (adminCode !== ADMIN_CODE) {
        return res.status(403).json({ error: 'Código de acceso incorrecto.' });
      }

      const amt = parseFloat(amount);
      if (!amt || amt <= 0) {
        return res.status(400).json({ error: 'Importe inválido.' });
      }

      const state = await getState();
      const availableNet = parseFloat((state.netGains || 0).toFixed(2));

      if (amt > availableNet) {
        return res.status(400).json({
          error: `Saldo insuficiente. Disponible: €${availableNet.toFixed(2)}`,
          available: availableNet,
        });
      }

      const recipientEmail = destination || 'joanlazaro83@gmail.com';
      const noteText = notes || `Retiro InverGrow — €${amt.toFixed(2)}`;
      const ref = 'WD-' + Date.now().toString(36).toUpperCase();

      let batchId: string | null = null;
      let status = 'PENDING';
      let paypalMessage = '';

      // Intentar PayPal real si hay credenciales
      if (PAYPAL_CLIENT_ID && PAYPAL_SECRET && !PAYPAL_CLIENT_ID.includes('PENDIENTE')) {
        try {
          const token = await getPayPalToken();
          batchId = await sendPayPalPayout(token, amt, recipientEmail, noteText);
          status = 'COMPLETED';
          paypalMessage = `Pago enviado a PayPal. Batch ID: ${batchId}`;
        } catch (ppErr: any) {
          // PayPal falló — registrar como PENDING para pago manual
          status = 'PENDING_MANUAL';
          batchId = `MANUAL-${Date.now()}`;
          paypalMessage = `PayPal no disponible. Retiro pendiente de pago manual a ${recipientEmail}.`;
        }
      } else {
        // Sin credenciales PayPal — modo demo
        status = 'PENDING_SETUP';
        batchId = `DEMO-${Date.now()}`;
        paypalMessage = `Retiro registrado. Configura credenciales PayPal para pagos automáticos.`;
      }

      // Actualizar estado
      state.netGains = parseFloat((availableNet - amt).toFixed(2));
      state.totalWithdrawals = parseFloat(((state.totalWithdrawals || 0) + amt).toFixed(2));

      if (!state.transactions) state.transactions = [];
      state.transactions.unshift({
        id: ref,
        type: 'WITHDRAWAL',
        amount: amt,
        method,
        destination: recipientEmail,
        status,
        batchId,
        notes: noteText,
        timestamp: new Date().toLocaleString('es-ES'),
      });
      if (state.transactions.length > 50) state.transactions = state.transactions.slice(0, 50);

      await saveState(state);

      // También guardar en tabla withdrawals de Supabase para historial persistente
      await supa('withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          method,
          destination: recipientEmail,
          status,
          reference: ref,
          paypal_batch_id: batchId,
          notes: noteText,
        }),
      });

      return res.status(200).json({
        success: true,
        reference: ref,
        batchId,
        status,
        amount: amt,
        destination: recipientEmail,
        newNetGains: state.netGains,
        totalWithdrawals: state.totalWithdrawals,
        message: paypalMessage,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

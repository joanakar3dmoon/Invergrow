import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const STATE_ID = 'invergrow_main';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';
const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

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
  return { balance: 0, netGains: 0, totalWithdrawals: 0, transactions: [], reinvestmentFund: 0 };
}

async function saveState(state: any): Promise<void> {
  await supa(`apps?id=eq.${STATE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ description: JSON.stringify(state) }),
  });
}

async function getPayPalToken(): Promise<string> {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await r.json() as any;
  if (!data.access_token) throw new Error('No se pudo autenticar con PayPal');
  return data.access_token;
}

async function sendPayPalPayout(amount: number, email: string, note: string): Promise<string> {
  const token = await getPayPalToken();
  const batchId = `INVERGROW-${Date.now()}`;
  const r = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender_batch_header: { sender_batch_id: batchId, email_subject: 'Retiro InverGrow', email_message: note },
      items: [{ recipient_type: 'EMAIL', amount: { value: amount.toFixed(2), currency: 'EUR' }, receiver: email, note }],
    }),
  });
  const data = await r.json() as any;
  if (!r.ok) throw new Error(`PayPal error: ${JSON.stringify(data)}`);
  return batchId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { adminCode, amount, method, paypalEmail, note } = req.body || {};
    const validCode = process.env.ADMIN_CODE || 'joan123';
    if (adminCode !== validCode) return res.status(403).json({ error: 'Código de acceso incorrecto.' });

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) return res.status(400).json({ error: 'Importe inválido.' });

    const state = await getState();
    const total = (state.balance || 0) + (state.netGains || 0);
    if (amtNum > total) return res.status(400).json({ error: `Fondos insuficientes. Máximo: €${total.toFixed(2)}` });

    // Descontar del saldo
    let remaining = amtNum;
    if ((state.netGains || 0) >= remaining) {
      state.netGains = +((state.netGains - remaining).toFixed(2));
    } else {
      remaining -= (state.netGains || 0);
      state.netGains = 0;
      state.balance = +((state.balance - remaining).toFixed(2));
    }
    state.totalWithdrawals = +((state.totalWithdrawals || 0) + amtNum).toFixed(2);

    const txId = `tx-owner-${Date.now()}`;
    let statusMsg = '';
    let txStatus = 'PENDING';
    let batchId = '';

    if (method === 'paypal' && PAYPAL_CLIENT_ID && PAYPAL_SECRET) {
      try {
        batchId = await sendPayPalPayout(amtNum, paypalEmail || 'joanlazaro83@gmail.com', note || 'Retiro InverGrow');
        statusMsg = `PayPal Payout €${amtNum.toFixed(2)} enviado a ${paypalEmail || 'joanlazaro83@gmail.com'}. Batch: ${batchId}`;
        txStatus = 'COMPLETED';
      } catch (ppErr: any) {
        statusMsg = `PayPal registrado — ${ppErr.message}`;
        txStatus = 'PENDING';
      }
    } else {
      statusMsg = `Retiro €${amtNum.toFixed(2)} vía ${method || 'paypal'} registrado. Destino: ${paypalEmail || 'joanlazaro83@gmail.com'}`;
      txStatus = 'PENDING';
    }

    // Guardar retiro en Supabase tabla withdrawals
    await supa('withdrawals', {
      method: 'POST',
      body: JSON.stringify({
        id: txId,
        user_id: 'admin-joan',
        user_email: 'joanlazaro83@gmail.com',
        amount: amtNum,
        status: txStatus.toLowerCase(),
        note: (note || '') + ` | metodo:${method || 'paypal'} | destino:${paypalEmail || 'joanlazaro83@gmail.com'}` + (batchId ? ` | batch:${batchId}` : ''),
      }),
    });

    // Añadir transacción al estado
    if (!state.transactions) state.transactions = [];
    state.transactions.unshift({
      id: txId,
      type: 'WITHDRAWAL',
      status: txStatus,
      amount: amtNum,
      date: new Date().toISOString().split('T')[0],
      reference: batchId || `OWNER-${Date.now().toString().slice(-6)}`,
      description: `[PROPIETARIO] ${statusMsg}`,
      gateway: method === 'paypal' ? 'CUSTOM' : 'INTERNAL',
    });
    if (state.transactions.length > 50) state.transactions = state.transactions.slice(0, 50);

    await saveState(state);

    return res.status(200).json({ success: true, message: statusMsg, status: txStatus, newBalance: state.balance, newNetGains: state.netGains });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

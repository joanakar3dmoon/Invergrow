import type { VercelRequest, VercelResponse } from '@vercel/node';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET!;
const PAYPAL_ENV = process.env.PAYPAL_ENV || 'live';
const PAYPAL_BASE = PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function supabase(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(options.headers || {}) } });
  return res.json();
}

async function getPayPalToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error('No se pudo autenticar con PayPal');
  return data.access_token;
}

async function sendPayPalPayout(token: string, amount: number, receiverEmail: string, note: string): Promise<string> {
  const batchId = `INVERGROW-${Date.now()}`;
  const res = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_batch_header: { sender_batch_id: batchId, email_subject: 'Retiro InverGrow', email_message: note || 'Tu retiro de InverGrow ha sido procesado.' }, items: [{ recipient_type: 'EMAIL', amount: { value: amount.toFixed(2), currency: 'EUR' }, receiver: receiverEmail, note: note || 'Retiro InverGrow', sender_item_id: `item-${Date.now()}` }] }) });
  const data = await res.json() as any;
  if (data.batch_header?.payout_batch_id) return data.batch_header.payout_batch_id;
  throw new Error(data.message || JSON.stringify(data));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, method, destination, notes, adminCode } = req.body;
    if (adminCode !== (process.env.ADMIN_CODE || 'joan123')) return res.status(403).json({ error: 'Codigo de acceso incorrecto' });
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Importe invalido' });
    if (!method || !destination) return res.status(400).json({ error: 'Metodo y destino requeridos' });
    const amt = parseFloat(amount);
    const stateArr = await supabase('invergrow_state?select=*&id=eq.main');
    const state = stateArr[0];
    if (!state || parseFloat(state.balance) < amt) return res.status(400).json({ error: `Saldo insuficiente. Disponible: EUR${parseFloat(state?.balance || 0).toFixed(2)}` });
    let paypalBatchId: string | null = null;
    let status = 'PENDING';
    if (method === 'paypal' && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== 'PENDIENTE') {
      try {
        const token = await getPayPalToken();
        paypalBatchId = await sendPayPalPayout(token, amt, destination, notes || 'Retiro InverGrow');
        status = 'COMPLETED';
      } catch (paypalErr: any) {
        status = 'PENDING';
        paypalBatchId = `MANUAL-${Date.now()}`;
      }
    }
    const ref = 'WD-' + Date.now().toString(36).toUpperCase();
    await supabase('invergrow_withdrawals', { method: 'POST', body: JSON.stringify({ amount: amt, method, destination, status, paypal_batch_id: paypalBatchId, notes: notes || '' }) });
    await supabase('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'WITHDRAWAL', status, amount: amt, description: `Retiro ${method.toUpperCase()} to ${destination}`, reference: ref, gateway: method }) });
    const newBalance = parseFloat(state.balance) - amt;
    const newTotalWithdrawals = parseFloat(state.total_withdrawals) + amt;
    await supabase('invergrow_state?id=eq.main', { method: 'PATCH', body: JSON.stringify({ balance: newBalance, total_withdrawals: newTotalWithdrawals, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ success: true, reference: ref, paypalBatchId, status, newBalance, message: method === 'paypal' && paypalBatchId && !paypalBatchId.startsWith('MANUAL') ? `Pago enviado a PayPal. Batch: ${paypalBatchId}` : `Retiro registrado. Procesar manualmente a ${destination}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

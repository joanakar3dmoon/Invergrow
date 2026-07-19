import type { VercelRequest, VercelResponse } from '@vercel/node';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID!;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET!;
const PAYPAL_BASE = process.env.PAYPAL_ENV === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
async function supa(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...((opts.headers as Record<string,string>) || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return {}; }
}
async function paypalToken(): Promise<string> {
  const r = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials' });
  const d = await r.json() as any;
  if (!d.access_token) throw new Error('PayPal auth failed');
  return d.access_token;
}
async function paypalPayout(token: string, amt: number, email: string, note: string): Promise<string> {
  const batchId = 'INVERGROW-' + Date.now();
  const r = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ sender_batch_header: { sender_batch_id: batchId, email_subject: 'Retiro InverGrow' }, items: [{ recipient_type: 'EMAIL', amount: { value: amt.toFixed(2), currency: 'EUR' }, receiver: email, note, sender_item_id: 'item-' + Date.now() }] }) });
  const d = await r.json() as any;
  if (d.batch_header?.payout_batch_id) return d.batch_header.payout_batch_id;
  throw new Error(d.message || 'PayPal error');
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, method, destination, notes, adminCode } = req.body;
    if (adminCode !== (process.env.ADMIN_CODE || 'joan123')) return res.status(403).json({ error: 'Codigo incorrecto' });
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Importe invalido' });
    if (!method || !destination) return res.status(400).json({ error: 'Metodo y destino requeridos' });
    const amt = parseFloat(amount);
    const stateArr = await supa('invergrow_state?select=*&id=eq.main');
    const state = (Array.isArray(stateArr) ? stateArr[0] : null) || { balance: 0, total_withdrawals: 0 };
    if (parseFloat(state.balance) < amt) return res.status(400).json({ error: `Saldo insuficiente. Disponible: EUR${parseFloat(state.balance).toFixed(2)}` });
    let batchId: string | null = null;
    let status = 'PENDING';
    if (method === 'paypal' && PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== 'PENDIENTE') {
      try { const tok = await paypalToken(); batchId = await paypalPayout(tok, amt, destination, notes || 'Retiro InverGrow'); status = 'COMPLETED'; }
      catch { batchId = 'MANUAL-' + Date.now(); }
    }
    const ref = 'WD-' + Date.now().toString(36).toUpperCase();
    await supa('invergrow_withdrawals', { method: 'POST', body: JSON.stringify({ amount: amt, method, destination, status, paypal_batch_id: batchId, notes: notes || '' }) });
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'WITHDRAWAL', status, amount: amt, description: `Retiro ${method} a ${destination}`, reference: ref, gateway: method }) });
    const newBalance = parseFloat(state.balance) - amt;
    const newTotal = parseFloat(state.total_withdrawals) + amt;
    await supa('invergrow_state?id=eq.main', { method: 'PATCH', body: JSON.stringify({ balance: newBalance, total_withdrawals: newTotal, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ success: true, reference: ref, batchId, status, newBalance, message: status === 'COMPLETED' ? `Enviado a PayPal. Batch: ${batchId}` : `Registrado. Procesar a ${destination}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

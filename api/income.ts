import type { VercelRequest, VercelResponse } from '@vercel/node';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
async function supa(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...((opts.headers as Record<string,string>) || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return {}; }
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, source, description } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Importe invalido' });
    if (!source) return res.status(400).json({ error: 'Fuente requerida' });
    const amt = parseFloat(amount);
    await supa('invergrow_income', { method: 'POST', body: JSON.stringify({ source, amount: amt, description: description || source }) });
    const ref = 'INC-' + Date.now().toString(36).toUpperCase();
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'DEPOSIT', status: 'COMPLETED', amount: amt, description: description || ('Ingreso: ' + source), reference: ref, gateway: source }) });
    const stateArr = await supa('invergrow_state?select=*&id=eq.main');
    const state = (Array.isArray(stateArr) ? stateArr[0] : null) || { balance: 0, net_gains: 0 };
    const newBalance = parseFloat(state.balance) + amt;
    const newNetGains = parseFloat(state.net_gains) + amt;
    await supa('invergrow_state?id=eq.main', { method: 'PATCH', body: JSON.stringify({ balance: newBalance, net_gains: newNetGains, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ success: true, balance: newBalance, reference: ref });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

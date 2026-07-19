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
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (req.method === 'GET') {
      const arr = await supa('invergrow_state?select=*&id=eq.main');
      const s = (Array.isArray(arr) ? arr[0] : null) || { balance: 0, invested_capital: 0 };
      return res.status(200).json({ balance: parseFloat(s.balance), investedCapital: parseFloat(s.invested_capital), reinvestPercent: 70, estimatedMonthlyReturn: parseFloat(s.invested_capital) * 0.124 / 12 });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { adminCode, percentage } = req.body || {};
    if (adminCode !== (process.env.ADMIN_CODE || 'joan123')) return res.status(403).json({ error: 'Codigo incorrecto' });
    const arr = await supa('invergrow_state?select=*&id=eq.main');
    const state = (Array.isArray(arr) ? arr[0] : null);
    if (!state) return res.status(500).json({ error: 'Estado no encontrado' });
    const balance = parseFloat(state.balance);
    if (balance <= 0) return res.status(400).json({ error: 'No hay saldo para reinvertir' });
    const pct = percentage || 70;
    const reinvAmt = parseFloat(((balance * pct) / 100).toFixed(2));
    if (reinvAmt < 0.01) return res.status(400).json({ error: 'Importe minimo EUR0.01' });
    const ref = 'REINV-' + Date.now().toString(36).toUpperCase();
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'AI_REINVEST', status: 'COMPLETED', amount: reinvAmt, description: `Reinversion ${pct}% del saldo`, reference: ref, gateway: 'INTERNAL' }) });
    const newBalance = balance - reinvAmt;
    const newInvested = parseFloat(state.invested_capital) + reinvAmt;
    await supa('invergrow_state?id=eq.main', { method: 'PATCH', body: JSON.stringify({ balance: newBalance, invested_capital: newInvested, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ success: true, reinvestedAmount: reinvAmt, newBalance, newInvestedCapital: newInvested, reference: ref, message: `EUR${reinvAmt.toFixed(2)} reinvertidos (${pct}%). Capital: EUR${newInvested.toFixed(2)}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

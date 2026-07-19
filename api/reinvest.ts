import type { VercelRequest, VercelResponse } from '@vercel/node';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
async function supabase(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(options.headers || {}) } });
  return res.json();
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    if (req.method === 'GET') {
      const stateArr = await supabase('invergrow_state?select=*&id=eq.main');
      const state = stateArr[0] || { balance: 0, invested_capital: 0 };
      return res.status(200).json({ balance: parseFloat(state.balance), investedCapital: parseFloat(state.invested_capital), reinvestPercent: 70, estimatedMonthlyReturn: parseFloat(state.invested_capital) * 0.124 / 12 });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const { adminCode, percentage } = req.body || {};
    if (adminCode !== (process.env.ADMIN_CODE || 'joan123')) return res.status(403).json({ error: 'Codigo de acceso incorrecto' });
    const stateArr = await supabase('invergrow_state?select=*&id=eq.main');
    const state = stateArr[0];
    if (!state) return res.status(500).json({ error: 'Estado no encontrado' });
    const balance = parseFloat(state.balance);
    if (balance <= 0) return res.status(400).json({ error: 'No hay saldo disponible para reinvertir' });
    const pct = percentage || 70;
    const reinvestAmount = parseFloat(((balance * pct) / 100).toFixed(2));
    if (reinvestAmount < 1) return res.status(400).json({ error: 'Importe minimo de reinversion: EUR1.00' });
    const ref = 'REINV-' + Date.now().toString(36).toUpperCase();
    await supabase('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'AI_REINVEST', status: 'COMPLETED', amount: reinvestAmount, description: `Reinversion automatica ${pct}% del saldo`, reference: ref, gateway: 'INTERNAL' }) });
    const newBalance = balance - reinvestAmount;
    const newInvested = parseFloat(state.invested_capital) + reinvestAmount;
    await supabase('invergrow_state?id=eq.main', { method: 'PATCH', body: JSON.stringify({ balance: newBalance, invested_capital: newInvested, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ success: true, reinvestedAmount: reinvestAmount, newBalance, newInvestedCapital: newInvested, reference: ref, message: `EUR${reinvestAmount.toFixed(2)} reinvertidos (${pct}% del saldo). Capital total: EUR${newInvested.toFixed(2)}` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

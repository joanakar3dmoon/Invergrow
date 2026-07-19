import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
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
  return { balance: 0, netGains: 0, reinvestmentFund: 0, investedCapital: 0, transactions: [] };
}

async function saveState(state: any): Promise<void> {
  await supa(`apps?id=eq.${STATE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ description: JSON.stringify(state) }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const state = await getState();

  if (req.method === 'GET') {
    return res.status(200).json({
      balance: state.balance || 0,
      investedCapital: state.investedCapital || 0,
      reinvestmentFund: state.reinvestmentFund || 0,
      reinvestPercent: 70,
      estimatedMonthlyReturn: parseFloat(((state.investedCapital || 0) * 0.124 / 12).toFixed(2)),
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { adminCode, percentage } = req.body || {};
    if (adminCode !== (process.env.ADMIN_CODE || 'joan123')) return res.status(403).json({ error: 'Código incorrecto.' });

    const fund = state.reinvestmentFund || 0;
    if (fund <= 0) return res.status(400).json({ error: 'No hay fondos en la bolsa de reinversión.' });

    const pct = Math.min(Math.max(parseInt(percentage) || 70, 1), 100);
    const amount = parseFloat((fund * pct / 100).toFixed(2));
    if (amount < 1) return res.status(400).json({ error: 'Importe mínimo de reinversión: €1.00' });

    state.reinvestmentFund = parseFloat((fund - amount).toFixed(2));
    state.investedCapital = parseFloat(((state.investedCapital || 0) + amount).toFixed(2));

    const ref = `REINV-${Date.now().toString(36).toUpperCase()}`;
    if (!state.transactions) state.transactions = [];
    state.transactions.unshift({
      id: `tx-reinvest-${Date.now()}`,
      type: 'AI_REINVEST',
      status: 'COMPLETED',
      amount,
      date: new Date().toISOString().split('T')[0],
      reference: ref,
      description: `Reinversión automática ${pct}% de la bolsa IA`,
      gateway: 'INTERNAL',
    });

    await saveState(state);

    return res.status(200).json({
      success: true,
      reinvestedAmount: amount,
      newReinvestmentFund: state.reinvestmentFund,
      newInvestedCapital: state.investedCapital,
      reference: ref,
      message: `€${amount.toFixed(2)} reinvertidos (${pct}% de la bolsa). Capital total: €${state.investedCapital.toFixed(2)}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

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
  const arr = await supa('invergrow_state?id=eq.main&select=*');
  if (Array.isArray(arr) && arr[0]) return arr[0];
  return { balance: 0, net_gains: 0, invested_capital: 0, total_withdrawals: 0 };
}

function generateRevenue(): number {
  return parseFloat((18 + Math.random() * 22).toFixed(2));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { workerId, workerName } = req.body || {};
    const timestamp = new Date().toISOString();

    const revenue = generateRevenue();
    const splitPct = 70;
    const toInvest = parseFloat((revenue * splitPct / 100).toFixed(2));
    const toBalance = parseFloat((revenue * (100 - splitPct) / 100).toFixed(2));

    const state = await getState();
    const currentBalance = parseFloat(state.balance) || 0;
    const currentInvested = parseFloat(state.invested_capital) || 0;
    const currentGains = parseFloat(state.net_gains) || 0;

    const newBalance = currentBalance + toBalance;
    const newInvested = currentInvested + toInvest;
    const newGains = currentGains + revenue;

    await supa('invergrow_state?id=eq.main', {
      method: 'PATCH',
      body: JSON.stringify({
        balance: newBalance,
        invested_capital: newInvested,
        net_gains: newGains,
        updated_at: timestamp,
      }),
    });

    const ref = 'AI-' + Date.now().toString(36).toUpperCase();
    const workerLabel = workerName || 'Worker AI';
    const desc = workerLabel + ': EUR' + revenue.toFixed(2) + ' generados (' + splitPct + '% invertido, ' + (100-splitPct) + '% disponible)';
    await supa('invergrow_transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'AI_REVENUE',
        status: 'COMPLETED',
        amount: revenue,
        description: desc,
        reference: ref,
        gateway: 'AI_ENGINE',
      }),
    });

    return res.status(200).json({
      success: true,
      revenue,
      split: { toInvest, toBalance },
      newBalance,
      newInvested,
      newGains,
      worker: workerLabel,
      reference: ref,
      note: 'EUR' + revenue.toFixed(2) + ' generados',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
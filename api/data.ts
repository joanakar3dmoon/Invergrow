import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function supabase(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const [stateArr, txArr, withdrawalsArr, incomeArr] = await Promise.all([
      supabase('invergrow_state?select=*&id=eq.main'),
      supabase('invergrow_transactions?select=*&order=created_at.desc&limit=20'),
      supabase('invergrow_withdrawals?select=*&order=created_at.desc&limit=10'),
      supabase('invergrow_income?select=*&order=created_at.desc&limit=10'),
    ]);

    const state = stateArr[0] || { balance: 0, invested_capital: 0, total_withdrawals: 0, net_gains: 0 };

    return res.status(200).json({
      balance: parseFloat(state.balance) || 0,
      investedCapital: parseFloat(state.invested_capital) || 0,
      totalWithdrawals: parseFloat(state.total_withdrawals) || 0,
      netGains: parseFloat(state.net_gains) || 0,
      reinvestmentFund: 0,
      collaborators: [],
      transactions: (txArr || []).map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: parseFloat(tx.amount),
        description: tx.description,
        reference: tx.reference,
        date: tx.created_at?.split('T')[0],
        gateway: tx.gateway,
      })),
      withdrawals: withdrawalsArr || [],
      income: incomeArr || [],
      webhookLogs: [],
      aiWorkers: [],
      aiLogs: [],
      apiConfig: { geminiConnected: false, distributionWebhook: '', targetMarket: '', payoutModel: 'SPLIT_70_30' },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

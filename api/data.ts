import type { VercelRequest, VercelResponse } from '@vercel/node';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
async function supa(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...((opts.headers as Record<string, string>) || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const stateArr = await supa('invergrow_state?select=*&id=eq.main');
    const state = (Array.isArray(stateArr) && stateArr[0]) ? stateArr[0] : { balance: 0, invested_capital: 0, total_withdrawals: 0, net_gains: 0 };
    const txArr = await supa('invergrow_transactions?select=*&order=created_at.desc&limit=20');
    const transactions = Array.isArray(txArr) ? txArr : [];
    const incArr = await supa('invergrow_income?select=*&order=created_at.desc&limit=20');
    const incomes = Array.isArray(incArr) ? incArr : [];
    const wdArr = await supa('invergrow_withdrawals?select=*&order=created_at.desc&limit=10');
    const withdrawals = Array.isArray(wdArr) ? wdArr : [];
    const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
    const hasPayPal = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_ID !== 'PENDIENTE');
    const defaultWorkers = [
      { id: 'ai-1', name: 'ContentBot Alpha', role: 'Creador de Contenido', status: 'active', totalGenerated: 0, tasksCompleted: 0 },
      { id: 'ai-2', name: 'TradeBot Beta', role: 'Analisis de Mercado', status: 'active', totalGenerated: 0, tasksCompleted: 0 },
      { id: 'ai-3', name: 'AffiliateBot Gamma', role: 'Marketing de Afiliados', status: 'active', totalGenerated: 0, tasksCompleted: 0 },
      { id: 'ai-4', name: 'DataBot Delta', role: 'Procesamiento de Datos', status: 'active', totalGenerated: 0, tasksCompleted: 0 },
    ];
    return res.status(200).json({
      balance: parseFloat(state.balance) || 0,
      netGains: parseFloat(state.net_gains) || 0,
      investedCapital: parseFloat(state.invested_capital) || 0,
      totalWithdrawals: parseFloat(state.total_withdrawals) || 0,
      reinvestmentFund: 0,
      transactions,
      incomes,
      withdrawals,
      aiWorkers: defaultWorkers,
      workers: defaultWorkers.length,
      aiLogs: [],
      webhookLogs: [],
      apiConfig: { geminiConnected: hasGemini, paypalConnected: hasPayPal, paypalEnv: process.env.PAYPAL_ENV || 'live', supabaseConnected: !!SUPABASE_KEY, adminConfigured: true },
      lastUpdated: new Date().toISOString(),
      version: '4.0',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

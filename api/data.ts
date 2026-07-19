import type { VercelRequest, VercelResponse } from '@vercel/node';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
async function supa(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...((opts.headers as Record<string,string>) || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const stateArr = await supa('invergrow_state?select=*&id=eq.main');
    const st = (Array.isArray(stateArr) && stateArr[0]) ? stateArr[0] : { balance: 0, invested_capital: 0, total_withdrawals: 0, net_gains: 0 };
    const txArr = await supa('invergrow_transactions?select=*&order=created_at.desc&limit=20');
    const rawTx = Array.isArray(txArr) ? txArr : [];
    const transactions = rawTx.map((t: any) => ({ id: t.id, type: t.type || 'DEPOSIT', status: t.status || 'COMPLETED', amount: parseFloat(t.amount) || 0, date: t.created_at, reference: t.reference || '', description: t.description || '', gateway: t.gateway || 'INTERNAL' }));
    const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
    const hasPayPal = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_ID !== 'PENDIENTE');
    const aiWorkers = [
      { id: 'ai-1', name: 'ContentBot Alpha', role: 'Creador de Contenido', status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.02, unlocked: true, costToUnlock: 0, costToUpgrade: 50, totalGenerated: 0, icon: '🤖' },
      { id: 'ai-2', name: 'TradeBot Beta', role: 'Analisis de Mercado', status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.03, unlocked: true, costToUnlock: 0, costToUpgrade: 75, totalGenerated: 0, icon: '📈' },
      { id: 'ai-3', name: 'AffiliateBot Gamma', role: 'Marketing de Afiliados', status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.025, unlocked: true, costToUnlock: 0, costToUpgrade: 60, totalGenerated: 0, icon: '🛒' },
      { id: 'ai-4', name: 'DataBot Delta', role: 'Procesamiento de Datos', status: 'IDLE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.015, unlocked: false, costToUnlock: 100, costToUpgrade: 50, totalGenerated: 0, icon: '💾' },
    ];
    return res.status(200).json({
      balance: parseFloat(st.balance) || 0,
      netGains: parseFloat(st.net_gains) || 0,
      investedCapital: parseFloat(st.invested_capital) || 0,
      totalWithdrawals: parseFloat(st.total_withdrawals) || 0,
      reinvestmentFund: 0,
      collaborators: [],
      transactions,
      webhookLogs: [],
      aiWorkers,
      aiLogs: [],
      apiConfig: { geminiConnected: hasGemini, paypalConnected: hasPayPal, paypalEnv: process.env.PAYPAL_ENV || 'live', supabaseConnected: !!SUPABASE_KEY, distributionWebhook: '', targetMarket: 'ES', payoutModel: 'SPLIT_70_30' },
      lastUpdated: new Date().toISOString(),
      version: '4.1',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
       }

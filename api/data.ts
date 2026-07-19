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
  if (Array.isArray(arr) && arr[0]?.description) {
    return JSON.parse(arr[0].description);
  }
  return {
    balance: 0, netGains: 0, reinvestmentFund: 0, totalWithdrawals: 0,
    investedCapital: 0, transactions: [], aiWorkers: [], aiLogs: [], webhookLogs: [],
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const state = await getState();

    // Workers con defaults si no existen
    const defaultWorkers = [
      { id: 'ai-1', name: 'ContentBot Alpha', role: 'Creador de Contenido', status: 'active', totalGenerated: 0, tasksCompleted: 0 },
      { id: 'ai-2', name: 'TradeBot Beta', role: 'Análisis de Mercado', status: 'active', totalGenerated: 0, tasksCompleted: 0 },
      { id: 'ai-3', name: 'AffiliateBot Gamma', role: 'Marketing de Afiliados', status: 'active', totalGenerated: 0, tasksCompleted: 0 },
      { id: 'ai-4', name: 'DataBot Delta', role: 'Procesamiento de Datos', status: 'active', totalGenerated: 0, tasksCompleted: 0 },
    ];

    const workers = (state.aiWorkers && state.aiWorkers.length > 0) ? state.aiWorkers : defaultWorkers;

    const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
    const hasPayPal = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_ID !== 'PENDIENTE');

    return res.status(200).json({
      // Balances principales
      balance: state.balance || 0,
      netGains: state.netGains || 0,
      reinvestmentFund: state.reinvestmentFund || 0,
      totalWithdrawals: state.totalWithdrawals || 0,
      investedCapital: state.investedCapital || 0,

      // Workers
      aiWorkers: workers,
      workers: workers.length,

      // Historial
      transactions: (state.transactions || []).slice(0, 20),
      aiLogs: (state.aiLogs || []).slice(0, 30),
      webhookLogs: (state.webhookLogs || []).slice(0, 20),

      // Config APIs
      apiConfig: {
        geminiConnected: hasGemini,
        paypalConnected: hasPayPal,
        paypalEnv: process.env.PAYPAL_ENV || 'sandbox',
        supabaseConnected: !!SUPABASE_KEY,
        adminConfigured: true,
      },

      // Meta
      lastUpdated: new Date().toISOString(),
      version: '3.0',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

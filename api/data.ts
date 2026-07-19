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
  try { return JSON.parse(text); } catch { return {}; }
}

const defaultState = {
  balance: 0,
  investedCapital: 0,
  totalWithdrawals: 0,
  netGains: 0,
  reinvestmentFund: 0,
  collaborators: [],
  transactions: [],
  webhookLogs: [],
  aiWorkers: [
    { id: 'ai-1', name: 'SEO Copywriter Pro',        role: 'Generación de artículos SEO',            status: 'ACTIVE', level: 1, model: 'gemini-2.0-flash',      baseIncomeRate: 0.45, unlocked: true,  costToUnlock: 0,    costToUpgrade: 200, totalGenerated: 0, icon: 'PenTool'  },
    { id: 'ai-2', name: 'Micro-SaaS API Gateway',    role: 'Atención de peticiones API de terceros', status: 'ACTIVE', level: 1, model: 'gemini-2.0-flash',      baseIncomeRate: 0.28, unlocked: true,  costToUnlock: 0,    costToUpgrade: 250, totalGenerated: 0, icon: 'Cpu'      },
    { id: 'ai-3', name: 'Digital Infoproduct Maker', role: 'Auto-publicación de e-books',            status: 'IDLE',   level: 0, model: 'gemini-2.0-flash-lite', baseIncomeRate: 0.65, unlocked: false, costToUnlock: 500,  costToUpgrade: 400, totalGenerated: 0, icon: 'BookOpen' },
    { id: 'ai-4', name: 'Batch Content Translator',  role: 'Traducción de catálogos en lote',        status: 'IDLE',   level: 0, model: 'gemini-2.0-flash-lite', baseIncomeRate: 1.15, unlocked: false, costToUnlock: 1100, costToUpgrade: 850, totalGenerated: 0, icon: 'Globe'    }
  ],
  aiLogs: [],
  apiConfig: {
    geminiConnected: false,
    distributionWebhook: '',
    targetMarket: 'WordPress CMS y Tiendas Digitales',
    payoutModel: 'SPLIT_70_30'
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Estado persistido en tabla apps con id=invergrow_main
    const stateArr = await supa(`apps?id=eq.${STATE_ID}&select=description`);
    const raw = Array.isArray(stateArr) && stateArr[0]?.description;
    const state = raw ? { ...defaultState, ...JSON.parse(raw) } : { ...defaultState };

    // Retiros del propietario desde tabla withdrawals
    const withdrawals = await supa('withdrawals?user_id=eq.admin-joan&order=created_at.desc&limit=30');

    state.apiConfig.geminiConnected = !!process.env.GEMINI_API_KEY;

    return res.status(200).json({
      ...state,
      withdrawalsHistory: Array.isArray(withdrawals) ? withdrawals : []
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

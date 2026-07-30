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

const DEFAULT_WORKERS = [
  { id: 'ai-1', name: 'ContentBot Alpha',   role: 'Creador de Contenido',    status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.02,  unlocked: true,  costToUnlock: 0,   costToUpgrade: 50, totalGenerated: 0, icon: '🤖' },
  { id: 'ai-2', name: 'TradeBot Beta',       role: 'Analisis de Mercado',     status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.03,  unlocked: true,  costToUnlock: 0,   costToUpgrade: 75, totalGenerated: 0, icon: '📈' },
  { id: 'ai-3', name: 'AffiliateBot Gamma',  role: 'Marketing de Afiliados',  status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.025, unlocked: true,  costToUnlock: 0,   costToUpgrade: 60, totalGenerated: 0, icon: '🛒' },
  { id: 'ai-4', name: 'DataBot Delta',       role: 'Procesamiento de Datos',  status: 'IDLE',   level: 1, model: 'gemini-flash', baseIncomeRate: 0.015, unlocked: false, costToUnlock: 100, costToUpgrade: 50, totalGenerated: 0, icon: '💾' },
];

function getWorkers(state: any): any[] {
  if (state.workers && Array.isArray(state.workers) && state.workers.length > 0) {
    return state.workers;
  }
  return DEFAULT_WORKERS;
}

// Level-based revenue: base €18-22 * multiplier per level
function generateRevenue(level: number = 1): number {
  const baseMin = 18 + (level - 1) * 10;   // Lv.1=18, Lv.2=28, Lv.3=38...
  const baseMax = 22 + (level - 1) * 12;   // Lv.1=22, Lv.2=34, Lv.3=46...
  return parseFloat((baseMin + Math.random() * (baseMax - baseMin)).toFixed(2));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { workerId } = req.body || {};
    const timestamp = new Date().toISOString();
    const splitPct = 50;

    const state = await getState();
    const workers = getWorkers(state);
    let worker = workers.find((w: any) => w.id === workerId);

    // If worker found, use its level. Otherwise default Lv.1
    const level = worker ? (worker.level || 1) : 1;
    const revenue = generateRevenue(level);
    const toInvest = parseFloat((revenue * splitPct / 100).toFixed(2));
    const toBalance = parseFloat((revenue * (100 - splitPct) / 100).toFixed(2));

    const currentBalance = parseFloat(state.balance) || 0;
    const currentInvested = parseFloat(state.invested_capital) || 0;
    const currentGains = parseFloat(state.net_gains) || 0;

    const newBalance = currentBalance + toBalance;
    const newInvested = currentInvested + toInvest;
    const newGains = currentGains + revenue;

    // Update worker totalGenerated if we found it
    if (worker) {
      worker.totalGenerated = (worker.totalGenerated || 0) + revenue;
    }

    // Update state
    const patchBody: any = {
      balance: newBalance,
      invested_capital: newInvested,
      net_gains: newGains,
      updated_at: timestamp,
    };
    if (worker) {
      patchBody.workers = JSON.stringify(workers);
    }
    await supa('invergrow_state?id=eq.main', {
      method: 'PATCH',
      body: JSON.stringify(patchBody),
    });

    const ref = 'AI-' + Date.now().toString(36).toUpperCase();
    const workerLabel = worker ? worker.name : (req.body?.workerName || 'Worker AI');
    const desc = workerLabel + ' (Lv.' + level + '): EUR' + revenue.toFixed(2) + ' generados (' + splitPct + '% invertido, ' + (100-splitPct) + '% disponible)';
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
      level,
      split: { toInvest, toBalance },
      newBalance,
      newInvested,
      newGains,
      worker: workerLabel,
      reference: ref,
      note: 'EUR' + revenue.toFixed(2) + ' generados (Lv.' + level + ')',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
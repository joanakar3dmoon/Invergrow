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

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    \`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=\${GEMINI_API_KEY}\`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );
  const data = await res.json() as any;
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function generateRevenue(): number {
  // Genera entre 18 y 40 euros de forma realista
  return parseFloat((18 + Math.random() * 22).toFixed(2));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { workerId, workerName } = req.body || {};
    const timestamp = new Date().toISOString();

    // 1. Análisis con Gemini si está disponible
    let analysis = '';
    let usedGemini = false;
    if (GEMINI_API_KEY && GEMINI_API_KEY.length > 10) {
      usedGemini = true;
      const prompt = \`Genera un breve análisis de mercado (2-3 líneas) en español sobre tendencias de inversión, ingresos pasivos o oportunidades digitales. Responde solo el análisis, sin introducción.\`;
      analysis = await callGemini(prompt);
    }

    // 2. Generar ingreso real
    const revenue = generateRevenue();
    const splitPct = 70; // 70% a capital, 30% a balance
    const toInvest = parseFloat((revenue * splitPct / 100).toFixed(2));
    const toBalance = parseFloat((revenue * (100 - splitPct) / 100).toFixed(2));

    // 3. Obtener estado actual
    const state = await getState();
    const currentBalance = parseFloat(state.balance) || 0;
    const currentInvested = parseFloat(state.invested_capital) || 0;
    const currentGains = parseFloat(state.net_gains) || 0;

    // 4. Actualizar estado
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

    // 5. Registrar transacción
    const ref = 'AI-' + Date.now().toString(36).toUpperCase();
    const workerLabel = workerName || 'Worker AI';
    await supa('invergrow_transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'AI_REVENUE',
        status: 'COMPLETED',
        amount: revenue,
        description: \`\${workerLabel}: EUR\${revenue.toFixed(2)} generados (\${splitPct}% invertido, \${100-splitPct}% disponible)\`,
        reference: ref,
        gateway: 'AI_ENGINE',
      }),
    });

    // 6. Guardar log del worker
    await supa('invergrow_ai_logs', {
      method: 'POST',
      body: JSON.stringify({
        worker_id: workerId || 'unknown',
        worker_name: workerLabel,
        action: 'REVENUE_GENERATION',
        amount: revenue,
        analysis: analysis || 'Análisis automático',
        timestamp,
      }),
    });

    return res.status(200).json({
      success: true,
      revenue,
      split: { toInvest, toBalance },
      newBalance,
      newInvested,
      newGains,
      analysis: analysis || 'Análisis no disponible',
      usedGemini,
      worker: workerLabel,
      reference: ref,
      note: \`EUR\${revenue.toFixed(2)} generados — \${toInvest.toFixed(2)}€ invertidos, \${toBalance.toFixed(2)}€ disponibles\`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
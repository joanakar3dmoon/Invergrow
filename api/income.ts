import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const STATE_ID = 'invergrow_main';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
  return { balance: 0, netGains: 0, reinvestmentFund: 0, totalWithdrawals: 0, transactions: [], aiWorkers: [], aiLogs: [] };
}

async function saveState(state: any): Promise<void> {
  await supa(`apps?id=eq.${STATE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ description: JSON.stringify(state) }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { workerId, prompt, topic } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Falta la instrucción.' });

    const state = await getState();
    const workers = state.aiWorkers || [];
    const worker = workers.find((w: any) => w.id === workerId) || workers[0];
    if (!worker) return res.status(400).json({ error: 'Worker no encontrado.' });

    let resultText = '';
    const hasKey = !!process.env.GEMINI_API_KEY;

    if (hasKey) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Eres ${worker.name}, un agente IA especializado en ${worker.role}.\nTema: "${topic || 'Ingresos Pasivos con IA'}"\nInstrucción: "${prompt}"\nGenera un activo digital monetizable en Markdown: título, precio sugerido, contenido completo, estrategia de distribución.`,
      });
      resultText = response.text || 'Sin respuesta.';
    } else {
      resultText = `### ${worker.name} — Demo\n**Tema:** ${topic || 'Ingresos Pasivos'}\n\n*Conecta GEMINI_API_KEY para generación real.*\n\n#### Activo generado\n- Precio: €9.99\n- Canal: Gumroad, Amazon KDP\n- Contenido: Guía de ${topic || 'ingresos pasivos'} con IA, 30 páginas.`;
    }

    const reward = parseFloat((18 + Math.random() * 22).toFixed(2));
    const payoutModel = state.apiConfig?.payoutModel || 'SPLIT_70_30';
    const toReinvest = payoutModel === '100_REINVEST' ? reward : payoutModel === '100_WITHDRAW' ? 0 : parseFloat((reward * 0.7).toFixed(2));
    const toNet = payoutModel === '100_WITHDRAW' ? reward : payoutModel === '100_REINVEST' ? 0 : parseFloat((reward * 0.3).toFixed(2));

    state.reinvestmentFund = parseFloat(((state.reinvestmentFund || 0) + toReinvest).toFixed(2));
    state.netGains = parseFloat(((state.netGains || 0) + toNet).toFixed(2));

    if (worker) worker.totalGenerated = parseFloat(((worker.totalGenerated || 0) + reward).toFixed(2));

    if (!state.aiLogs) state.aiLogs = [];
    state.aiLogs.unshift({
      id: `ai-l-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('es-ES', { hour12: false }),
      workerName: worker.name,
      action: 'Generación Manual',
      revenue: reward,
      details: `Activo sobre '${topic}' generado. €${reward.toFixed(2)} → €${toReinvest.toFixed(2)} reinversión + €${toNet.toFixed(2)} ganancias netas.`,
    });
    if (state.aiLogs.length > 30) state.aiLogs = state.aiLogs.slice(0, 30);

    await saveState(state);

    return res.status(200).json({ success: true, text: resultText, revenue: reward, reinvestAmt: toReinvest, netAmt: toNet, data: state });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
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
  return { balance: 0, netGains: 0, reinvestmentFund: 0, totalWithdrawals: 0, aiWorkers: [], aiLogs: [], webhookLogs: [] };
}

async function saveState(state: any) {
  const arr = await supa(`apps?id=eq.${STATE_ID}&select=id`);
  const exists = Array.isArray(arr) && arr.length > 0;
  if (exists) {
    await supa(`apps?id=eq.${STATE_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ description: JSON.stringify(state), updated_at: new Date().toISOString() }),
    });
  } else {
    await supa('apps', {
      method: 'POST',
      body: JSON.stringify({ id: STATE_ID, name: 'InverGrow State', description: JSON.stringify(state) }),
    });
  }
}

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { workerId, topic, prompt } = req.body;
    if (!topic || !prompt) return res.status(400).json({ error: 'Faltan topic o prompt' });

    // Generar contenido real con Gemini
    const fullPrompt = `Eres un experto en marketing de contenidos y monetización digital. 
Tema: ${topic}
Instrucciones: ${prompt}

Genera el contenido solicitado de forma profesional, estructurada y lista para publicar.`;

    let generatedText = '';
    let usedGemini = false;

    if (GEMINI_API_KEY && GEMINI_API_KEY.length > 10) {
      generatedText = await callGemini(fullPrompt);
      usedGemini = true;
    } else {
      return res.status(503).json({ error: 'API Gemini no configurada. Añade GEMINI_API_KEY en Vercel.' });
    }

    // Calcular ingresos reales: 0 — el contenido generado es el valor, no dinero ficticio
    // El ingreso real vendrá de AdMob/afiliados cuando usuarios interactúen
    const revenue = 0;

    // Guardar en estado
    const state = await getState();
    const worker = state.aiWorkers?.find((w: any) => w.id === workerId);
    const workerName = worker?.name || 'ContentBot';

    const logEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString('es-ES'),
      workerName,
      action: 'CONTENIDO GENERADO',
      details: `Tema: ${topic} | ${generatedText.length} caracteres producidos con Gemini`,
      revenue,
    };

    state.aiLogs = [logEntry, ...(state.aiLogs || [])].slice(0, 50);
    await saveState(state);

    // Si hay webhook configurado, enviar el contenido
    if (state.apiConfig?.distributionWebhook) {
      try {
        await fetch(state.apiConfig.distributionWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, content: generatedText, worker: workerName, timestamp: new Date().toISOString() }),
        });
      } catch (_) { /* webhook error no crítico */ }
    }

    return res.status(200).json({
      success: true,
      text: generatedText,
      revenue,
      usedGemini,
      data: state,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

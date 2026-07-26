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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${GEMINI_API_KEY}`,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // ─── Log de ejecución ───────────────────────────────────────────────
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, type: 'content_generation' };

    // ─── Generar contenido SEO con Gemini ──────────────────────────────
    const topic = req.body?.topic || '';
    const prompt = topic
      ? `Escribe un artículo corto SEO-friendly (200-300 palabras) en español sobre "${topic}". Incluye recomendaciones de productos de Amazon donde sea relevante. Usa tono informativo y útil.`
      : `Crea un artículo corto (200-300 palabras) en español sobre finanzas personales o productividad. Recomienda productos de Amazon útiles donde sea natural. Usa tono cercano y práctico.`;

    let generatedText = '';
    let usedGemini = false;

    if (GEMINI_API_KEY && GEMINI_API_KEY.length > 10) {
      usedGemini = true;
      generatedText = await callGemini(prompt);
    }
    if (!generatedText) {
      usedGemini = false;
      generatedText = `### Guía práctica: ${topic || 'Finanzas personales'}\n\nArtículo generado por InverGrow. Recomendamos productos de Amazon para ayudarte en tu día a día.`;
    }

    // ─── Guardar como contenido generado (NO como ingreso) ─────────────
    await supa('invergrow_content', {
      method: 'POST',
      body: JSON.stringify({
        title: topic || 'Guía automática',
        content: generatedText,
        created_at: timestamp,
        used_gemini: usedGemini,
      }),
    });

    // ─── Registrar transacción de AUDITORÍA (no ingreso) ───────────────
    await supa('invergrow_transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'CONTENT',
        status: 'COMPLETED',
        amount: 0,
        description: `Contenido generado: ${topic || 'automático'}`,
        reference: 'GEN-' + Date.now().toString(36).toUpperCase(),
        gateway: 'GEMINI',
      }),
    });

    // ─── Devolver estado actual (sin cambios de balance) ───────────────
    const state = await getState();
    const balance = parseFloat(state.balance) || 0;
    const netGains = parseFloat(state.net_gains) || 0;
    const investedCapital = parseFloat(state.invested_capital) || 0;

    return res.status(200).json({
      success: true,
      text: generatedText,
      usedGemini,
      balance,
      netGains,
      investedCapital,
      note: 'Contenido generado. No se han añadido ingresos ficticios.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
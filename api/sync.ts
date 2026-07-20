import type { VercelRequest, VercelResponse } from '@vercel/node';

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'https://invergrow.vercel.app';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

async function sb(path: string, options: RequestInit = {}) {
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

async function callEndpoint(path: string) {
  const res = await fetch(`${BASE_URL}/api/${path}`);
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const results: Record<string, any> = {};

  // 1. Sincronizar YouTube
  try {
    const yt = await callEndpoint('youtube');
    results.youtube = yt.connected ? 'ok' : 'no_token';

    // Si hay datos reales, registrar ingresos estimados del mes
    if (yt.connected && yt.data) {
      // Estimación: $1 RPM × views/1000 (muy conservador para canal nuevo)
      const estimatedRevenue = (yt.data.total_views / 1000) * 1.0;
      // Solo registrar si es diferente al último
      const lastIncome = await sb('invergrow_income?source=eq.youtube&order=created_at.desc&limit=1');
      const lastAmt = lastIncome[0]?.amount || 0;
      if (Math.abs(estimatedRevenue - lastAmt) > 0.01) {
        await fetch(`${BASE_URL}/api/income`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(estimatedRevenue.toFixed(2)),
            source: 'youtube',
            description: `YouTube @Equilibrio-c2k — ${yt.data.total_views.toLocaleString()} views`,
          }),
        });
      }
    }
  } catch (e: any) {
    results.youtube = `error: ${e.message}`;
  }

  // 2. Sincronizar AdMob
  try {
    const admob = await callEndpoint('admob');
    results.admob = admob.connected ? 'ok' : 'no_token';

    if (admob.connected && admob.data?.total_revenue > 0) {
      const lastIncome = await sb('invergrow_income?source=eq.admob&order=created_at.desc&limit=1');
      const lastAmt = lastIncome[0]?.amount || 0;
      if (Math.abs(admob.data.total_revenue - lastAmt) > 0.01) {
        await fetch(`${BASE_URL}/api/income`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: parseFloat(admob.data.total_revenue.toFixed(2)),
            source: 'admob',
            description: `AdMob — Lanzarus + r3dm/guia + Nexusia`,
          }),
        });
      }
    }
  } catch (e: any) {
    results.admob = `error: ${e.message}`;
  }

  // 3. Registro estado sync
  await sb('invergrow_sync_log', {
    method: 'POST',
    body: JSON.stringify({
      results,
      synced_at: new Date().toISOString(),
    }),
  }).catch(() => null);

  return res.status(200).json({
    success: true,
    synced_at: new Date().toISOString(),
    results,
  });
}

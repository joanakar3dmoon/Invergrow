import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ADMOB_REFRESH_TOKEN = process.env.ADMOB_REFRESH_TOKEN!;
const ADMOB_CLIENT_ID = process.env.ADMOB_CLIENT_ID || process.env.YT_CLIENT_ID!;
const ADMOB_CLIENT_SECRET = process.env.ADMOB_CLIENT_SECRET || process.env.YT_CLIENT_SECRET!;
const ADMOB_PUBLISHER_ID = process.env.ADMOB_PUBLISHER_ID!;

// Apps con sus AdMob IDs
const APPS = [
  { name: 'Lanzarus',  appId: 'ca-app-pub-4903263409458961~1005307516', color: '#00ff88' },
  { name: 'r3dm/guia', appId: 'ca-app-pub-4903263409458961~2391607033', color: '#00d4ff' },
  { name: 'Nexusia',   appId: 'ca-app-pub-4903263409458961~5751005760', color: '#a855f7' },
];

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

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: ADMOB_CLIENT_ID,
      client_secret: ADMOB_CLIENT_SECRET,
      refresh_token: ADMOB_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error('No se pudo obtener access token de AdMob');
  return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Sin token → datos cacheados
  if (!ADMOB_REFRESH_TOKEN || !ADMOB_PUBLISHER_ID) {
    const cached = await sb('invergrow_admob_stats?order=updated_at.desc&limit=1');
    return res.status(200).json({ source: 'cache', data: cached[0] || null, connected: false });
  }

  try {
    const token = await getAccessToken();
    const now = new Date();
    const startDate = { year: now.getFullYear(), month: now.getMonth() + 1, day: 1 };
    const endDate = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

    // Report mensual por app
    const reportRes = await fetch(
      `https://admob.googleapis.com/v1/accounts/${ADMOB_PUBLISHER_ID}/networkReport:generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reportSpec: {
            dateRange: { startDate, endDate },
            dimensions: ['APP'],
            metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'AD_REQUESTS'],
            dimensionFilters: [],
            localizationSettings: { currencyCode: 'EUR' },
          },
        }),
      }
    );

    const reportData = await reportRes.json() as any;

    // Procesar resultados por app
    const appStats = APPS.map(app => {
      const row = (reportData || []).find((r: any) =>
        r.row?.dimensionValues?.APP?.value === app.appId
      );
      return {
        name: app.name,
        appId: app.appId,
        color: app.color,
        revenue: row ? parseFloat(row.row?.metricValues?.ESTIMATED_EARNINGS?.microsValue || '0') / 1_000_000 : 0,
        impressions: row ? parseInt(row.row?.metricValues?.IMPRESSIONS?.integerValue || '0') : 0,
        clicks: row ? parseInt(row.row?.metricValues?.CLICKS?.integerValue || '0') : 0,
        ecpm: row ? parseFloat(row.row?.metricValues?.AD_REQUESTS?.integerValue || '0') : 0,
      };
    });

    const totalRevenue = appStats.reduce((sum, a) => sum + a.revenue, 0);

    // Guardar en Supabase
    await sb('invergrow_admob_stats', {
      method: 'POST',
      body: JSON.stringify({
        apps: appStats,
        total_revenue: totalRevenue,
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({
      connected: true,
      source: 'live',
      data: { apps: appStats, total_revenue: totalRevenue },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, connected: false });
  }
}

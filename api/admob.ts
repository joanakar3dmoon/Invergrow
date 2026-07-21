import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const CLIENT_ID    = process.env.YT_CLIENT_ID!;
const CLIENT_SECRET = process.env.YT_CLIENT_SECRET!;

// Publisher ID extraído del App ID: ca-app-pub-XXXXXXXXXXXXXXXX
const PUBLISHER_ID = 'pub-4903263409458961';

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

async function getRefreshToken(): Promise<string | null> {
  const rows = await sb('invergrow_state?id=eq.main&select=admob_refresh_token');
  if (rows[0]?.admob_refresh_token) return rows[0].admob_refresh_token;
  return process.env.ADMOB_REFRESH_TOKEN || null;
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      const cached = await sb('invergrow_admob_stats?order=updated_at.desc&limit=1');
      return res.status(200).json({ source: 'cache', data: cached[0] || null, connected: false });
    }

    const token = await getAccessToken(refreshToken);

    // 1. Verificar cuenta AdMob
    const accountsRes = await fetch('https://admob.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const accountsData = await accountsRes.json() as any;
    if (accountsData.error) {
      throw new Error(`AdMob accounts: ${accountsData.error.message}`);
    }

    // Usar la primera cuenta o el publisher ID conocido
    const accountName = accountsData.account?.[0]?.name || `accounts/${PUBLISHER_ID}`;

    // 2. Generar reporte mensual por app
    const now = new Date();
    const startDate = { year: now.getFullYear(), month: now.getMonth() + 1, day: 1 };
    const endDate   = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };

    const reportRes = await fetch(
      `https://admob.googleapis.com/v1/${accountName}/networkReport:generate`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportSpec: {
            dateRange: { startDate, endDate },
            dimensions: ['APP'],
            metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'MATCH_RATE'],
            localizationSettings: { currencyCode: 'EUR' },
          },
        }),
      }
    );

    const reportRaw = await reportRes.json() as any;

    // La API devuelve un array de líneas (header, rows..., footer)
    const rows: any[] = Array.isArray(reportRaw) ? reportRaw : [];

    const appStats = APPS.map(app => {
      const match = rows.find(r =>
        r.row?.dimensionValues?.APP?.value === app.appId ||
        r.row?.dimensionValues?.APP?.displayLabel?.includes(app.name)
      );
      const mv = match?.row?.metricValues || {};
      return {
        name:        app.name,
        appId:       app.appId,
        color:       app.color,
        revenue:     parseFloat(mv.ESTIMATED_EARNINGS?.microsValue || '0') / 1_000_000,
        impressions: parseInt(mv.IMPRESSIONS?.integerValue || '0'),
        clicks:      parseInt(mv.CLICKS?.integerValue || '0'),
        match_rate:  parseFloat(mv.MATCH_RATE?.doubleValue || '0'),
      };
    });

    const totalRevenue = appStats.reduce((s, a) => s + a.revenue, 0);

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
      data: { apps: appStats, total_revenue: totalRevenue, account: accountName },
    });

  } catch (err: any) {
    return res.status(500).json({ error: err.message, connected: false });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const YT_CLIENT_ID = process.env.YT_CLIENT_ID!;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET!;

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
  // Primero intentar desde Supabase (guardado por el callback OAuth)
  const rows = await sb('invergrow_state?id=eq.main&select=yt_refresh_token');
  if (rows[0]?.yt_refresh_token) return rows[0].yt_refresh_token;
  // Fallback a variable de entorno
  return process.env.YT_REFRESH_TOKEN || null;
}

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error(`No access token: ${JSON.stringify(data)}`);
  return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    const cached = await sb('invergrow_yt_stats?order=updated_at.desc&limit=1');
    return res.status(200).json({ source: 'cache', data: cached[0] || null, connected: false });
  }

  try {
    const token = await getAccessToken(refreshToken);

    // Stats del canal
    const channelRes = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const channelData = await channelRes.json() as any;
    const ch = channelData.items?.[0];
    if (!ch) throw new Error('Canal no encontrado');

    const stats = {
      channel_id: ch.id,
      channel_name: ch.snippet?.title,
      subscribers: parseInt(ch.statistics?.subscriberCount || '0'),
      total_views: parseInt(ch.statistics?.viewCount || '0'),
      total_videos: parseInt(ch.statistics?.videoCount || '0'),
    };

    // Ingresos reales via YouTube Analytics (últimos 30 días)
    let ytRevenue = 0;
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      const fmt = (d: Date) => d.toISOString().split('T')[0];

      const analyticsRes = await fetch(
        `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3D${ch.id}&startDate=${fmt(startDate)}&endDate=${fmt(today)}&metrics=estimatedRevenue&dimensions=month`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const analyticsData = await analyticsRes.json() as any;
      if (analyticsData.rows?.length > 0) {
        ytRevenue = analyticsData.rows.reduce((sum: number, row: any[]) => sum + (row[1] || 0), 0);
      }
    } catch (_) {
      // Analytics puede no estar habilitado, ignorar
    }

    // Últimos 10 vídeos
    const videosRes = await fetch(
      'https://www.googleapis.com/youtube/v3/search?part=snippet&forMine=true&maxResults=10&order=date&type=video',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const videosData = await videosRes.json() as any;
    const videoIds = videosData.items?.map((v: any) => v.id.videoId).join(',') || '';

    let recentVideos: any[] = [];
    if (videoIds) {
      const detailRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const detailData = await detailRes.json() as any;
      recentVideos = (detailData.items || []).map((v: any) => ({
        id: v.id,
        title: v.snippet?.title,
        views: parseInt(v.statistics?.viewCount || '0'),
        likes: parseInt(v.statistics?.likeCount || '0'),
        published_at: v.snippet?.publishedAt,
      }));
    }

    // Guardar stats en Supabase
    await sb('invergrow_yt_stats', {
      method: 'POST',
      body: JSON.stringify({
        ...stats,
        revenue_30d: ytRevenue,
        recent_videos: recentVideos,
        updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({
      connected: true,
      source: 'live',
      data: { ...stats, revenue_30d: ytRevenue, recent_videos: recentVideos },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, connected: false });
  }
}

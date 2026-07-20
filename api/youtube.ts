import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const YT_REFRESH_TOKEN = process.env.YT_REFRESH_TOKEN!;
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

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: YT_CLIENT_ID,
      client_secret: YT_CLIENT_SECRET,
      refresh_token: YT_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error('No se pudo obtener access token de YouTube');
  return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Si no hay refresh token, devuelve datos cacheados de Supabase
  if (!YT_REFRESH_TOKEN) {
    const cached = await sb('invergrow_yt_stats?order=updated_at.desc&limit=1');
    return res.status(200).json({ source: 'cache', data: cached[0] || null, connected: false });
  }

  try {
    const token = await getAccessToken();

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

    // Guardar en Supabase
    await sb('invergrow_yt_stats', {
      method: 'POST',
      body: JSON.stringify({
        ...stats,
        recent_videos: recentVideos,
        updated_at: new Date().toISOString(),
      }),
    });

    return res.status(200).json({
      connected: true,
      source: 'live',
      data: { ...stats, recent_videos: recentVideos },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, connected: false });
  }
}

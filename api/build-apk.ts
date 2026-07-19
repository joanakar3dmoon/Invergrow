import type { VercelRequest, VercelResponse } from '@vercel/node';
const EAS_TOKEN = process.env.EXPO_TOKEN || '';
const EXPO_SLUG = 'invergrow';
const EXPO_OWNER = 'r3dm';
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    if (!EAS_TOKEN) return res.status(200).json({ status: 'not_configured', message: 'Configura EXPO_TOKEN en Vercel para compilar APKs automaticamente' });
    try {
      const r = await fetch(`https://api.expo.dev/v2/projects/@${EXPO_OWNER}/${EXPO_SLUG}/builds?platform=android&limit=3`, { headers: { Authorization: `Bearer ${EAS_TOKEN}`, 'Content-Type': 'application/json' } });
      const d = await r.json() as any;
      const builds = d.data || [];
      return res.status(200).json({ builds: builds.map((b: any) => ({ id: b.id, status: b.status, platform: b.platform, createdAt: b.createdAt, artifacts: b.artifacts })) });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { adminCode } = req.body || {};
  if (adminCode !== (process.env.ADMIN_CODE || 'joan123')) return res.status(403).json({ error: 'Codigo incorrecto' });
  if (!EAS_TOKEN) return res.status(400).json({ error: 'EXPO_TOKEN no configurado', setup_url: 'https://expo.dev/accounts/r3dm/settings/access-tokens' });
  try {
    const r = await fetch('https://api.expo.dev/graphql', { method: 'POST', headers: { Authorization: `Bearer ${EAS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: `mutation { buildCreate(input: { projectFullName: "@${EXPO_OWNER}/${EXPO_SLUG}", platform: ANDROID, buildProfile: "preview" }) { id status createdAt } }` }) });
    const d = await r.json() as any;
    if (d.errors) return res.status(500).json({ error: d.errors[0]?.message || 'EAS Build error' });
    const build = d.data?.buildCreate;
    return res.status(200).json({ success: true, buildId: build?.id, status: build?.status, message: 'Compilacion APK iniciada en Expo EAS', trackUrl: `https://expo.dev/accounts/${EXPO_OWNER}/projects/${EXPO_SLUG}/builds/${build?.id}` });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

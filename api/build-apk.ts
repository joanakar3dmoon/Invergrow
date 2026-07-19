import type { VercelRequest, VercelResponse } from '@vercel/node';
const EAS_TOKEN = process.env.EXPO_TOKEN || '';
const APP_ID = '8d819996-4cb2-419d-86b4-55fba5c762b5';
const EXPO_OWNER = 'r3dm';
const EXPO_SLUG = 'invergrow';
async function gql(query: string, variables: any = {}) {
  const r = await fetch('https://api.expo.dev/graphql', { method: 'POST', headers: { Authorization: `Bearer ${EAS_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  return r.json() as Promise<any>;
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    if (!EAS_TOKEN) return res.status(200).json({ status: 'not_configured', message: 'EXPO_TOKEN no configurado en Vercel' });
    try {
      const d = await gql(`query { app { byId(appId: "${APP_ID}") { id slug builds(offset: 0, limit: 5) { edges { node { id status platform createdAt artifacts { buildUrl } } } } } } }`);
      const builds = d?.data?.app?.byId?.builds?.edges?.map((e: any) => e.node) || [];
      return res.status(200).json({ ok: true, project: `@${EXPO_OWNER}/${EXPO_SLUG}`, builds });
    } catch (err: any) { return res.status(500).json({ error: err.message }); }
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { adminCode } = req.body || {};
  if (adminCode !== (process.env.ADMIN_CODE || 'joan123')) return res.status(403).json({ error: 'Codigo incorrecto' });
  if (!EAS_TOKEN) return res.status(400).json({ error: 'EXPO_TOKEN no configurado' });
  try {
    const d = await gql(`mutation CreateBuild($appId: ID!, $platform: AppPlatform!, $profile: String!) { build { createBuild(appId: $appId, platform: $platform, buildProfile: $profile) { build { id status createdAt platform } } } }`, { appId: APP_ID, platform: 'ANDROID', profile: 'preview' });
    if (d.errors) return res.status(500).json({ error: d.errors[0]?.message || 'EAS Build error' });
    const build = d?.data?.build?.createBuild?.build;
    return res.status(200).json({ success: true, buildId: build?.id, status: build?.status, message: 'Compilacion APK iniciada en Expo EAS', trackUrl: `https://expo.dev/accounts/${EXPO_OWNER}/projects/${EXPO_SLUG}/builds/${build?.id}` });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const ADMOB_APP_ID = 'ca-app-pub-4903263409458961~5751005760';
async function supa(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...((opts.headers as Record<string,string>) || {}) } });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return {}; }
}
async function getAdMobEarnings(): Promise<number> {
  const refreshToken = process.env.ADMOB_REFRESH_TOKEN;
  const clientId = process.env.ADMOB_CLIENT_ID;
  const clientSecret = process.env.ADMOB_CLIENT_SECRET;
  if (refreshToken && clientId && clientSecret) {
    try {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret }) });
      const tokenData = await tokenRes.json() as any;
      if (tokenData.access_token) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0].replace(/-/g,'');
        const year = parseInt(dateStr.substring(0,4)), month = parseInt(dateStr.substring(4,6)), day = parseInt(dateStr.substring(6,8));
        const reportRes = await fetch(`https://admob.googleapis.com/v1/accounts/${ADMOB_APP_ID}/networkReport:generate`, { method: 'POST', headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ reportSpec: { dateRange: { startDate: { year, month, day }, endDate: { year, month, day } }, dimensions: ['DATE'], metrics: ['ESTIMATED_EARNINGS'] } }) });
        const reportData = await reportRes.json() as any;
        const rows = reportData?.filter((r: any) => r.row)?.map((r: any) => r.row) || [];
        if (rows.length > 0) {
          const micros = rows[0]?.metricValues?.ESTIMATED_EARNINGS?.microsValue || 0;
          return micros / 1000000;
        }
      }
    } catch (e) { console.error('AdMob API error:', e); }
  }
  return 0;
}
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const earnings = await getAdMobEarnings();
    if (earnings <= 0) {
      return res.status(200).json({ message: 'Sin ingresos AdMob ayer o API no configurada', earnings: 0 });
    }
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const alreadyArr = await supa(`invergrow_income?source=eq.AdMob&created_at=gte.${dateStr}T00:00:00`);
    if (Array.isArray(alreadyArr) && alreadyArr.length > 0) {
      return res.status(200).json({ message: 'Ingreso AdMob ya registrado hoy', earnings });
    }
    const ref = 'ADMOB-' + dateStr;
    await supa('invergrow_income', { method: 'POST', body: JSON.stringify({ source: 'AdMob', amount: earnings, description: `AdMob ingresos ${dateStr}` }) });
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'DEPOSIT', status: 'COMPLETED', amount: earnings, description: `AdMob ${dateStr}`, reference: ref, gateway: 'AdMob' }) });
    const stateArr = await supa('invergrow_state?select=*&id=eq.main');
    const state = (Array.isArray(stateArr) ? stateArr[0] : null) || { balance: 0, net_gains: 0 };
    const newBalance = parseFloat(state.balance) + earnings;
    const newNetGains = parseFloat(state.net_gains) + earnings;
    await supa('invergrow_state?id=eq.main', { method: 'PATCH', body: JSON.stringify({ balance: newBalance, net_gains: newNetGains, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ success: true, earnings, newBalance, date: dateStr });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

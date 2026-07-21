import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ADMIN_CODE   = process.env.ADMIN_CODE || 'joan123';
const YT_CLIENT_ID     = process.env.YT_CLIENT_ID || '';
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET || '';
const REDIRECT_URI     = 'https://invergrow.vercel.app/api/youtube-callback';
const ADMOB_REFRESH_TOKEN  = process.env.ADMOB_REFRESH_TOKEN || '';
const ADMOB_PUBLISHER_ID   = process.env.ADMOB_PUBLISHER_ID || '';

const ADMOB_APPS = [
  { name: 'Lanzarus',  appId: 'ca-app-pub-4903263409458961~1005307516', color: '#00ff88' },
  { name: 'r3dm/guia', appId: 'ca-app-pub-4903263409458961~2391607033', color: '#00d4ff' },
  { name: 'Nexusia',   appId: 'ca-app-pub-4903263409458961~5751005760', color: '#a855f7' },
];

// ─── Supabase helper ─────────────────────────────────────────────────────────
async function supa(path: string, opts: RequestInit = {}): Promise<any> {
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

// ─── State helpers ────────────────────────────────────────────────────────────
async function getState(): Promise<any> {
  const arr = await supa('invergrow_state?id=eq.main&select=*');
  if (Array.isArray(arr) && arr[0]) return arr[0];
  return { balance: 0, net_gains: 0, invested_capital: 0, total_withdrawals: 0 };
}
async function patchState(fields: Record<string, any>) {
  await supa('invergrow_state?id=eq.main', {
    method: 'PATCH',
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
}

// ─── OAuth helpers ────────────────────────────────────────────────────────────
async function getYtRefreshToken(): Promise<string | null> {
  const rows = await supa('invergrow_state?id=eq.main&select=yt_refresh_token');
  if (rows?.[0]?.yt_refresh_token) return rows[0].yt_refresh_token;
  return process.env.YT_REFRESH_TOKEN || null;
}
async function exchangeForAccessToken(refreshToken: string, clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error(`No access token: ${JSON.stringify(data)}`);
  return data.access_token;
}


// ─── Resend email helper ────────────────────────────────────────────────────
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

async function sendGmailNotification(subject: string, htmlBody: string): Promise<void> {
  try {
    if (!RESEND_API_KEY) return;
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'InverGrow <onboarding@resend.dev>',
        to: ['joanlazaro83@gmail.com'],
        subject,
        html: htmlBody,
      }),
    });
  } catch (e) {
    console.error('Resend notify error:', e);
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleData(req: VercelRequest, res: VercelResponse) {
  const st = await getState();
  const txArr = await supa('invergrow_transactions?select=*&order=created_at.desc&limit=20');
  const rawTx = Array.isArray(txArr) ? txArr : [];
  const transactions = rawTx.map((t: any) => ({
    id: t.id, type: t.type || 'DEPOSIT', status: t.status || 'COMPLETED',
    amount: parseFloat(t.amount) || 0, date: t.created_at,
    reference: t.reference || '', description: t.description || '', gateway: t.gateway || 'INTERNAL',
  }));
  const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
  const hasPayPal = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_ID !== 'PENDIENTE');
  const aiWorkers = [
    { id: 'ai-1', name: 'ContentBot Alpha',   role: 'Creador de Contenido',    status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.02,  unlocked: true,  costToUnlock: 0,   costToUpgrade: 50, totalGenerated: 0, icon: '🤖' },
    { id: 'ai-2', name: 'TradeBot Beta',       role: 'Analisis de Mercado',     status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.03,  unlocked: true,  costToUnlock: 0,   costToUpgrade: 75, totalGenerated: 0, icon: '📈' },
    { id: 'ai-3', name: 'AffiliateBot Gamma',  role: 'Marketing de Afiliados',  status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.025, unlocked: true,  costToUnlock: 0,   costToUpgrade: 60, totalGenerated: 0, icon: '🛒' },
    { id: 'ai-4', name: 'DataBot Delta',       role: 'Procesamiento de Datos',  status: 'IDLE',   level: 1, model: 'gemini-flash', baseIncomeRate: 0.015, unlocked: false, costToUnlock: 100, costToUpgrade: 50, totalGenerated: 0, icon: '💾' },
  ];
  return res.status(200).json({
    balance: parseFloat(st.balance) || 0,
    netGains: parseFloat(st.net_gains) || 0,
    investedCapital: parseFloat(st.invested_capital) || 0,
    totalWithdrawals: parseFloat(st.total_withdrawals) || 0,
    reinvestmentFund: 0,
    collaborators: [], transactions, webhookLogs: [], aiWorkers, aiLogs: [],
    apiConfig: { geminiConnected: hasGemini, paypalConnected: hasPayPal, paypalEnv: process.env.PAYPAL_ENV || 'live', supabaseConnected: !!SUPABASE_KEY, distributionWebhook: '', targetMarket: 'ES', payoutModel: 'SPLIT_70_30' },
    lastUpdated: new Date().toISOString(), version: '4.2',
  });
}

// ─── PayPal Payouts (Live) ───────────────────────────────────────────────────
const PAYPAL_CLIENT_ID  = process.env.PAYPAL_CLIENT_ID  || '';
const PAYPAL_SECRET     = process.env.PAYPAL_SECRET     || '';
const PAYPAL_ENV        = process.env.PAYPAL_ENV        || 'live';
const PAYPAL_BASE       = PAYPAL_ENV === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalToken(): Promise<string> {
  const creds = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error(`PayPal auth error: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function sendPayPalPayout(amountEur: number, recipientEmail: string, note: string): Promise<{ batchId: string; status: string }> {
  const token = await getPayPalToken();
  const batchId = `INV-${Date.now()}`;
  const body = {
    sender_batch_header: {
      sender_batch_id: batchId,
      email_subject: 'Retiro InverGrow',
      email_message: note || 'Tu retiro de InverGrow ha sido procesado.',
    },
    items: [{
      recipient_type: 'EMAIL',
      amount: { value: amountEur.toFixed(2), currency: 'EUR' },
      note: note || 'Retiro InverGrow',
      sender_item_id: `item-${Date.now()}`,
      receiver: recipientEmail,
    }],
  };
  const res = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`PayPal payout error: ${JSON.stringify(data)}`);
  return {
    batchId: data.batch_header?.payout_batch_id || batchId,
    status: data.batch_header?.batch_status || 'PENDING',
  };
}

async function handleWithdraw(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const state = await getState();
    const txArr = await supa('invergrow_transactions?select=*&order=created_at.desc&limit=20');
    return res.status(200).json({
      balance: parseFloat(state.balance) || 0,
      netGains: parseFloat(state.net_gains) || 0,
      totalWithdrawals: parseFloat(state.total_withdrawals) || 0,
      transactions: Array.isArray(txArr) ? txArr : [],
      paypalConnected: !!(PAYPAL_CLIENT_ID && PAYPAL_SECRET),
      paypalEnv: PAYPAL_ENV,
    });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { amount, adminCode, recipientEmail, note, method, iban, ibanOwner } = req.body || {};

    if (adminCode && adminCode !== ADMIN_CODE) {
      return res.status(403).json({ error: 'Código admin incorrecto' });
    }

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Importe inválido' });

    const state = await getState();
    const available = parseFloat((state.balance || 0).toFixed(2));
    if (amt > available) {
      return res.status(400).json({ error: `Saldo insuficiente. Disponible: €${available.toFixed(2)}`, available });
    }

    // Descontar saldo ANTES del envío
    const newBalance     = parseFloat((available - amt).toFixed(2));
    const newWithdrawals = parseFloat(((state.total_withdrawals || 0) + amt).toFixed(2));
    await patchState({ balance: newBalance, total_withdrawals: newWithdrawals });

    // Enviar via PayPal Payouts
    const email = recipientEmail || 'joanlazaro83@gmail.com';
    const ref   = `WD-${Date.now()}`;
    let paypalBatchId = '';
    let paypalStatus  = 'COMPLETED';
    let paypalMsg     = `Retiro de €${amt.toFixed(2)} procesado correctamente.`;

    if (PAYPAL_CLIENT_ID && PAYPAL_SECRET) {
      try {
        const payout = await sendPayPalPayout(amt, email, note || `Retiro InverGrow ${ref}`);
        paypalBatchId = payout.batchId;
        paypalStatus  = payout.status;
        paypalMsg     = `Retiro de €${amt.toFixed(2)} enviado a ${email} via PayPal. Batch: ${paypalBatchId}`;
      } catch (ppErr: any) {
        // Si PayPal falla, restaurar saldo y registrar como PENDIENTE
        await patchState({ balance: available, total_withdrawals: state.total_withdrawals });
        // Registrar como pendiente para revisión manual
        await supa('invergrow_transactions', {
          method: 'POST',
          body: JSON.stringify({
            type: 'WITHDRAWAL',
            amount: amt,
            status: 'PENDING',
            reference: ref,
            description: `Retiro pendiente → ${email} (revisar PayPal)`,
            gateway: 'PAYPAL',
          }),
        });
        // Enviar email de aviso para procesar manualmente
        const isIban = method === 'iban' && iban;
        const paypalLink = `https://www.paypal.com/myaccount/transfer/send?recipient=${encodeURIComponent(email)}&amount=${amt.toFixed(2)}&currencyCode=EUR`;
        const emailSubject = isIban
          ? `💰 InverGrow — Retiro por IBAN: €${amt.toFixed(2)}`
          : `💰 InverGrow — Retiro pendiente: €${amt.toFixed(2)}`;
        const emailHtml = isIban ? `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px;border:1px solid #00ff8844">
            <h2 style="color:#00ff88;margin:0 0 8px">💰 Retiro por IBAN solicitado</h2>
            <p style="color:#aaa;margin:0 0 24px">Referencia: <code style="color:#00ff88">${ref}</code></p>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="color:#aaa;padding:8px 0;border-bottom:1px solid #222">Importe</td><td style="color:#fff;font-weight:700;text-align:right">€${amt.toFixed(2)}</td></tr>
              <tr><td style="color:#aaa;padding:8px 0;border-bottom:1px solid #222">IBAN</td><td style="color:#00ff88;font-family:monospace;text-align:right">${iban}</td></tr>
              <tr><td style="color:#aaa;padding:8px 0">Titular</td><td style="color:#fff;text-align:right">${ibanOwner || '—'}</td></tr>
            </table>
            <p style="color:#666;font-size:12px;margin-top:24px">Haz la transferencia desde tu banco a este IBAN por el importe indicado.</p>
          </div>` : `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:16px;border:1px solid #00ff8844">
            <h2 style="color:#00ff88;margin:0 0 8px">💰 Retiro PayPal pendiente</h2>
            <p style="color:#aaa;margin:0 0 24px">Ref: <code style="color:#00ff88">${ref}</code></p>
            <p style="color:#fff;font-size:24px;font-weight:700">€${amt.toFixed(2)}</p>
            <p style="color:#aaa">Destinatario: <strong style="color:#fff">${email}</strong></p>
            <a href="${paypalLink}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#00ff88;color:#000;font-weight:700;border-radius:8px;text-decoration:none">Enviar por PayPal →</a>
          </div>`;
        await sendGmailNotification(emailSubject, emailHtml);      }
    }

    // Registrar transacción
    await supa('invergrow_transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'WITHDRAWAL',
        amount: amt,
        status: paypalStatus,
        reference: ref,
        description: `Retiro PayPal → ${email}`,
        gateway: 'PAYPAL',
      }),
    });

    return res.status(200).json({
      success: true,
      reference: ref,
      batchId: paypalBatchId,
      amount: amt,
      newBalance,
      totalWithdrawals: newWithdrawals,
      destination: email,
      message: paypalMsg,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleIncome(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, source, description } = req.body;
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) return res.status(400).json({ error: 'Importe invalido' });
    if (!source) return res.status(400).json({ error: 'Fuente requerida' });
    const amt = parseFloat(amount);
    await supa('invergrow_income', { method: 'POST', body: JSON.stringify({ source, amount: amt, description: description || source }) });
    const ref = 'INC-' + Date.now().toString(36).toUpperCase();
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'DEPOSIT', status: 'COMPLETED', amount: amt, description: description || ('Ingreso: ' + source), reference: ref, gateway: source }) });
    const state = await getState();
    const newBalance = parseFloat(state.balance) + amt;
    const newNetGains = parseFloat(state.net_gains) + amt;
    await patchState({ balance: newBalance, net_gains: newNetGains });
    return res.status(200).json({ success: true, balance: newBalance, reference: ref });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

async function handleReinvest(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const s = await getState();
    return res.status(200).json({ balance: parseFloat(s.balance), investedCapital: parseFloat(s.invested_capital), reinvestPercent: 70, estimatedMonthlyReturn: parseFloat(s.invested_capital) * 0.124 / 12 });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { adminCode, percentage } = req.body || {};
    if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'Codigo incorrecto' });
    const state = await getState();
    const balance = parseFloat(state.balance);
    if (balance <= 0) return res.status(400).json({ error: 'No hay saldo para reinvertir' });
    const pct = percentage || 70;
    const reinvAmt = parseFloat(((balance * pct) / 100).toFixed(2));
    if (reinvAmt < 0.01) return res.status(400).json({ error: 'Importe minimo EUR0.01' });
    const ref = 'REINV-' + Date.now().toString(36).toUpperCase();
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'AI_REINVEST', status: 'COMPLETED', amount: reinvAmt, description: `Reinversion ${pct}% del saldo`, reference: ref, gateway: 'INTERNAL' }) });
    const newBalance = balance - reinvAmt;
    const newInvested = parseFloat(state.invested_capital) + reinvAmt;
    await patchState({ balance: newBalance, invested_capital: newInvested });
    return res.status(200).json({ success: true, reinvestedAmount: reinvAmt, newBalance, newInvestedCapital: newInvested, reference: ref, message: `EUR${reinvAmt.toFixed(2)} reinvertidos (${pct}%). Capital: EUR${newInvested.toFixed(2)}` });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

async function handleYoutube(req: VercelRequest, res: VercelResponse) {
  const refreshToken = await getYtRefreshToken();
  if (!refreshToken) {
    const cached = await supa('invergrow_yt_stats?order=updated_at.desc&limit=1');
    return res.status(200).json({ source: 'cache', data: cached?.[0] || null, connected: false });
  }
  try {
    const token = await exchangeForAccessToken(refreshToken, YT_CLIENT_ID, YT_CLIENT_SECRET);
    const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true', { headers: { Authorization: `Bearer ${token}` } });
    const channelData = await channelRes.json() as any;
    const ch = channelData.items?.[0];
    if (!ch) throw new Error('Canal no encontrado');
    const stats = { channel_id: ch.id, channel_name: ch.snippet?.title, subscribers: parseInt(ch.statistics?.subscriberCount || '0'), total_views: parseInt(ch.statistics?.viewCount || '0'), total_videos: parseInt(ch.statistics?.videoCount || '0') };
    let ytRevenue = 0;
    try {
      const today = new Date(), startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 30);
      const fmt = (d: Date) => d.toISOString().split('T')[0];
      const analyticsRes = await fetch(`https://youtubeanalytics.googleapis.com/v2/reports?ids=channel%3D%3D${ch.id}&startDate=${fmt(startDate)}&endDate=${fmt(today)}&metrics=estimatedRevenue&dimensions=month`, { headers: { Authorization: `Bearer ${token}` } });
      const analyticsData = await analyticsRes.json() as any;
      if (analyticsData.rows?.length > 0) ytRevenue = analyticsData.rows.reduce((sum: number, row: any[]) => sum + (row[1] || 0), 0);
    } catch (_) {}
    await supa('invergrow_yt_stats', { method: 'POST', body: JSON.stringify({ ...stats, revenue_30d: ytRevenue, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ connected: true, source: 'live', data: { ...stats, revenue_30d: ytRevenue } });
  } catch (err: any) { return res.status(500).json({ error: err.message, connected: false }); }
}

async function handleYoutubeCallback(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`<h2>Error OAuth: ${error}</h2>`);
  if (!code) return res.status(400).send('<h2>No se recibió código de autorización.</h2>');
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: code as string, client_id: YT_CLIENT_ID, client_secret: YT_CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }),
    });
    const tokens = await tokenRes.json() as any;
    if (!tokens.refresh_token) return res.status(400).send(`<h2>No se obtuvo refresh_token. Respuesta: ${JSON.stringify(tokens)}</h2>`);
    await supa('invergrow_state?id=eq.main', { method: 'PATCH', body: JSON.stringify({ yt_refresh_token: tokens.refresh_token }) });
    return res.status(200).send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#040608;color:#fff"><h1 style="color:#00ff88">✅ YouTube conectado</h1><p>Refresh token guardado correctamente.</p><a href="https://invergrow.vercel.app" style="color:#00ff88">← Volver a InverGrow</a></body></html>`);
  } catch (err: any) { return res.status(500).send(`<h2>Error: ${err.message}</h2>`); }
}

async function handleAdmob(req: VercelRequest, res: VercelResponse) {
  if (!ADMOB_REFRESH_TOKEN || !ADMOB_PUBLISHER_ID) {
    const cached = await supa('invergrow_admob_stats?order=updated_at.desc&limit=1');
    return res.status(200).json({ source: 'cache', data: cached?.[0] || null, connected: false });
  }
  try {
    const token = await exchangeForAccessToken(ADMOB_REFRESH_TOKEN, YT_CLIENT_ID, YT_CLIENT_SECRET);
    const now = new Date();
    const startDate = { year: now.getFullYear(), month: now.getMonth() + 1, day: 1 };
    const endDate = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
    const reportRes = await fetch(`https://admob.googleapis.com/v1/accounts/${ADMOB_PUBLISHER_ID}/networkReport:generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportSpec: { dateRange: { startDate, endDate }, dimensions: ['APP'], metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'AD_REQUESTS'], dimensionFilters: [], localizationSettings: { currencyCode: 'EUR' } } }),
    });
    const reportData = await reportRes.json() as any;
    const appStats = ADMOB_APPS.map(app => {
      const row = (reportData || []).find((r: any) => r.row?.dimensionValues?.APP?.value === app.appId);
      return { name: app.name, appId: app.appId, color: app.color, revenue: row ? parseFloat(row.row?.metricValues?.ESTIMATED_EARNINGS?.microsValue || '0') / 1_000_000 : 0, impressions: row ? parseInt(row.row?.metricValues?.IMPRESSIONS?.integerValue || '0') : 0, clicks: row ? parseInt(row.row?.metricValues?.CLICKS?.integerValue || '0') : 0 };
    });
    const totalRevenue = appStats.reduce((sum, a) => sum + a.revenue, 0);
    await supa('invergrow_admob_stats', { method: 'POST', body: JSON.stringify({ apps: appStats, total_revenue: totalRevenue, month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, updated_at: new Date().toISOString() }) });
    return res.status(200).json({ connected: true, source: 'live', data: { apps: appStats, total_revenue: totalRevenue } });
  } catch (err: any) { return res.status(500).json({ error: err.message, connected: false }); }
}

async function handleSync(req: VercelRequest, res: VercelResponse) {
  const BASE_URL = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://invergrow.vercel.app';
  const results: Record<string, any> = {};
  try {
    const yt = await (await fetch(`${BASE_URL}/api/youtube`)).json() as any;
    results.youtube = yt.connected ? 'ok' : 'no_token';
    if (yt.connected && yt.data) {
      const estimatedRevenue = (yt.data.total_views / 1000) * 1.0;
      const lastIncome = await supa('invergrow_income?source=eq.youtube&order=created_at.desc&limit=1');
      const lastAmt = lastIncome?.[0]?.amount || 0;
      if (Math.abs(estimatedRevenue - lastAmt) > 0.01) {
        await fetch(`${BASE_URL}/api/income`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(estimatedRevenue.toFixed(2)), source: 'youtube', description: `YouTube @Equilibrio-c2k` }) });
      }
    }
  } catch (e: any) { results.youtube = `error: ${e.message}`; }
  try {
    const admob = await (await fetch(`${BASE_URL}/api/admob`)).json() as any;
    results.admob = admob.connected ? 'ok' : 'no_token';
    if (admob.connected && admob.data?.total_revenue > 0) {
      const lastIncome = await supa('invergrow_income?source=eq.admob&order=created_at.desc&limit=1');
      const lastAmt = lastIncome?.[0]?.amount || 0;
      if (Math.abs(admob.data.total_revenue - lastAmt) > 0.01) {
        await fetch(`${BASE_URL}/api/income`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseFloat(admob.data.total_revenue.toFixed(2)), source: 'admob', description: `AdMob — Lanzarus + r3dm/guia + Nexusia` }) });
      }
    }
  } catch (e: any) { results.admob = `error: ${e.message}`; }
  return res.status(200).json({ success: true, synced_at: new Date().toISOString(), results });
}

async function handleWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return res.status(200).json({ logs: [], endpoint: '/api/webhook', status: 'active' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const body = req.body || {};
    const source = (req.headers['x-webhook-source'] as string) || 'Manual';
    const event = body.event || body.type || 'custom';
    let amount = 0;
    let description = '';
    if (event.includes('stripe') || event === 'payment_intent.succeeded' || event === 'charge.succeeded') { amount = (body.data?.amount || body.amount || 0) / 100; description = `Stripe: €${amount.toFixed(2)}`; }
    else if (event.includes('PAYMENT') || event.includes('CHECKOUT')) { amount = parseFloat(body.resource?.amount?.value || body.amount || 0); description = `PayPal: €${amount.toFixed(2)}`; }
    else { amount = parseFloat(body.amount || body.data?.amount || 0); description = `Webhook: ${event}${amount > 0 ? ` — €${amount.toFixed(2)}` : ''}`; }
    if (amount > 0) {
      const state = await getState();
      const newBalance = parseFloat(state.balance) + amount;
      const newNetGains = parseFloat(state.net_gains) + amount;
      await patchState({ balance: newBalance, net_gains: newNetGains });
      await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'WEBHOOK_INCOME', status: 'COMPLETED', amount, description, reference: `WH-${Date.now().toString(36).toUpperCase()}`, gateway: source }) });
    }
    return res.status(200).json({ received: true, event, amount, description, timestamp: new Date().toISOString() });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

// ─── Main router ──────────────────────────────────────────────────────────────

// ─── Binance Auto-Invest Bot ─────────────────────────────────────────────────
const BINANCE_API_KEY    = process.env.BINANCE_API_KEY // configured || '';
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || '';
const BINANCE_REINVEST_PCT = parseFloat(process.env.BINANCE_REINVEST_PCT || '30'); // % a reinvertir
const BINANCE_SYMBOL    = process.env.BINANCE_SYMBOL || 'BTCEUR'; // par por defecto

async function binanceRequest(method: string, path: string, params: Record<string,string> = {}) {
  const crypto = await import('crypto');
  const timestamp = Date.now().toString();
  const queryParams = new URLSearchParams({ ...params, timestamp, recvWindow: '5000' });
  const signature = crypto.createHmac('sha256', BINANCE_API_SECRET)
    .update(queryParams.toString()).digest('hex');
  queryParams.append('signature', signature);

  const url = `https://api.binance.com${path}?${queryParams.toString()}`;
  const res = await fetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': BINANCE_API_KEY }
  });
  return res.json();
}

async function handleBinanceInvest(req: VercelRequest, res: VercelResponse) {
  try {
    if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
      return res.status(400).json({ error: 'Binance API no configurada. Añade BINANCE_API_KEY y BINANCE_API_SECRET en Vercel.' });
    }

    // Obtener balance actual de InverGrow
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/apps?select=revenue`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const apps = await sbRes.json() as any[];
    const totalBalance = apps.reduce((sum: number, a: any) => sum + (parseFloat(a.revenue) || 0), 0);

    const amountToInvest = parseFloat((totalBalance * BINANCE_REINVEST_PCT / 100).toFixed(2));

    if (amountToInvest < 10) {
      return res.json({ success: false, message: `Balance insuficiente para invertir. Mínimo €10, disponible: €${amountToInvest}` });
    }

    // Obtener precio actual del par
    const tickerRes = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${BINANCE_SYMBOL}`);
    const ticker = await tickerRes.json() as any;
    const price = parseFloat(ticker.price);
    const qty = parseFloat((amountToInvest / price).toFixed(6));

    // Crear orden de compra a mercado
    const order = await binanceRequest('POST', '/api/v3/order', {
      symbol: BINANCE_SYMBOL,
      side: 'BUY',
      type: 'MARKET',
      quoteOrderQty: amountToInvest.toString()
    });

    if (order.orderId) {
      // Registrar en Supabase como retiro de reinversión
      await fetch(`${SUPABASE_URL}/rest/v1/withdrawals`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({
          reference: `BNB-${order.orderId}`,
          amount: amountToInvest,
          status: 'COMPLETED',
          gateway: 'BINANCE',
          description: `Reinversión automática: ${qty} ${BINANCE_SYMBOL} @ €${price.toFixed(2)}`,
          created_at: new Date().toISOString()
        })
      });

      return res.json({
        success: true,
        orderId: order.orderId,
        symbol: BINANCE_SYMBOL,
        amount: amountToInvest,
        qty,
        price,
        message: `✅ Invertidos €${amountToInvest} en ${BINANCE_SYMBOL} (${qty} unidades @ €${price.toFixed(2)})`
      });
    } else {
      return res.json({ success: false, error: order.msg || 'Error en Binance', details: order });
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

async function handleBinanceStatus(req: VercelRequest, res: VercelResponse) {
  try {
    if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
      return res.json({ connected: false, message: 'API no configurada' });
    }
    const account = await binanceRequest('GET', '/api/v3/account');
    const balances = (account.balances || []).filter((b: any) => parseFloat(b.free) > 0);
    return res.json({ connected: true, balances, reinvestPct: BINANCE_REINVEST_PCT, symbol: BINANCE_SYMBOL });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Source');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Extraer ruta de la URL
  const url = req.url || '';
  const path = url.replace(/^\/api\/?/, '').split('?')[0];

  if (path === 'data'             || path === '') return handleData(req, res);
  if (path === 'withdraw')                        return handleWithdraw(req, res);
  if (path === 'income')                          return handleIncome(req, res);
  if (path === 'reinvest')                        return handleReinvest(req, res);
  if (path === 'youtube')                         return handleYoutube(req, res);
  if (path === 'youtube-callback')                return handleYoutubeCallback(req, res);
  if (path === 'admob')                           return handleAdmob(req, res);
  if (path === 'sync')                            return handleSync(req, res);
  if (path === 'webhook')                         return handleWebhook(req, res);
  if (path === 'binance/invest')                  return handleBinanceInvest(req, res);
  if (path === 'binance/status')                  return handleBinanceStatus(req, res);

  return res.status(404).json({ error: `Ruta no encontrada: ${path}` });
}

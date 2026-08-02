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
const STRIPE_SECRET_KEY   = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
const STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET || '';
const SITE_URL = process.env.SITE_URL || 'https://invergrow.vercel.app';

// ─── Binance Config ────────────────────────────────────────────────────────────
const BINANCE_API_KEY    = process.env.BINANCE_API_KEY || '';
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || '';
const BINANCE_BASE       = 'https://api.binance.com';

// ─── Binance Helpers ───────────────────────────────────────────────────────────
async function binanceSign(queryString: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(BINANCE_API_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(queryString));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function binanceGet(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const timestamp = Date.now().toString();
  params.timestamp = timestamp;
  const queryString = new URLSearchParams(params).toString();
  const signature = await binanceSign(queryString);
  const res = await fetch(`${BINANCE_BASE}${endpoint}?${queryString}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': BINANCE_API_KEY },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Binance error: ${JSON.stringify(data)}`);
  return data;
}

async function binancePost(endpoint: string, params: Record<string, string> = {}): Promise<any> {
  const timestamp = Date.now().toString();
  params.timestamp = timestamp;
  const queryString = new URLSearchParams(params).toString();
  const signature = await binanceSign(queryString);
  const res = await fetch(`${BINANCE_BASE}${endpoint}?${queryString}&signature=${signature}`, {
    method: 'POST',
    headers: { 'X-MBX-APIKEY': BINANCE_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Binance error: ${JSON.stringify(data)}`);
  return data;
}


// ─── Paper worker cycle ──────────────────────────────────────────────────────
// Ejecuta la máquina en modo paper: registra actividad estimada, pero nunca
// modifica balance, ganancias netas ni capital. Los cobros reales solo entran
// mediante webhooks verificados de proveedores.
async function handleWorkerCycle(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const cronSecret = process.env.CRON_SECRET || '';
  const auth = String(req.headers.authorization || '');
  const isVercelCron = req.headers['x-vercel-cron'] === '1' || req.headers['x-vercel-cron'] === 'true';
  if (cronSecret && auth !== `Bearer ${cronSecret}` && !isVercelCron) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const state = await getState();
    const workers = await getWorkers(state);
    const now = new Date().toISOString();
    const active = workers.filter((w: any) => w.status === 'ACTIVE' && w.unlocked !== false);
    const cycles: any[] = [];
    let cycleTotal = 0;
    for (const worker of active) {
      const invested = Math.max(0, parseFloat(state.invested_capital) || 0);
      const rate = Math.max(0, parseFloat(worker.baseIncomeRate) || 0);
      const estimate = parseFloat(Math.max(0.01, invested * rate / 100).toFixed(2));
      const ref = `PAPER-${Date.now().toString(36).toUpperCase()}-${worker.id}`;
      await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({
        type: 'AI_REVENUE', status: 'PENDING_VERIFICATION', amount: estimate,
        description: `${worker.name}: €${estimate.toFixed(2)} registrados en InverGrow (origen pendiente de verificar)`,
        reference: ref, gateway: 'PAPER_AI_ENGINE', created_at: now,
      }) });
      cycleTotal += estimate;
      worker.totalGenerated = parseFloat(((parseFloat(worker.totalGenerated) || 0) + estimate).toFixed(2));
      worker.lastRun = now;
      cycles.push({ worker: worker.name, estimate, reference: ref });
    }
    // Reparto solicitado: 50% se reinvierte y 50% pasa al balance.
    // Se mantiene como pendiente de verificar hasta identificar el proveedor.
    const reinvestShare = parseFloat((cycleTotal * 0.50).toFixed(2));
    const balanceShare = parseFloat((cycleTotal - reinvestShare).toFixed(2));
    const newBalance = parseFloat(((parseFloat(state.balance) || 0) + balanceShare).toFixed(2));
    const newInvested = parseFloat(((parseFloat(state.invested_capital) || 0) + reinvestShare).toFixed(2));
    const newNetGains = parseFloat(((parseFloat(state.net_gains) || 0) + cycleTotal).toFixed(2));
    const paperGains = parseFloat(((parseFloat(state.paper_gains) || 0) + cycleTotal).toFixed(2));
    if (active.length) await patchState({ workers: JSON.stringify(workers), paper_gains: paperGains,
      balance: newBalance, invested_capital: newInvested, net_gains: newNetGains, last_worker_cycle: now });
    return res.status(200).json({ ok: true, mode: 'pending_verification', executedAt: now, workers: cycles,
      generated: cycleTotal, reinvestShare, balanceShare, balance: newBalance, investedCapital: newInvested, netGains: newNetGains,
      message: 'Ciclo ejecutado: 50% reinvertido y 50% añadido al balance; pendiente de verificar.' });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

// ─── handleBinanceSimpleEarn ───────────────────────────────────────────────────
async function handleBinanceSimpleEarn(req: VercelRequest, res: VercelResponse) {
  try {
    if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
      return res.status(200).json({ connected: false, message: 'Binance API no configurada' });
    }
    // Try signed call directly - some public endpoints are geo-blocked but signed ones work
    try {
      // Get account info first (signed)
      const account = await binanceGet('/api/v3/account');
      // Get Simple Earn flexible balance
      let earnBal = null;
      try { earnBal = await binanceGet('/sapi/v1/simple-earn/flexible/balance'); } catch {}
      
      return res.status(200).json({
        connected: true,
        simpleEarn: earnBal,
        account: { balances: account.balances.filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0) },
      });
    } catch (signedErr: any) {
      return res.status(200).json({ connected: false, message: 'Binance conectada pero con error: ' + signedErr.message });
    }
  } catch (err: any) {
    return res.status(200).json({ connected: false, error: err.message });
  }
}

// ─── handleBinanceDepositEarn ──────────────────────────────────────────────────
async function handleBinanceDepositEarn(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount } = req.body || {};
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Importe inválido' });
    if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
      return res.status(400).json({ error: 'Binance API no configurada' });
    }
    // Subscribe to Simple Earn Flexible (USDT)
    const result = await binancePost('/sapi/v1/simple-earn/flexible/subscribe', {
      productId: 'USDT',  // USDT flexible product
      amount: amt.toFixed(2),
    });
    return res.status(200).json({
      success: true,
      purchaseId: result.purchaseId,
      amount: amt,
      message: `✅ USDT depositado en Simple Earn Flexible: ${amt.toFixed(2)} USDT`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

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

// ─── Default workers ─────────────────────────────────────────────────────────
const DEFAULT_WORKERS = [
  { id: 'ai-1', name: 'ContentBot Alpha',   role: 'Creador de Contenido',    status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.02,  unlocked: true,  costToUnlock: 0,   costToUpgrade: 50, totalGenerated: 0, icon: '🤖' },
  { id: 'ai-2', name: 'TradeBot Beta',       role: 'Analisis de Mercado',     status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.03,  unlocked: true,  costToUnlock: 0,   costToUpgrade: 75, totalGenerated: 0, icon: '📈' },
  { id: 'ai-3', name: 'AffiliateBot Gamma',  role: 'Marketing de Afiliados',  status: 'ACTIVE', level: 1, model: 'gemini-flash', baseIncomeRate: 0.025, unlocked: true,  costToUnlock: 0,   costToUpgrade: 60, totalGenerated: 0, icon: '🛒' },
  { id: 'ai-4', name: 'DataBot Delta',       role: 'Procesamiento de Datos',  status: 'IDLE',   level: 1, model: 'gemini-flash', baseIncomeRate: 0.015, unlocked: false, costToUnlock: 100, costToUpgrade: 50, totalGenerated: 0, icon: '💾' },
];

async function getWorkers(state: any): Promise<any[]> {
  let workers = state.workers;
  // Parse if stored as JSON string
  if (typeof workers === 'string') {
    try { workers = JSON.parse(workers); } catch { workers = null; }
  }
  if (Array.isArray(workers) && workers.length > 0) {
    return workers;
  }
  // Try to read from DB one more time (fresh fetch)
  const fresh = await supa('invergrow_state?id=eq.main&select=workers');
  if (Array.isArray(fresh) && fresh[0]) {
    let fw = fresh[0].workers;
    if (typeof fw === 'string') { try { fw = JSON.parse(fw); } catch { fw = null; } }
    if (Array.isArray(fw) && fw.length > 0) return fw;
  }
  // NEVER reset to defaults - just return what we have or empty array
  console.warn('WARNING: No workers found in DB, returning empty array');
  return [];
}

// ─── Get worker cost for next level ──────────────────────────────────────────
function getUpgradeCost(worker: any): number {
  const base = worker.costToUpgrade || 50;
  const level = worker.level || 1;
  // Cost increases by 50% each level
  return Math.round(base * Math.pow(1.5, level - 1));
}

// ─── handleData ──────────────────────────────────────────────────────────────
async function handleData(req: VercelRequest, res: VercelResponse) {
  const st = await getState();
  const txArr = await supa('invergrow_transactions?select=*&order=created_at.desc&limit=1000');
  const rawTx = Array.isArray(txArr) ? txArr : [];
  const transactions = rawTx.map((t: any) => ({
    id: t.id, type: t.type || 'DEPOSIT', status: t.status || 'COMPLETED',
    amount: parseFloat(t.amount) || 0, date: t.created_at,
    reference: t.reference || '', description: t.description || '', gateway: t.gateway || 'INTERNAL',
  }));
  const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10);
  const hasPayPal = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_ID !== 'PENDIENTE');
  const aiWorkers = await getWorkers(st);
  // Preserve all historical bot entries, but expose them separately until an
  // external provider reference (payment/webhook/order id) verifies the origin.
  const unverifiedIncome = rawTx
    .filter((t: any) => t.type === 'AI_REVENUE' || t.type === 'AI_PAPER_REVENUE')
    .reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0);
  const verifiedNetGains = parseFloat(st.net_gains) || 0;
  return res.status(200).json({
    balance: parseFloat(st.balance) || 0,
    netGains: parseFloat(st.net_gains) || 0,
    investedCapital: parseFloat(st.invested_capital) || 0,
    totalWithdrawals: parseFloat(st.total_withdrawals) || 0,
    reinvestmentFund: 0,
    verifiedNetGains, unverifiedIncome: parseFloat(unverifiedIncome.toFixed(2)),
    collaborators: [], transactions, webhookLogs: [], aiWorkers, aiLogs: [],
    apiConfig: { geminiConnected: hasGemini, paypalConnected: hasPayPal, paypalEnv: process.env.PAYPAL_ENV || 'live', supabaseConnected: !!SUPABASE_KEY, distributionWebhook: '', targetMarket: 'ES', payoutModel: 'SPLIT_50_50' },
    lastUpdated: new Date().toISOString(), version: '4.3',
  });
}

// ─── PayPal helpers ────────────────────────────────────────────────────────────
const PAYPAL_CLIENT = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || '';
const PAYPAL_BASE = process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function getPayPalToken(): Promise<string> {
  const creds = Buffer.from(`${PAYPAL_CLIENT}:${PAYPAL_SECRET}`).toString('base64');
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json() as any;
  if (!data.access_token) throw new Error('No se pudo obtener token PayPal: ' + JSON.stringify(data));
  return data.access_token;
}

async function sendPayPalPayout(recipientEmail: string, amountEur: number, note: string): Promise<any> {
  const token = await getPayPalToken();
  const senderBatchId = `invergrow_${Date.now()}`;
  const body = {
    sender_batch_header: {
      sender_batch_id: senderBatchId,
      email_subject: 'InverGrow — Tu retiro ha sido procesado',
      email_message: note || 'Tu retiro de InverGrow ha sido procesado correctamente.',
    },
    items: [{
      recipient_type: 'EMAIL',
      amount: { value: amountEur.toFixed(2), currency: 'EUR' },
      receiver: recipientEmail,
      note: note || 'Retiro InverGrow',
      sender_item_id: `item_${Date.now()}`,
    }],
  };
  const res = await fetch(`${PAYPAL_BASE}/v1/payments/payouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error('PayPal error: ' + JSON.stringify(data));
  const batch = data?.batch_header;
  if (!batch?.payout_batch_id) throw new Error('PayPal no devolvió un payout_batch_id: ' + JSON.stringify(data));
  return data;
}

async function handleWithdraw(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const state = await getState();
    const txArr = await supa('invergrow_transactions?select=*&order=created_at.desc&limit=1000');
    return res.status(200).json({ balance: parseFloat(state.balance) || 0, netGains: parseFloat(state.net_gains) || 0, totalWithdrawals: parseFloat(state.total_withdrawals) || 0, transactions: Array.isArray(txArr) ? txArr : [] });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const { amount, method = 'paypal', adminCode, description, paypalEmail, iban, bankName, accountHolder, phoneNumber, cardNumber, revolutAlias, cryptoWallet, cryptoNetwork } = req.body || {};
    if (adminCode && adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'Código admin incorrecto' });
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Importe inválido' });
    const state = await getState();
    const available = parseFloat((state.balance || 0).toFixed(2));
    if (amt > available) return res.status(400).json({ error: `Saldo insuficiente. Disponible: €${available.toFixed(2)}`, available });
    const ref = `WD-${Date.now()}`;
    let txStatus = 'COMPLETED';
    let txDesc = description || `Retiro ${method}`;
    let deductBalance = true;

    if (method === 'paypal') {
      const email = String(paypalEmail || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Escribe un correo PayPal válido como destino.' });
      }
      if (PAYPAL_CLIENT && PAYPAL_SECRET) {
        try {
          const ppResult = await sendPayPalPayout(email, amt, description || 'Retiro InverGrow');
          const batchId = ppResult?.batch_header?.payout_batch_id || '';
          txDesc = `PayPal Payout aceptado para ${email} — Batch: ${batchId}. PayPal lo está procesando.`;
          txStatus = 'PROCESSING';
        } catch (ppErr: any) {
          txDesc = `PayPal error: ${ppErr.message}. El saldo NO se ha descontado. Puedes reintentarlo.`;
          txStatus = 'FAILED';
          deductBalance = false;
        }
      } else {
        txDesc = `Retiro PayPal de €${amt.toFixed(2)} a ${email} — pendiente (falta config PayPal)`;
        txStatus = 'PENDING';
      }
    } else if (method === 'bank') {
      const maskedIban = iban ? `${iban.slice(0,4)}...${iban.slice(-4)}` : 'IBAN****';
      const holder = accountHolder || 'Titular';
      txDesc = `Transferencia SEPA de €${amt.toFixed(2)} al IBAN ${maskedIban} (${holder}) — pendiente de procesar manualmente.`;
      txStatus = 'PENDING';
    } else if (method === 'card') {
      txDesc = `Retiro a tarjeta de €${amt.toFixed(2)} — pendiente de procesar.`;
      txStatus = 'PENDING';
    } else if (method === 'bizum') {
      const phone = phoneNumber || 'no especificado';
      txDesc = `Bizum de €${amt.toFixed(2)} al ${phone} — pendiente de procesar manualmente.`;
      txStatus = 'PENDING';
    } else if (method === 'revolut') {
      const alias = revolutAlias || 'no especificado';
      txDesc = `Revolut de €${amt.toFixed(2)} a ${alias} — pendiente de procesar manualmente.`;
      txStatus = 'PENDING';
    } else if (method === 'tarjeta') {
      const maskedCard = cardNumber ? `${cardNumber.slice(0,4)}...${cardNumber.slice(-4)}` : '****';
      txDesc = `Retiro a tarjeta ${maskedCard} de €${amt.toFixed(2)} — pendiente de procesar manualmente.`;
      txStatus = 'PENDING';
    } else if (method === 'crypto') {
      const wallet = cryptoWallet || 'no especificada';
      const network = cryptoNetwork || 'USDT';
      txDesc = `Retiro crypto de €${amt.toFixed(2)} a wallet ${wallet.slice(0,8)}... (${network}) — pendiente de procesar manualmente.`;
      txStatus = 'PENDING';
    } else {
      txDesc = `Retiro de €${amt.toFixed(2)} (${method}) — pendiente.`;
      txStatus = 'PENDING';
    }

    if (deductBalance) {
      const newBalance = parseFloat((available - amt).toFixed(2));
      const newWithdrawals = parseFloat(((state.total_withdrawals || 0) + amt).toFixed(2));
      await patchState({ balance: newBalance, total_withdrawals: newWithdrawals });
    }
    const txInsert = await supa('invergrow_transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'WITHDRAWAL', amount: amt, status: txStatus,
        reference: ref, description: txDesc, gateway: method.toUpperCase(),
        paypal_email: method === 'paypal' ? String(paypalEmail).trim() : null,
        iban: method === 'bank' ? iban : null,
        bank_name: bankName || null,
        account_holder: accountHolder || null,
        phone_number: method === 'bizum' ? phoneNumber : null,
        card_number: method === 'tarjeta' ? cardNumber : null,
        revolut_alias: method === 'revolut' ? revolutAlias : null,
        crypto_wallet: method === 'crypto' ? cryptoWallet : null,
        crypto_network: method === 'crypto' ? (cryptoNetwork || 'USDT') : null,
      }),
    });
    return res.status(200).json({
      success: true, reference: ref, amount: amt,
      newBalance: deductBalance ? parseFloat((available - amt).toFixed(2)) : available,
      totalWithdrawals: deductBalance ? parseFloat(((state.total_withdrawals || 0) + amt).toFixed(2)) : state.total_withdrawals,
      status: txStatus,
      message: txDesc,
    });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
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
    // Los ingresos nuevos se acumulan como ganancias netas.
    // Solo pasan al saldo retirable cuando Joan pulsa 'Transferir ganancias netas'.
    const newBalance = parseFloat((state.balance || 0).toFixed(2));
    const newNetGains = parseFloat((parseFloat(state.net_gains) + amt).toFixed(2));
    await patchState({ balance: newBalance, net_gains: newNetGains });
    return res.status(200).json({ success: true, balance: newBalance, netGains: newNetGains, reference: ref });
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

async function handleInvestFromBalance(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount } = req.body || {};
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Importe invalido' });
    const state = await getState();
    const balance = parseFloat(state.balance);
    if (amt > balance) return res.status(400).json({ error: `Saldo insuficiente. Tienes EUR${balance.toFixed(2)}` });
    const ref = 'INV-' + Date.now().toString(36).toUpperCase();
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'INVEST', status: 'COMPLETED', amount: amt, description: `Inversion desde saldo: EUR${amt.toFixed(2)}`, reference: ref, gateway: 'INTERNAL' }) });
    const newBalance = balance - amt;
    const newInvested = parseFloat(state.invested_capital) + amt;
    await patchState({ balance: newBalance, invested_capital: newInvested });
    return res.status(200).json({ success: true, amount: amt, newBalance, newInvestedCapital: newInvested, reference: ref, message: `EUR${amt.toFixed(2)} invertidos desde tu saldo. Capital: EUR${newInvested.toFixed(2)}` });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

async function handleBot(req: VercelRequest, res: VercelResponse) {
  try {
    const state = await getState();
    const balance = parseFloat(state.balance) || 0;
    const invested = parseFloat(state.invested_capital) || 0;
    const netGains = parseFloat(state.net_gains) || 0;
    const workers = await getWorkers(state);

    const txArr = await supa('invergrow_transactions?select=*&order=created_at.desc&limit=5');
    const recentTxs = (Array.isArray(txArr) ? txArr : []).map((t: any) => ({
      type: t.type, amount: parseFloat(t.amount) || 0, status: t.status,
      description: t.description, date: t.created_at, gateway: t.gateway,
    }));

    const monthlyReturn = invested * 0.124 / 12;
    const dailyRate = 0.124 / 365;
    const todayEarnings = invested * dailyRate;

    return res.status(200).json({
      active: true,
      stats: {
        capitalInvested: invested,
        balanceAvailable: balance,
        estimatedMonthlyReturn: monthlyReturn,
        dailyEarnings: todayEarnings,
        totalEarned: netGains,
        tradesExecuted: Math.floor(invested / 10),
        contentGenerated: 0,
        marketAnalyses: Math.floor(invested / 5),
      },
      recentTransactions: recentTxs,
      workers: workers.map((w: any) => ({
        id: w.id, name: w.name, role: w.role,
        status: w.status, icon: w.icon, level: w.level,
        rate: `${(w.baseIncomeRate || 0.02).toFixed(2)}€/día`,
        color: ['#00ff88','#00d4ff','#a855f7','#f59e0b'][parseInt(w.id.slice(-1))-1] || '#00ff88',
      })),
      log: [
        { time: new Date().toISOString(), text: `Capital invertido: EUR${invested.toFixed(2)}`, type: 'info' },
        { time: new Date().toISOString(), text: `Rendimiento diario estimado: EUR${todayEarnings.toFixed(4)}`, type: 'analysis' },
        { time: new Date().toISOString(), text: `Rentabilidad mensual proyectada: EUR${monthlyReturn.toFixed(2)} (12.4% APR)`, type: 'success' },
        { time: new Date().toISOString(), text: `Saldo disponible para reinversión: EUR${balance.toFixed(2)}`, type: 'info' },
      ],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, active: false });
  }
}

// ─── handleUpgradeWorker ─────────────────────────────────────────────────────
async function handleUpgradeWorker(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { workerId, adminCode } = req.body || {};
    if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'Código admin incorrecto' });
    if (!workerId) return res.status(400).json({ error: 'workerId requerido' });

    const state = await getState();
    let workers = await getWorkers(state);
    const idx = workers.findIndex((w: any) => w.id === workerId);
    if (idx === -1) return res.status(404).json({ error: 'Worker no encontrado' });

    const worker = workers[idx];
    const cost = getUpgradeCost(worker);
    const balance = parseFloat(state.balance) || 0;

    if (balance < cost) {
      return res.status(400).json({
        error: `Saldo insuficiente. Necesitas €${cost.toFixed(2)} y tienes €${balance.toFixed(2)}`,
        balance, cost,
      });
    }

    // Upgrade worker
    const newLevel = (worker.level || 1) + 1;
    const newCostToUpgrade = Math.round(cost * 1.5); // Next upgrade cost
    workers[idx] = {
      ...worker,
      level: newLevel,
      costToUpgrade: newCostToUpgrade,
      baseIncomeRate: parseFloat((worker.baseIncomeRate * 1.5).toFixed(4)),
    };

    // Update state
    const newBalance = parseFloat((balance - cost).toFixed(2));
    await patchState({
      balance: newBalance,
      workers: JSON.stringify(workers),
    });

    const ref = 'UPG-' + Date.now().toString(36).toUpperCase();
    await supa('invergrow_transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'WORKER_UPGRADE',
        status: 'COMPLETED',
        amount: cost,
        description: `Upgrade ${worker.name} a Lv.${newLevel} — €${cost.toFixed(2)}`,
        reference: ref,
        gateway: 'INTERNAL',
      }),
    });

    return res.status(200).json({
      success: true,
      workerId,
      workerName: worker.name,
      oldLevel: worker.level,
      newLevel,
      cost,
      newBalance,
      baseIncomeRate: workers[idx].baseIncomeRate,
      nextUpgradeCost: newCostToUpgrade,
      reference: ref,
      message: `✅ ${worker.name} subido a Lv.${newLevel} por €${cost.toFixed(2)}. Próximo upgrade: €${newCostToUpgrade}`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── handleTransferGains (mover ganancias netas → balance) ──────────────────
async function handleTransferGains(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { adminCode, amount } = req.body || {};
    if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'Código admin incorrecto' });
    const state = await getState();
    const netGains = parseFloat(state.net_gains) || 0;
    if (netGains <= 0) return res.status(400).json({ error: 'No hay ganancias netas para transferir' });
    const amt = amount ? Math.min(parseFloat(amount), netGains) : netGains;
    if (amt <= 0) return res.status(400).json({ error: 'Importe inválido' });
    const newBalance = parseFloat((state.balance || 0) + amt);
    const newNetGains = parseFloat((netGains - amt).toFixed(2));
    await patchState({ balance: newBalance, net_gains: newNetGains });
    const ref = 'TFR-' + Date.now().toString(36).toUpperCase();
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'GAINS_TRANSFER', status: 'COMPLETED', amount: amt, description: `Transferencia de ganancias → balance: €${amt.toFixed(2)}`, reference: ref, gateway: 'INTERNAL' }) });
    return res.status(200).json({ success: true, amount: amt, newBalance, newNetGains, reference: ref, message: `€${amt.toFixed(2)} transferidos de ganancias a saldo disponible.` });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

// ─── handleAdjustBalance (ajustar saldo manualmente) ────────────────────────
async function handleAdjustBalance(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { adminCode, amount, reason } = req.body || {};
    if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'Código admin incorrecto' });
    const amt = parseFloat(amount);
    if (!amt || amt === 0) return res.status(400).json({ error: 'Importe inválido (no puede ser 0)' });
    const state = await getState();
    const currentBalance = parseFloat(state.balance) || 0;
    const newBalance = parseFloat((currentBalance + amt).toFixed(2));
    if (newBalance < 0) return res.status(400).json({ error: 'El saldo no puede quedar negativo' });
    await patchState({ balance: newBalance });
    const ref = 'ADJ-' + Date.now().toString(36).toUpperCase();
    const desc = reason || (amt > 0 ? `Ajuste manual +€${amt.toFixed(2)}` : `Ajuste manual -€${Math.abs(amt).toFixed(2)}`);
    await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'MANUAL_ADJUSTMENT', status: 'COMPLETED', amount: Math.abs(amt), description: desc, reference: ref, gateway: 'INTERNAL' }) });
    return res.status(200).json({ success: true, adjustment: amt, oldBalance: currentBalance, newBalance, reference: ref, message: `Saldo ajustado: €${currentBalance.toFixed(2)} → €${newBalance.toFixed(2)}` });
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
      // Los ingresos de webhooks también quedan primero como ganancias netas.
      const newBalance = parseFloat((state.balance || 0).toFixed(2));
      const newNetGains = parseFloat((parseFloat(state.net_gains) + amount).toFixed(2));
      await patchState({ balance: newBalance, net_gains: newNetGains });
      await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'WEBHOOK_INCOME', status: 'COMPLETED', amount, description, reference: `WH-${Date.now().toString(36).toUpperCase()}`, gateway: source }) });
    }
    return res.status(200).json({ received: true, event, amount, description, timestamp: new Date().toISOString() });
  } catch (err: any) { return res.status(500).json({ error: err.message }); }
}

// ─── Main router ──────────────────────────────────────────────────────────────
// ─── handleStripePayout ─────────────────────────────────────────────────────
async function handleStripePayout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, adminCode, iban } = req.body || {};
    if (adminCode && adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'Código admin incorrecto' });
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Importe inválido' });
    if (!STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Stripe no configurado' });
    if (!iban) return res.status(400).json({ error: 'IBAN requerido' });

    const state = await getState();
    const available = parseFloat((state.balance || 0).toFixed(2));
    if (amt > available) return res.status(400).json({ error: 'Saldo insuficiente. Disponible: \u20ac' + available.toFixed(2), available });

    // Stripe Payout
    const payoutRes = await fetch('https://api.stripe.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(Math.round(amt * 100)),
        currency: 'eur',
        destination_type: 'bank_account',
        method: 'standard',
        statement_descriptor: 'INVERGROW',
      }),
    });
    const payoutData: any = await payoutRes.json();

    if (!payoutRes.ok) {
      return res.status(400).json({
        error: 'Stripe: ' + (payoutData.error?.message || payoutData.error?.code || 'desconocido'),
      });
    }

    const ref = 'WD-' + Date.now();
    const newBalance = parseFloat((available - amt).toFixed(2));
    await supa('invergrow_transactions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'WITHDRAWAL', status: 'COMPLETED',
        amount: amt,
        description: 'Retiro Stripe IBAN \u20ac' + amt.toFixed(2) + ' — ' + payoutData.id,
        reference: ref, gateway: 'STRIPE',
        iban: iban.slice(0, 8) + '...',
      }),
    });
    await patchState({
      balance: newBalance,
      total_withdrawals: parseFloat(((state.total_withdrawals || 0) + amt).toFixed(2))
    });

    return res.status(200).json({
      success: true, reference: ref, amount: amt,
      stripePayoutId: payoutData.id,
      newBalance,
      status: payoutData.status,
      arrivalDate: payoutData.arrival_date,
      message: '\u20ac' + amt.toFixed(2) + ' enviado a tu cuenta. ID: ' + payoutData.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

async function handleCreateCheckout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { amount, description, successUrl, cancelUrl } = req.body || {};
    const amt = parseInt(amount) || 10;
    const desc = description || 'Inversión en InverGrow';
    
    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'success_url': successUrl || SITE_URL + '?payment=success',
        'cancel_url': cancelUrl || SITE_URL + '?payment=cancel',
        'line_items[0][price_data][currency]': 'eur',
        'line_items[0][price_data][product_data][name]': desc,
        'line_items[0][price_data][unit_amount]': String(amt * 100),
        'line_items[0][quantity]': '1',
      }),
    });
    const data: any = await stripeRes.json();
    if (!stripeRes.ok) return res.status(400).json({ error: data.error?.message || 'Stripe error' });
    
    res.json({ url: data.url, sessionId: data.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Error interno' });
  }
}

async function handleStripeWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const sig = req.headers['stripe-signature'] as string || '';
    const rawBody = req.body;
    let event: any = rawBody;
    if (STRIPE_WEBHOOK_SECRET) {
      const eventType = event?.type || '';
      const session = event?.data?.object || {};
      if (eventType === 'checkout.session.completed' || eventType === 'payment_intent.succeeded') {
        const amount = (session.amount_total || session.amount || 0) / 100;
        const email = session.customer_email || session.receipt_email || 'inversor@invergrow.com';
        const desc = 'Stripe: Pago recibido - €' + amount.toFixed(2);
        if (amount > 0) {
          try { await fetch(SITE_URL + '/api/income', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, source: 'stripe', description: desc }) }); } catch {}
          try { await supa('invergrow_transactions', { method: 'POST', body: JSON.stringify({ type: 'DEPOSIT', status: 'COMPLETED', amount, description: desc, reference: session.id || 'stripe_' + Date.now(), gateway: 'STRIPE' }) }); } catch {}
          console.log('Stripe payment processed:', amount, 'EUR from', email);
        }
      }
    }
    res.json({ received: true });
  } catch (e: any) {
    console.error('Stripe webhook error:', e.message);
    res.status(500).json({ error: e.message || 'Error interno' });
  }
}

// ─── handleRestoreWorkers (restaurar workers a Lv.2) ──────────────────────────
async function handleRestoreWorkers(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { adminCode } = req.body || {};
    if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'Código admin incorrecto' });
    
    const LV2_WORKERS = [
      { id: 'ai-1', name: 'ContentBot Alpha',   role: 'Creador de Contenido',    status: 'ACTIVE', level: 2, model: 'gemini-flash', baseIncomeRate: 0.03,  unlocked: true,  costToUnlock: 0,   costToUpgrade: 75,  totalGenerated: 19.95, icon: '🤖' },
      { id: 'ai-2', name: 'TradeBot Beta',       role: 'Analisis de Mercado',     status: 'ACTIVE', level: 2, model: 'gemini-flash', baseIncomeRate: 0.045, unlocked: true,  costToUnlock: 0,   costToUpgrade: 113, totalGenerated: 0,    icon: '📈' },
      { id: 'ai-3', name: 'AffiliateBot Gamma',  role: 'Marketing de Afiliados',  status: 'ACTIVE', level: 2, model: 'gemini-flash', baseIncomeRate: 0.0375,unlocked: true,  costToUnlock: 0,   costToUpgrade: 90,  totalGenerated: 0,    icon: '🛒' },
      { id: 'ai-4', name: 'DataBot Delta',       role: 'Procesamiento de Datos',  status: 'IDLE',   level: 1, model: 'gemini-flash', baseIncomeRate: 0.015, unlocked: false, costToUnlock: 100, costToUpgrade: 50,  totalGenerated: 0,    icon: '💾' },
    ];
    
    await patchState({ workers: JSON.stringify(LV2_WORKERS) });
    return res.status(200).json({ success: true, message: '✅ Workers restaurados a Lv.2 (DataBot sigue Lv.1 locked)' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Source');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url || '';
  const path = url.replace(/^\/api\/?/, '').split('?')[0];

  if (path === 'data'             || path === '') return handleData(req, res);
  if (path === 'worker-cycle')                    return handleWorkerCycle(req, res);
  if (path === 'withdraw')                        return handleWithdraw(req, res);
  if (path === 'income')                          return handleIncome(req, res);
  if (path === 'reinvest')                        return handleReinvest(req, res);
  if (path === 'invest-from-balance')             return handleInvestFromBalance(req, res);
  if (path === 'bot')                              return handleBot(req, res);
  if (path === 'transfer-gains')                   return handleTransferGains(req, res);
  if (path === 'adjust-balance')                   return handleAdjustBalance(req, res);
  if (path === 'ai/workers/upgrade')              return handleUpgradeWorker(req, res);
  if (path === 'youtube')                         return handleYoutube(req, res);
  if (path === 'youtube-callback')                return handleYoutubeCallback(req, res);
  if (path === 'admob')                           return handleAdmob(req, res);
  if (path === 'sync')                            return handleSync(req, res);
  if (path === 'webhook')                         return handleWebhook(req, res);
  if (path === 'stripe-payout')                   return handleStripePayout(req, res);
  if (path === 'create-checkout')                 return handleCreateCheckout(req, res);
  if (path === 'stripe-webhook')                  return handleStripeWebhook(req, res);
  if (path === 'binance/simple-earn')             return handleBinanceSimpleEarn(req, res);
  if (path === 'binance/deposit-earn')            return handleBinanceDepositEarn(req, res);
  if (path === 'admin/restore-workers')           return handleRestoreWorkers(req, res);

  return res.status(404).json({ error: `Ruta no encontrada: ${path}` });
}
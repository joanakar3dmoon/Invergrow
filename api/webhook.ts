import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const STATE_ID = 'invergrow_main';

async function supa(path: string, opts: RequestInit = {}) {
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
  const arr = await supa(`apps?id=eq.${STATE_ID}&select=description`);
  if (Array.isArray(arr) && arr[0]?.description) return JSON.parse(arr[0].description);
  return { balance: 0, netGains: 0, reinvestmentFund: 0, totalWithdrawals: 0, transactions: [], aiWorkers: [], aiLogs: [], webhookLogs: [] };
}

async function saveState(state: any): Promise<void> {
  await supa(`apps?id=eq.${STATE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ description: JSON.stringify(state) }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Webhook-Source');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET: devolver historial de logs
  if (req.method === 'GET') {
    const state = await getState();
    return res.status(200).json({
      logs: state.webhookLogs || [],
      endpoint: '/api/webhook',
      status: 'active',
    });
  }

  // DELETE: limpiar logs (reiniciar consola)
  if (req.method === 'DELETE') {
    const state = await getState();
    state.webhookLogs = [];
    await saveState(state);
    return res.status(200).json({ success: true, message: 'Logs reiniciados.' });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = req.body || {};
    const source = (req.headers['x-webhook-source'] as string) || 'Manual';
    const timestamp = new Date().toISOString();

    // Detectar tipo de evento
    const event = body.event || body.type || 'custom';
    let amount = 0;
    let description = '';
    let processedRevenue = 0;

    // Payloads conocidos: Stripe, PayPal, Gumroad, Manual
    if (event === 'payout.paid' || event === 'charge.succeeded' || event === 'payment_intent.succeeded') {
      // Stripe
      amount = Math.round((body.data?.amount || body.amount || 0)) / 100;
      description = `Stripe: ${event} — ${body.data?.currency?.toUpperCase() || 'EUR'} ${amount.toFixed(2)}`;
    } else if (event === 'PAYMENT.CAPTURE.COMPLETED' || event === 'CHECKOUT.ORDER.APPROVED') {
      // PayPal
      const val = body.resource?.amount?.value || body.amount || 0;
      amount = parseFloat(val);
      description = `PayPal: ${event} — €${amount.toFixed(2)}`;
    } else if (event === 'sale_completed' || event === 'order.completed') {
      // Gumroad / genérico
      amount = parseFloat(body.price || body.amount || body.data?.amount || 0);
      description = `Venta: ${event} — €${amount.toFixed(2)}`;
    } else {
      // Evento personalizado
      amount = parseFloat(body.amount || body.data?.amount || 0);
      description = `Webhook: ${event}${amount > 0 ? ` — €${amount.toFixed(2)}` : ''}`;
    }

    // Si hay importe, procesarlo como ingreso (split 70/30)
    let toReinvest = 0;
    let toNet = 0;
    if (amount > 0) {
      processedRevenue = amount;
      toReinvest = parseFloat((amount * 0.7).toFixed(2));
      toNet = parseFloat((amount * 0.3).toFixed(2));

      const state = await getState();
      state.reinvestmentFund = parseFloat(((state.reinvestmentFund || 0) + toReinvest).toFixed(2));
      state.netGains = parseFloat(((state.netGains || 0) + toNet).toFixed(2));

      if (!state.transactions) state.transactions = [];
      state.transactions.unshift({
        id: `wh-${Date.now()}`,
        type: 'WEBHOOK_INCOME',
        status: 'COMPLETED',
        amount,
        date: timestamp.split('T')[0],
        reference: `WH-${Date.now().toString(36).toUpperCase()}`,
        description,
        gateway: source,
      });
      if (state.transactions.length > 50) state.transactions = state.transactions.slice(0, 50);

      if (!state.webhookLogs) state.webhookLogs = [];
      state.webhookLogs.unshift({
        id: `whl-${Date.now()}`,
        timestamp,
        event,
        source,
        amount,
        toReinvest,
        toNet,
        description,
        payload: body,
        status: 'PROCESSED',
      });
      if (state.webhookLogs.length > 30) state.webhookLogs = state.webhookLogs.slice(0, 30);

      await saveState(state);
    } else {
      // Log sin importe
      const state = await getState();
      if (!state.webhookLogs) state.webhookLogs = [];
      state.webhookLogs.unshift({
        id: `whl-${Date.now()}`,
        timestamp,
        event,
        source,
        amount: 0,
        description,
        payload: body,
        status: 'LOGGED',
      });
      if (state.webhookLogs.length > 30) state.webhookLogs = state.webhookLogs.slice(0, 30);
      await saveState(state);
    }

    return res.status(200).json({
      received: true,
      event,
      amount,
      toReinvest,
      toNet,
      description,
      timestamp,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tolzqxflecqbjdefohom.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const ADMIN_CODE = process.env.ADMIN_CODE || 'joan123';

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
  const arr = await supa('invergrow_state?id=eq.main&select=*');
  if (Array.isArray(arr) && arr[0]) return arr[0];
  return { balance: 0, net_gains: 0, invested_capital: 0, total_withdrawals: 0 };
}

async function saveState(fields: Record<string, any>) {
  await supa('invergrow_state?id=eq.main', {
    method: 'PATCH',
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    });
  }

  if (req.method === 'POST') {
    try {
      const { amount, method = 'paypal', adminCode, description } = req.body || {};

      if (adminCode && adminCode !== ADMIN_CODE) {
        return res.status(403).json({ error: 'Código admin incorrecto' });
      }

      const amt = parseFloat(amount);
      if (!amt || amt <= 0) return res.status(400).json({ error: 'Importe inválido' });

      const state = await getState();
      const available = parseFloat((state.balance || 0).toFixed(2));

      if (amt > available) {
        return res.status(400).json({
          error: `Saldo insuficiente. Disponible: €${available.toFixed(2)}`,
          available,
        });
      }

      const newBalance = parseFloat((available - amt).toFixed(2));
      const newWithdrawals = parseFloat(((state.total_withdrawals || 0) + amt).toFixed(2));
      const ref = `WD-${Date.now()}`;

      await saveState({
        balance: newBalance,
        total_withdrawals: newWithdrawals,
      });

      // Registrar transacción
      await supa('invergrow_transactions', {
        method: 'POST',
        body: JSON.stringify({
          type: 'WITHDRAWAL',
          amount: amt,
          status: 'COMPLETED',
          reference: ref,
          description: description || `Retiro ${method}`,
          gateway: method.toUpperCase(),
        }),
      });

      return res.status(200).json({
        success: true,
        reference: ref,
        amount: amt,
        newBalance,
        totalWithdrawals: newWithdrawals,
        message: `Retiro de €${amt.toFixed(2)} procesado correctamente.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método no permitido' });
}

import React, { useState, useEffect } from 'react';
import {
  Shield, DollarSign, Send, Eye, EyeOff, CheckCircle2,
  AlertCircle, Clock, CreditCard, Landmark, Wallet,
  Lock, RefreshCw, History, ExternalLink
} from 'lucide-react';

const OWNER_EMAIL = 'joanlazaro83@gmail.com';

interface WithdrawRecord {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  note: string;
  user_email: string;
}

interface OwnerWithdrawPanelProps {
  netGains: number;
  balance: number;
}

export default function OwnerWithdrawPanel({ netGains, balance }: OwnerWithdrawPanelProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [method, setMethod] = useState<'paypal' | 'card' | 'bank'>('paypal');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<WithdrawRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const totalAvailable = balance + netGains;

  // Cargar historial desde el servidor (Supabase real)
  async function loadHistory(adminCode: string) {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/owner/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode })
      });
      const data = await res.json();
      if (data.success) setHistory(data.withdrawals || []);
    } catch {
      // silencioso
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleUnlock() {
    if (!code.trim()) { setCodeError('Introduce el código.'); return; }
    // Verificar contra el servidor
    fetch('/api/owner/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminCode: code })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUnlocked(true);
          setCodeError('');
          loadHistory(code);
        } else {
          setCodeError('Código incorrecto. Inténtalo de nuevo.');
        }
      })
      .catch(() => setCodeError('Error de red. Inténtalo de nuevo.'));
  }

  async function handleWithdraw() {
    const amtNum = parseFloat(amount);
    if (!amtNum || amtNum <= 0) { setMsg({ type: 'error', text: 'Importe inválido.' }); return; }
    if (amtNum > totalAvailable) { setMsg({ type: 'error', text: `Fondos insuficientes. Máximo disponible: €${totalAvailable.toFixed(2)}` }); return; }

    setIsSubmitting(true);
    setMsg(null);

    try {
      const body: any = { adminCode: code, amount: amtNum, method, note };
      if (method === 'paypal') body.paypalEmail = OWNER_EMAIL;

      const res = await fetch('/api/owner/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.success) {
        setMsg({ type: 'success', text: data.message || '✅ Retiro procesado correctamente.' });
        setAmount('');
        setNote('');
        loadHistory(code);
      } else {
        setMsg({ type: 'error', text: data.error || 'Error procesando el retiro.' });
      }
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Error de red: ' + e.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Pantalla de bloqueo ────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-8 w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Panel del Propietario</h2>
            <p className="text-sm text-slate-400">Introduce tu código de administrador para acceder</p>
          </div>

          <div className="space-y-3">
            <div className="relative">
              <input
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={e => { setCode(e.target.value); setCodeError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                placeholder="Código de administrador"
                className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 pr-10 focus:outline-none focus:border-amber-500 transition-colors"
              />
              <button
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {codeError && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {codeError}
              </div>
            )}

            <button
              onClick={handleUnlock}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Acceder al panel
            </button>
          </div>

          <p className="text-center text-xs text-slate-600">
            Acceso exclusivo para el propietario de InverGrow
          </p>
        </div>
      </div>
    );
  }

  // ── Panel desbloqueado ──────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Panel del Propietario</h2>
            <p className="text-xs text-slate-400">Retiros directos — {OWNER_EMAIL}</p>
          </div>
        </div>
        <button
          onClick={() => { setUnlocked(false); setCode(''); }}
          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
        >
          <Lock className="w-3.5 h-3.5" /> Bloquear
        </button>
      </div>

      {/* Fondos disponibles */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Saldo principal</div>
          <div className="text-xl font-bold text-emerald-400">€{balance.toFixed(2)}</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Ganancias netas IA</div>
          <div className="text-xl font-bold text-blue-400">€{netGains.toFixed(2)}</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="text-xs text-slate-400 mb-1">Total disponible</div>
          <div className="text-xl font-bold text-amber-400">€{totalAvailable.toFixed(2)}</div>
        </div>
      </div>

      {/* Formulario de retiro */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 space-y-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Send className="w-4 h-4 text-amber-400" />
          Nuevo retiro
        </h3>

        {/* Método */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">Método de pago</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'paypal', icon: Wallet, label: 'PayPal', sub: OWNER_EMAIL },
              { key: 'card', icon: CreditCard, label: 'Tarjeta', sub: 'Débito / Crédito' },
              { key: 'bank', icon: Landmark, label: 'Banco', sub: 'Transferencia SEPA' },
            ].map(({ key, icon: Icon, label, sub }) => (
              <button
                key={key}
                onClick={() => setMethod(key as any)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                  method === key
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                    : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{label}</span>
                <span className="text-[10px] text-slate-500">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Importe */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">Importe (€)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">€</span>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              min="1"
              max={totalAvailable}
              step="0.01"
              className="w-full bg-slate-900 border border-slate-600 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {[25, 50, 100, 250].map(pct => {
              const val = (totalAvailable * pct / 100).toFixed(2);
              return (
                <button
                  key={pct}
                  onClick={() => setAmount(val)}
                  className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1.5 rounded-lg transition-colors"
                >
                  {pct}%
                </button>
              );
            })}
            <button
              onClick={() => setAmount(totalAvailable.toFixed(2))}
              className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1.5 rounded-lg transition-colors"
            >
              Máx
            </button>
          </div>
        </div>

        {/* Nota */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-medium">Nota (opcional)</label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Motivo del retiro..."
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors text-sm"
          />
        </div>

        {/* Mensaje */}
        {msg && (
          <div className={`flex items-start gap-3 rounded-xl p-4 text-sm ${
            msg.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border border-red-500/20 text-red-300'
          }`}>
            {msg.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            }
            <span>{msg.text}</span>
          </div>
        )}

        {/* Botón */}
        <button
          onClick={handleWithdraw}
          disabled={isSubmitting || !amount}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Procesando...</>
          ) : (
            <><Send className="w-4 h-4" /> Confirmar retiro de {amount ? `€${parseFloat(amount).toFixed(2)}` : '...'}</>
          )}
        </button>
      </div>

      {/* Historial */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Historial de retiros
          </h3>
          <button
            onClick={() => loadHistory(code)}
            disabled={loadingHistory}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            {loadingHistory ? 'Cargando historial...' : 'Sin retiros registrados aún.'}
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(w => (
              <div key={w.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-slate-300 font-medium">
                    {new Date(w.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {w.note && <span className="text-xs text-slate-500">{w.note.slice(0, 60)}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-amber-400">€{Number(w.amount).toFixed(2)}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    w.status === 'COMPLETED' || w.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {w.status === 'COMPLETED' || w.status === 'completed' ? '✓ OK' : '⏳ Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Shield, DollarSign, Send, Eye, EyeOff, CheckCircle2,
  AlertCircle, Clock, CreditCard, Landmark, Wallet,
  TrendingUp, ArrowUpRight, Lock, RefreshCw, History
} from 'lucide-react';

const OWNER_EMAIL = 'joanlazaro83@gmail.com';
const OWNER_PAYPAL = 'joanlazaro83@gmail.com';
const ADMIN_CODE = 'joan123';

interface WithdrawRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
  destination: string;
  status: 'COMPLETED' | 'PENDING';
  ref: string;
}

interface OwnerWithdrawPanelProps {
  netGains: number;
  balance: number;
  onWithdraw: (data: {
    amount: number;
    description: string;
    gateway: 'STRIPE' | 'CUSTOM';
    reference: string;
  }) => Promise<void>;
}

export default function OwnerWithdrawPanel({ netGains, balance, onWithdraw }: OwnerWithdrawPanelProps) {
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [method, setMethod] = useState<'paypal' | 'card' | 'bank'>('paypal');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<WithdrawRecord[]>([]);
  const [paypalEmail, setPaypalEmail] = useState(OWNER_PAYPAL);
  const [cardNumber, setCardNumber] = useState('');
  const [cardOwner, setCardOwner] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [iban, setIban] = useState('');
  const [bankOwner, setBankOwner] = useState('');
  const [activeView, setActiveView] = useState<'withdraw' | 'history'>('withdraw');

  const totalAvailable = netGains + balance;

  useEffect(() => {
    const saved = localStorage.getItem('invergrow_owner_withdrawals');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleUnlock = () => {
    if (code === ADMIN_CODE) {
      setUnlocked(true);
      setCodeError('');
    } else {
      setCodeError('Código incorrecto. Acceso denegado.');
      setCode('');
    }
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setMsg({ type: 'error', text: 'Introduce un importe válido.' });
    if (amt > totalAvailable) return setMsg({ type: 'error', text: `Saldo insuficiente. Máximo: €${totalAvailable.toFixed(2)}` });
    setIsSubmitting(true);
    setMsg(null);
    try {
      let destination = '';
      let methodLabel = '';
      if (method === 'paypal') { destination = paypalEmail; methodLabel = 'PayPal'; }
      else if (method === 'card') { destination = cardNumber ? `**** ${cardNumber.replace(/\s/g,'').slice(-4)}` : 'Tarjeta'; methodLabel = 'Tarjeta débito'; }
      else { destination = iban || 'Cuenta bancaria'; methodLabel = 'Transferencia SEPA'; }

      const ref = `OWNER-${Date.now()}`;
      await onWithdraw({
        amount: amt,
        description: `Retiro propietario vía ${methodLabel} → ${destination}`,
        gateway: 'CUSTOM',
        reference: ref
      });

      const record: WithdrawRecord = {
        id: ref,
        date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        amount: amt,
        method: methodLabel,
        destination,
        status: 'COMPLETED',
        ref
      };

      const updated = [record, ...history];
      setHistory(updated);
      localStorage.setItem('invergrow_owner_withdrawals', JSON.stringify(updated));
      setMsg({ type: 'success', text: `✅ Retiro de €${amt.toFixed(2)} procesado vía ${methodLabel} → ${destination}` });
      setAmount('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error al procesar el retiro.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── LOGIN ────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Shield className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <h2 className="text-white font-bold text-xl">Área del Propietario</h2>
              <p className="text-zinc-500 text-sm mt-1">Panel exclusivo de retiros · Solo Joan R3DMOON</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                <Lock className="w-3 h-3 inline mr-1" />Código de acceso
              </label>
              <div className="relative">
                <input
                  type={showCode ? 'text' : 'password'}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                  placeholder="Código secreto"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors pr-12 text-sm"
                />
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {codeError && (
                <div className="flex items-center gap-2 text-red-400 text-xs mt-2">
                  <AlertCircle className="w-3.5 h-3.5" />{codeError}
                </div>
              )}
            </div>

            <button
              onClick={handleUnlock}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Shield className="w-4 h-4" />Acceder al Panel
            </button>
          </div>

          <p className="text-center text-[10px] text-zinc-700 mt-6 font-mono">{OWNER_EMAIL}</p>
        </div>
      </div>
    );
  }

  // ─── PANEL PRINCIPAL ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header con balance */}
      <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-5 shadow-xl shadow-emerald-500/5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Panel del Propietario</h2>
              <p className="text-emerald-400 text-xs flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Sesión activa · Joan R3DMOON
              </p>
            </div>
          </div>
          <button
            onClick={() => setUnlocked(false)}
            className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Tarjetas de balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Ganancias IA (30%)</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              €{netGains.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Ganancias netas listas para retirar</p>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Saldo General</span>
              <Wallet className="w-3.5 h-3.5 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              €{balance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Balance principal del sistema</p>
          </div>
          <div className="bg-amber-950/20 border border-amber-800/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Total Retirable</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">
              €{totalAvailable.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-zinc-600 mt-1">Disponible para retirar ahora</p>
          </div>
        </div>
      </div>

      {/* Tabs: Retiro / Historial */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        <button
          onClick={() => setActiveView('withdraw')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeView === 'withdraw' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <Send className="w-4 h-4" />Nuevo Retiro
        </button>
        <button
          onClick={() => setActiveView('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeView === 'history' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
        >
          <History className="w-4 h-4" />Historial
          {history.length > 0 && (
            <span className="bg-zinc-700 text-zinc-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{history.length}</span>
          )}
        </button>
      </div>

      {activeView === 'withdraw' ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Solicitar Retiro</h3>
              <p className="text-zinc-500 text-xs">Elige método y destino de cobro</p>
            </div>
          </div>

          {/* Selector de método */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Método de cobro</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ['paypal', 'PayPal', Wallet, 'Inmediato'],
                ['card', 'Tarjeta débito', CreditCard, '1-2 días'],
                ['bank', 'Banco / SEPA', Landmark, '1-3 días']
              ] as const).map(([key, label, Icon, time]) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={`flex flex-col items-center gap-2 py-4 rounded-xl border text-xs font-medium transition-all ${
                    method === key
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/10'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-semibold">{label}</span>
                  <span className={`text-[9px] ${method === key ? 'text-emerald-600' : 'text-zinc-600'}`}>{time}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Campos según método */}
          {method === 'paypal' && (
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Email PayPal de destino</label>
              <input
                type="email"
                value={paypalEmail}
                onChange={e => setPaypalEmail(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <p className="text-[10px] text-zinc-600 mt-1.5">
                PayPal Standard → cuenta bancaria/tarjeta vinculada. Sin comisiones adicionales de InverGrow.
              </p>
            </div>
          )}

          {method === 'card' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Titular</label>
                <input
                  type="text"
                  value={cardOwner}
                  onChange={e => setCardOwner(e.target.value)}
                  placeholder="Joan Lázaro"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Número de tarjeta</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  placeholder="•••• •••• •••• 1234"
                  maxLength={19}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Caducidad</label>
                <input
                  type="text"
                  value={cardExpiry}
                  onChange={e => setCardExpiry(e.target.value)}
                  placeholder="MM/AA"
                  maxLength={5}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          {method === 'bank' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Titular de la cuenta</label>
                <input
                  type="text"
                  value={bankOwner}
                  onChange={e => setBankOwner(e.target.value)}
                  placeholder="Joan Lázaro"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">IBAN</label>
                <input
                  type="text"
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                />
              </div>
              <p className="text-[10px] text-zinc-600">Transferencia SEPA · 1-3 días hábiles.</p>
            </div>
          )}

          {/* Importe */}
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Importe a retirar (€)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                min="1"
                step="0.01"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
              <button
                onClick={() => setAmount(netGains.toFixed(2))}
                className="px-3 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs rounded-xl transition-all font-medium border border-zinc-600"
                title="Ganancias IA netas"
              >
                IA
              </button>
              <button
                onClick={() => setAmount(totalAvailable.toFixed(2))}
                className="px-3 bg-amber-700/40 hover:bg-amber-700/60 text-amber-300 text-xs rounded-xl transition-all font-medium border border-amber-700/40"
              >
                MÁX
              </button>
            </div>
            <div className="flex justify-between mt-1.5 text-[10px]">
              <span className="text-zinc-600">Ganancias IA: <span className="text-emerald-400 font-bold">€{netGains.toFixed(2)}</span></span>
              <span className="text-zinc-600">Total disponible: <span className="text-amber-400 font-bold">€{totalAvailable.toFixed(2)}</span></span>
            </div>
          </div>

          {/* Mensaje */}
          {msg && (
            <div className={`flex items-start gap-3 text-sm p-4 rounded-xl border ${
              msg.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
              {msg.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span>{msg.text}</span>
            </div>
          )}

          <button
            onClick={handleWithdraw}
            disabled={isSubmitting || !amount || parseFloat(amount) <= 0}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            {isSubmitting
              ? <><RefreshCw className="w-4 h-4 animate-spin" />Procesando retiro...</>
              : <><Send className="w-4 h-4" />Retirar {amount && parseFloat(amount) > 0 ? `€${parseFloat(amount).toFixed(2)}` : ''} ahora</>
            }
          </button>
        </div>

      ) : (
        /* Historial */
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 bg-zinc-700/50 border border-zinc-700 rounded-xl flex items-center justify-center">
              <History className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Historial de retiros</h3>
              <p className="text-zinc-500 text-xs">Solo visibles para el propietario</p>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-600 text-sm">No hay retiros registrados aún.</p>
              <p className="text-zinc-700 text-xs mt-1">Los retiros aparecerán aquí en cuanto los proceses.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(r => (
                <div key={r.id} className="flex items-center justify-between p-4 bg-zinc-950/40 border border-zinc-800/40 rounded-xl hover:border-zinc-700/40 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-950 border border-emerald-900/30 rounded-lg text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">{r.method}</div>
                      <div className="text-zinc-500 text-xs font-mono truncate max-w-[200px]">{r.destination}</div>
                      <div className="text-zinc-600 text-[10px]">{r.date} · {r.ref}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-400 font-bold text-base">€{r.amount.toFixed(2)}</div>
                    <span className="text-[9px] font-bold bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded">
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {history.length > 0 && (
            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-600">
              <span>{history.length} retiro{history.length !== 1 ? 's' : ''} registrado{history.length !== 1 ? 's' : ''}</span>
              <span className="text-emerald-700">
                Total retirado: €{history.reduce((s, r) => s + r.amount, 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

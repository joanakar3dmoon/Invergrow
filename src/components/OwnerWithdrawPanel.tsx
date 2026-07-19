import React, { useState, useEffect } from 'react';
import { Shield, DollarSign, Send, Eye, EyeOff, CheckCircle2, AlertCircle, Clock, CreditCard, Landmark, Wallet } from 'lucide-react';

const OWNER_EMAIL = 'joanlazaro83@gmail.com';
const OWNER_PAYPAL = 'joanlazaro83@gmail.com';
const ADMIN_CODE = 'joan123';

interface WithdrawRecord {
  id: string; date: string; amount: number; method: string;
  destination: string; status: 'COMPLETED' | 'PENDING'; ref: string;
}

interface OwnerWithdrawPanelProps {
  netGains: number; balance: number;
  onWithdraw: (data: { amount: number; description: string; gateway: 'STRIPE' | 'CUSTOM'; reference: string }) => Promise<void>;
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

  useEffect(() => {
    const saved = localStorage.getItem('invergrow_owner_withdrawals');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const handleUnlock = () => {
    if (code === ADMIN_CODE) { setUnlocked(true); setCodeError(''); }
    else setCodeError('Codigo incorrecto. Acceso denegado.');
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return setMsg({ type: 'error', text: 'Introduce un importe valido.' });
    if (amt > netGains + balance) return setMsg({ type: 'error', text: 'Saldo insuficiente.' });
    setIsSubmitting(true); setMsg(null);
    try {
      let destination = '';
      let methodLabel = '';
      if (method === 'paypal') { destination = paypalEmail; methodLabel = 'PayPal'; }
      else if (method === 'card') { destination = `**** ${cardNumber.slice(-4)}`; methodLabel = 'Tarjeta debito'; }
      else { destination = iban; methodLabel = 'Transferencia bancaria'; }
      const ref = `OWNER-${Date.now()}`;
      await onWithdraw({ amount: amt, description: `Retiro propietario via ${methodLabel} a ${destination}`, gateway: 'CUSTOM', reference: ref });
      const record: WithdrawRecord = { id: ref, date: new Date().toLocaleDateString('es-ES'), amount: amt, method: methodLabel, destination, status: 'COMPLETED', ref };
      const updated = [record, ...history];
      setHistory(updated);
      localStorage.setItem('invergrow_owner_withdrawals', JSON.stringify(updated));
      setMsg({ type: 'success', text: `Retiro de ${amt.toFixed(2)} EUR procesado via ${methodLabel}` });
      setAmount('');
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Error al procesar.' });
    } finally { setIsSubmitting(false); }
  };

  if (!unlocked) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md mx-auto">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center">
            <Shield className="w-7 h-7 text-emerald-400" />
          </div>
          <div className="text-center">
            <h2 className="text-white font-bold text-xl">Acceso Propietario</h2>
            <p className="text-zinc-500 text-sm mt-1">Panel exclusivo de retiros</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="relative">
            <input type={showCode ? 'text' : 'password'} value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleUnlock()} placeholder="Codigo de acceso" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 pr-12" />
            <button onClick={() => setShowCode(!showCode)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
              {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {codeError && <div className="flex items-center gap-2 text-red-400 text-sm"><AlertCircle className="w-4 h-4" />{codeError}</div>}
          <button onClick={handleUnlock} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />Acceder al Panel
          </button>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-4">Solo el propietario · {OWNER_EMAIL}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-emerald-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-emerald-400" /></div>
            <div><h2 className="text-white font-bold text-lg">Panel del Propietario</h2><p className="text-zinc-400 text-xs">Retiros exclusivos · {OWNER_EMAIL}</p></div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Disponible para retirar</div>
            <div className="text-emerald-400 font-bold text-2xl">EUR {(netGains + balance).toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-zinc-800/60 rounded-xl p-3"><div className="text-xs text-zinc-500 mb-1">Ganancias netas IA</div><div className="text-emerald-400 font-bold">EUR {netGains.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div></div>
          <div className="bg-zinc-800/60 rounded-xl p-3"><div className="text-xs text-zinc-500 mb-1">Saldo general</div><div className="text-white font-bold">EUR {balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</div></div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-5">
        <h3 className="text-white font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" />Nuevo Retiro</h3>
        <div className="grid grid-cols-3 gap-2">
          {([['paypal','PayPal',Wallet],['card','Tarjeta',CreditCard],['bank','Banco',Landmark]] as const).map(([key, label, Icon]) => (
            <button key={key} onClick={() => setMethod(key)} className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${method === key ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
        {method === 'paypal' && (
          <div><label className="text-xs text-zinc-400 mb-1.5 block">Email PayPal destino</label>
            <input type="email" value={paypalEmail} onChange={e => setPaypalEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
            <p className="text-xs text-zinc-600 mt-1">PayPal estandar · Recepcion inmediata</p>
          </div>
        )}
        {method === 'card' && (
          <div className="space-y-3">
            <div><label className="text-xs text-zinc-400 mb-1.5 block">Titular</label><input type="text" value={cardOwner} onChange={e => setCardOwner(e.target.value)} placeholder="Joan Lazaro" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
            <div><label className="text-xs text-zinc-400 mb-1.5 block">Numero de tarjeta</label><input type="text" value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="**** **** **** 1234" maxLength={19} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono" /></div>
            <div><label className="text-xs text-zinc-400 mb-1.5 block">Vencimiento</label><input type="text" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/AA" maxLength={5} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
          </div>
        )}
        {method === 'bank' && (
          <div className="space-y-3">
            <div><label className="text-xs text-zinc-400 mb-1.5 block">Titular de la cuenta</label><input type="text" value={bankOwner} onChange={e => setBankOwner(e.target.value)} placeholder="Joan Lazaro" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" /></div>
            <div><label className="text-xs text-zinc-400 mb-1.5 block">IBAN</label><input type="text" value={iban} onChange={e => setIban(e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 font-mono" /></div>
            <p className="text-xs text-zinc-600">Transferencia SEPA · 1-2 dias habiles</p>
          </div>
        )}
        <div><label className="text-xs text-zinc-400 mb-1.5 block">Importe a retirar (EUR)</label>
          <div className="flex gap-2">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" min="1" step="0.01" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500" />
            <button onClick={() => setAmount((netGains + balance).toFixed(2))} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs px-3 rounded-xl transition-all font-medium">MAX</button>
          </div>
        </div>
        {msg && (
          <div className={`flex items-center gap-2 text-sm p-3 rounded-xl ${msg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}
          </div>
        )}
        <button onClick={handleWithdraw} disabled={isSubmitting || !amount} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2">
          {isSubmitting ? <>Procesando...</> : <><Send className="w-4 h-4" />Retirar {amount ? `${parseFloat(amount).toFixed(2)} EUR` : ''} ahora</>}
        </button>
      </div>

      {history.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-400" />Historial de retiros</h3>
          <div className="space-y-2">
            {history.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                <div><div className="text-white text-sm font-medium">{r.method}</div><div className="text-zinc-500 text-xs">{r.destination} · {r.date}</div></div>
                <div className="text-right"><div className="text-emerald-400 font-bold">{r.amount.toFixed(2)} EUR</div><div className="text-xs text-emerald-600">{r.status}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

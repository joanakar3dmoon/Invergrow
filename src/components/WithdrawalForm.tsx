import React, { useState } from 'react';
import { Send, ShieldCheck } from 'lucide-react';

interface WithdrawalFormProps {
  onWithdraw: (data: { amount: number; description: string; gateway: 'STRIPE' | 'CUSTOM'; reference: string }) => Promise<void>;
  balance: number;
}

export default function WithdrawalForm({ onWithdraw, balance }: WithdrawalFormProps) {
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const amtNum = parseFloat(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setErrorMsg('Introduce un importe válido.');
      return;
    }
    if (amtNum > balance) {
      setErrorMsg(`Saldo insuficiente (disponible: €${balance.toFixed(2)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const ref = `WD-${Date.now()}`;
      await onWithdraw({ amount: amtNum, description: `Retiro PayPal €${amtNum.toFixed(2)}`, gateway: 'CUSTOM', reference: ref });
      setSuccessMsg(`✅ Solicitud enviada. Recibirás €${amtNum.toFixed(2)} en joanlazaro83@gmail.com`);
      setAmount('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error procesando el retiro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-2.5 mb-6 border-b border-zinc-800 pb-4">
        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
          <Send className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-zinc-100">Retirar a PayPal</h3>
          <p className="text-xs text-zinc-400">Los fondos se envían a joanlazaro83@gmail.com</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Cantidad a retirar (€)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold">€</span>
            <input
              type="number"
              min="1"
              step="0.01"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-lg text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1">Saldo disponible: <span className="text-emerald-400 font-semibold">€{balance.toFixed(2)}</span></p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">{errorMsg}</div>
        )}
        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-emerald-400 text-sm">{successMsg}</div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !amount}
          className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl transition-all shadow-lg"
        >
          <Send className="w-4 h-4" />
          {isSubmitting ? 'Procesando...' : 'Retirar a PayPal'}
        </button>
      </form>

      <div className="mt-4 flex items-center gap-2 p-3 bg-zinc-950/50 border border-zinc-800/60 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-[10px] text-zinc-500">
          El pago se procesa automáticamente vía PayPal. Si hay algún problema recibirás un email con los detalles.
        </span>
      </div>
    </div>
  );
}

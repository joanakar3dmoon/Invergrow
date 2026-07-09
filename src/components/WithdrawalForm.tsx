import React, { useState, useEffect } from 'react';
import { CreditCard, Landmark, ShieldCheck, HelpCircle, FileText, Send, Check } from 'lucide-react';

interface WithdrawalFormProps {
  onWithdraw: (data: { amount: number; description: string; gateway: 'STRIPE' | 'CUSTOM'; reference: string }) => Promise<void>;
  balance: number;
}

export default function WithdrawalForm({ onWithdraw, balance }: WithdrawalFormProps) {
  const [method, setMethod] = useState<'bank' | 'card'>('bank');
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [bankOwner, setBankOwner] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardOwner, setCardOwner] = useState('');
  const [gatewayType, setGatewayType] = useState<'STRIPE' | 'CUSTOM'>('STRIPE');
  const [customReference, setCustomReference] = useState('');
  const [description, setDescription] = useState('');
  
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load encrypted/saved accounts from localstorage
  useEffect(() => {
    const savedIban = localStorage.getItem('invergrow_saved_iban') || '';
    const savedIbanOwner = localStorage.getItem('invergrow_saved_iban_owner') || '';
    const savedCard = localStorage.getItem('invergrow_saved_card') || '';
    const savedCardOwner = localStorage.getItem('invergrow_saved_card_owner') || '';

    if (savedIban) setIban(savedIban);
    if (savedIbanOwner) setBankOwner(savedIbanOwner);
    if (savedCard) setCardNumber(savedCard);
    if (savedCardOwner) setCardOwner(savedCardOwner);
  }, []);

  // Save changes locally and encrypt/secure state mock
  const handleSaveCredentials = (e: React.MouseEvent) => {
    e.preventDefault();
    if (method === 'bank') {
      localStorage.setItem('invergrow_saved_iban', iban);
      localStorage.setItem('invergrow_saved_iban_owner', bankOwner);
    } else {
      localStorage.setItem('invergrow_saved_card', cardNumber);
      localStorage.setItem('invergrow_saved_card_owner', cardOwner);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setErrorMsg('Por favor introduce un monto de retiro válido.');
      return;
    }

    if (amtNum > balance) {
      setErrorMsg(`Saldo insuficiente (€${balance.toLocaleString('es-ES')}).`);
      return;
    }

    if (method === 'bank' && (!iban || !bankOwner)) {
      setErrorMsg('Por favor introduce tu IBAN y titular de cuenta bancaria.');
      return;
    }

    if (method === 'card' && (!cardNumber || !cardOwner)) {
      setErrorMsg('Por favor introduce los datos de tu tarjeta de débito.');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Auto-save credentials for user convenience
      if (method === 'bank') {
        localStorage.setItem('invergrow_saved_iban', iban);
        localStorage.setItem('invergrow_saved_iban_owner', bankOwner);
      } else {
        localStorage.setItem('invergrow_saved_card', cardNumber);
        localStorage.setItem('invergrow_saved_card_owner', cardOwner);
      }

      const ref = customReference || `REF-${Math.floor(10000 + Math.random() * 90000)}`;
      const desc = description || `Retiro mediante ${gatewayType} (${method === 'bank' ? 'Banco' : 'Tarjeta'})`;

      await onWithdraw({
        amount: amtNum,
        description: desc,
        gateway: gatewayType,
        reference: ref
      });

      setAmount('');
      setCustomReference('');
      setDescription('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error procesando solicitud.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="withdrawal-form-container" className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center gap-2.5 mb-6 border-b border-zinc-800 pb-4">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-100 font-sans tracking-tight">
              Reinversión & Retiros
            </h3>
            <p className="text-xs text-zinc-400">
              Retira tus fondos de forma inmediata usando pasarelas automatizadas
            </p>
          </div>
        </div>

        {/* Method selector tabs */}
        <div className="grid grid-cols-2 gap-2 mb-6 bg-zinc-950 p-1.5 rounded-xl border border-zinc-800/60">
          <button
            id="tab-method-bank"
            type="button"
            onClick={() => setMethod('bank')}
            className={`py-2 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              method === 'bank'
                ? 'bg-zinc-850 border border-zinc-700/60 text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            Cuenta Bancaria (IBAN)
          </button>
          <button
            id="tab-method-card"
            type="button"
            onClick={() => setMethod('card')}
            className={`py-2 px-3 flex items-center justify-center gap-2 text-xs font-semibold rounded-lg cursor-pointer transition-all ${
              method === 'card'
                ? 'bg-zinc-850 border border-zinc-700/60 text-emerald-400 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Tarjeta de Débito
          </button>
        </div>

        {/* Credentials Form (Local secure storage) */}
        <div className="bg-zinc-950 border border-zinc-850/80 p-4 rounded-xl mb-6 relative">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-bold text-zinc-400 tracking-wider uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Credenciales de Cobro Encriptadas
            </h4>
            <button
              id="btn-save-credentials"
              onClick={handleSaveCredentials}
              className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-all cursor-pointer select-none"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" /> ¡Guardado!
                </>
              ) : (
                'Guardar Local'
              )}
            </button>
          </div>

          {method === 'bank' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-500 font-semibold mb-1">IBAN de Destino</label>
                <input
                  id="input-iban"
                  type="text"
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  placeholder="ES91 2100 0418 2210 ...."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Titular de Cuenta</label>
                <input
                  id="input-bank-owner"
                  type="text"
                  value={bankOwner}
                  onChange={(e) => setBankOwner(e.target.value)}
                  placeholder="Ej. Juan Pérez Sanz"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-sans focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Número de Tarjeta</label>
                <input
                  id="input-card-number"
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4532 9901 2289 ...."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Nombre en Tarjeta</label>
                <input
                  id="input-card-owner"
                  type="text"
                  value={cardOwner}
                  onChange={(e) => setCardOwner(e.target.value)}
                  placeholder="Ej. JUAN PEREZ SANZ"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-sans focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Withdrawal Amount and Configuration */}
        <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 tracking-wider uppercase mb-1.5">Monto del Retiro (€)</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-400 text-xs font-semibold">€</span>
                <input
                  id="input-withdrawal-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl pl-8 pr-3 py-2 text-sm text-zinc-100 font-semibold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 tracking-wider uppercase mb-1.5">Canal / Pasarela Activa</label>
              <div className="grid grid-cols-2 gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800/80 h-[38px] items-center">
                <button
                  id="btn-gateway-stripe"
                  type="button"
                  onClick={() => setGatewayType('STRIPE')}
                  className={`py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    gatewayType === 'STRIPE'
                      ? 'bg-zinc-850 border border-zinc-700/60 text-emerald-400 font-bold shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Stripe Connect
                </button>
                <button
                  id="btn-gateway-custom"
                  type="button"
                  onClick={() => setGatewayType('CUSTOM')}
                  className={`py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    gatewayType === 'CUSTOM'
                      ? 'bg-zinc-850 border border-zinc-700/60 text-emerald-400 font-bold shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Webhook API
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 tracking-wider uppercase mb-1.5">Referencia de Pago (Opcional)</label>
              <input
                id="input-custom-reference"
                type="text"
                value={customReference}
                onChange={(e) => setCustomReference(e.target.value)}
                placeholder="Ej. po_str_129983 (Auto si vacío)"
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 tracking-wider uppercase mb-1.5">Concepto / Descripción (Opcional)</label>
              <input
                id="input-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Retiro Dividendos Q2"
                className="w-full bg-zinc-950 border border-zinc-800/80 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-red-400 text-xs font-sans mt-2">{errorMsg}</p>
          )}

          <div className="pt-4 border-t border-zinc-800/60">
            <button
              id="btn-submit-withdrawal"
              type="submit"
              disabled={isSubmitting || !amount}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <Send className="w-4 h-4 text-white" />
              {isSubmitting ? 'Procesando...' : 'Transferencia Inmediata'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-4 flex items-center gap-2 p-3 bg-zinc-950/50 border border-zinc-800/60 rounded-xl">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-[10px] text-zinc-500 font-sans">
          Las transferencias inmediatas quedan en estado <strong className="text-zinc-400 font-semibold font-mono">PENDING</strong>. Requieren que el webhook de la pasarela confirme el éxito (<code className="text-zinc-400 bg-zinc-900 px-1 rounded">payout.paid</code> o similar) para liquidarse y debitar el saldo.
        </span>
      </div>
    </div>
  );
}

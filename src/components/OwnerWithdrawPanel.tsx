import React, { useState, useEffect, useCallback } from 'react';
import { Shield, DollarSign, TrendingUp, Send, RefreshCw, Plus, CheckCircle2, AlertCircle, ArrowUpRight, Wallet, RotateCcw, List } from 'lucide-react';

const ADMIN_CODE = 'joan123';
const API = '';

interface StateData { balance: number; investedCapital: number; totalWithdrawals: number; netGains: number; transactions: any[]; withdrawals: any[]; income: any[]; }

export default function OwnerWithdrawPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [tab, setTab] = useState<'overview'|'withdraw'|'income'|'reinvest'>('overview');
  const [data, setData] = useState<StateData>({ balance: 0, investedCapital: 0, totalWithdrawals: 0, netGains: 0, transactions: [], withdrawals: [], income: [] });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [wAmount, setWAmount] = useState('');
  const [wDest, setWDest] = useState('joanlazaro83@gmail.com');
  const [wMethod, setWMethod] = useState('paypal');
  const [wNotes, setWNotes] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [iAmount, setIAmount] = useState('');
  const [iSource, setISource] = useState('AdMob');
  const [iDesc, setIDesc] = useState('');
  const [reinvPct, setReinvPct] = useState(70);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/data`);
      const d = await r.json();
      setData(d);
    } catch {}
  }, []);

  useEffect(() => { if (unlocked) fetchData(); }, [unlocked, fetchData]);

  const unlock = () => {
    if (codeInput === ADMIN_CODE) {
      setUnlocked(true);
      setMsg({ text: 'Acceso concedido', ok: true });
    } else {
      setMsg({ text: 'Codigo incorrecto', ok: false });
    }
  };

  const showMsg = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 5000); };

  const doWithdraw = async () => {
    if (!wAmount || parseFloat(wAmount) <= 0) return showMsg('Introduce un importe valido', false);
    setLoading(true);
    try {
      // Build the correct body fields based on method
      const body: any = { amount: parseFloat(wAmount), method: wMethod, adminCode: ADMIN_CODE };
      if (wMethod === 'paypal') {
        body.paypalEmail = wDest;
      } else if (wMethod === 'tarjeta') {
        body.cardNumber = wDest;
        body.description = wNotes || `Retiro a tarjeta ${wDest.slice(0,4)}...${wDest.slice(-4)}`;
      } else if (wMethod === 'bizum') {
        body.phoneNumber = wDest;
        body.description = wNotes || `Bizum al ${wDest}`;
      } else if (wMethod === 'revolut') {
        body.revolutAlias = wDest;
        body.description = wNotes || `Revolut a ${wDest}`;
      } else if (wMethod === 'bank') {
        body.iban = wDest;
        body.accountHolder = accountHolder || wNotes || 'Titular';
        body.description = `Transferencia al IBAN ${wDest.slice(0,4)}...${wDest.slice(-4)}`;
      } else if (wMethod === 'crypto') {
        body.description = wNotes || `Cripto a ${wDest.slice(0,8)}...`;
      } else {
        body.description = wNotes || `Retiro ${wMethod}`;
      }
      if (!body.description) body.description = wNotes || `Retiro ${wMethod}`;

      const r = await fetch(`${API}/api/withdraw`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (d.success) {
        showMsg(d.message || `Retiro EUR${wAmount} procesado`, true);
        setWAmount('');
        fetchData();
      } else showMsg(d.error || 'Error en retiro', false);
    } catch { showMsg('Error de conexion', false); }
    setLoading(false);
  };

  const doIncome = async () => {
    if (!iAmount || parseFloat(iAmount) <= 0) return showMsg('Introduce un importe valido', false);
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/income`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(iAmount), source: iSource, description: iDesc })
      });
      const d = await r.json();
      if (d.success) {
        showMsg(`EUR${iAmount} registrado de ${iSource}`, true);
        setIAmount(''); setIDesc('');
        fetchData();
      } else showMsg(d.error || 'Error al registrar ingreso', false);
    } catch { showMsg('Error de conexion', false); }
    setLoading(false);
  };

  const doReinvest = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/reinvest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCode: ADMIN_CODE, percentage: reinvPct })
      });
      const d = await r.json();
      if (d.success) { showMsg(d.message, true); fetchData(); }
      else showMsg(d.error || 'Error en reinversion', false);
    } catch { showMsg('Error de conexion', false); }
    setLoading(false);
  };

  if (!unlocked) {
    return (
      <div className="flex flex-col items-center gap-5 py-16">
        <div className="w-20 h-20 rounded-full bg-yellow-400/10 flex items-center justify-center">
          <Shield className="w-10 h-10 text-yellow-400" />
        </div>
        <h2 className="text-2xl font-bold text-white">Panel Propietario</h2>
        <p className="text-zinc-500 text-base text-center max-w-sm">Introduce el código de administrador para gestionar retiros e ingresos reales.</p>
        <input type="password" value={codeInput} onChange={e => setCodeInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && unlock()}
          placeholder="Código de acceso"
          className="w-full max-w-xs bg-zinc-800 text-white rounded-xl px-5 py-4 border border-zinc-700 focus:outline-none focus:border-yellow-400 text-center text-xl tracking-widest" />
        {msg && <p className={`text-base text-center ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
        <button onClick={unlock} className="bg-yellow-400 text-black font-bold py-4 px-10 rounded-xl text-lg">Entrar</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold flex items-center gap-2 text-white">
          <Shield className="w-5 h-5 text-yellow-400" /> Panel Propietario
        </h3>
        <button onClick={fetchData} className="text-zinc-400 hover:text-white"><RefreshCw className="w-5 h-5" /></button>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-2 text-base ${
          msg.ok ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'
        }`}>
          {msg.ok ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}{msg.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-zinc-500 text-sm mb-2">Saldo disponible</p>
          <p className="text-3xl font-bold text-green-400">EUR{data.balance.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-zinc-500 text-sm mb-2">Capital invertido</p>
          <p className="text-3xl font-bold text-blue-400">EUR{data.investedCapital.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-zinc-500 text-sm mb-2">Total retirado</p>
          <p className="text-2xl font-bold text-yellow-400">EUR{data.totalWithdrawals.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-5 border border-zinc-800">
          <p className="text-zinc-500 text-sm mb-2">Ganancias netas</p>
          <p className="text-2xl font-bold text-purple-400">EUR{data.netGains.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['overview','withdraw','income','reinvest'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 rounded-xl text-base font-medium whitespace-nowrap transition-all ${
              tab===t ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}>
            {t==='overview'?'Historial':t==='withdraw'?'Retirar':t==='income'?'Registrar ingreso':'Bot reinversión'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-zinc-400 mb-3 flex items-center gap-2">
            <List className="w-5 h-5"/>Últimas transacciones
          </h3>
          {data.transactions.length === 0 && <p className="text-zinc-600 text-base text-center py-8">Sin transacciones aún.</p>}
          {data.transactions.map((tx: any) => (
            <div key={tx.id} className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-white truncate">{tx.description}</p>
                <p className="text-sm text-zinc-500">{tx.date} · {tx.reference}</p>
              </div>
              <span className={`text-base font-bold ml-3 ${tx.type==='DEPOSIT'||tx.type==='AI_REINVEST'?'text-green-400':'text-red-400'}`}>
                {tx.type==='WITHDRAWAL'?'-':'+'} EUR{parseFloat(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="w-5 h-5 text-yellow-400"/>Retirar fondos reales
          </h3>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">Importe (EUR)</label>
            <input type="number" value={wAmount} onChange={e=>setWAmount(e.target.value)}
              placeholder="0.00" className="w-full bg-zinc-800 text-white rounded-xl px-5 py-4 text-lg border border-zinc-700 focus:outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">Método</label>
            <select value={wMethod} onChange={e=>setWMethod(e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-xl px-5 py-4 text-lg border border-zinc-700">
              <option value="paypal">PayPal</option>
              <option value="bizum">Bizum</option>
              <option value="revolut">Revolut</option>
              <option value="bank">Transferencia bancaria</option>
              <option value="crypto">Cripto</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">
              {wMethod === 'bizum' ? 'Número de teléfono' :
               wMethod === 'revolut' ? 'Email Revolut / alias' :
               wMethod === 'tarjeta' ? 'Número de tarjeta' :
               wMethod === 'crypto' ? 'Dirección de wallet' :
               wMethod === 'bank' ? 'IBAN / datos bancarios' :
               'Email de PayPal'}
            </label>
            <input type="text" value={wDest} onChange={e=>setWDest(e.target.value)}
              placeholder={wMethod === 'bizum' ? '+34 6XX XXX XXX' :
                wMethod === 'revolut' ? 'email@revolut.me' :
                wMethod === 'tarjeta' ? 'XXXX XXXX XXXX XXXX' :
                wMethod === 'crypto' ? '0x... / bc1...' :
                wMethod === 'bank' ? 'ESXX XXXX XXXX XXXX XXXX XXXX' :
                'Email de PayPal'}
              className="w-full bg-zinc-800 text-white rounded-xl px-5 py-4 text-lg border border-zinc-700 focus:outline-none focus:border-yellow-400" />
          </div>
          {wMethod === 'tarjeta' && (
            <div className="text-sm text-yellow-300 bg-yellow-950/30 rounded-xl p-4">
              No introduzcas CVV ni fecha de caducidad aquí. Este panel no está conectado a un proveedor push-to-card y no debe almacenar datos completos de tarjeta.
            </div>
          )}
          {wMethod === 'bank' && (
            <div>
              <label className="text-sm text-zinc-500 mb-2 block">Nombre del titular</label>
              <input type="text" value={accountHolder} onChange={e=>setAccountHolder(e.target.value)}
                placeholder="Tu nombre completo"
                className="w-full bg-zinc-800 text-white rounded-xl px-5 py-4 text-lg border border-zinc-700 focus:outline-none focus:border-yellow-400" />
            </div>
          )}
          {wMethod !== 'paypal' && (
            <div className="text-sm text-zinc-500 bg-zinc-800 rounded-xl p-4 border border-yellow-400/20">
              <span className="text-yellow-400">⚠️ Procesamiento manual:</span> los retiros por {wMethod === 'bizum' ? 'Bizum' : wMethod === 'revolut' ? 'Revolut' : wMethod === 'tarjeta' ? 'tarjeta de débito' : wMethod} se registran para ejecución manual por el administrador. El saldo se descuenta automáticamente.
            </div>
          )}
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">Notas (opcional)</label>
            <input type="text" value={wNotes} onChange={e=>setWNotes(e.target.value)}
              placeholder={wMethod === 'bizum' ? 'Nombre titular Bizum...' :
                wMethod === 'revolut' ? 'Nombre del titular...' :
                wMethod === 'tarjeta' ? 'Nombre en la tarjeta...' :
                'Motivo del retiro...'}
              className="w-full bg-zinc-800 text-white rounded-xl px-5 py-4 text-lg border border-zinc-700" />
          </div>
          <div className="text-sm text-zinc-500 bg-zinc-800 rounded-xl p-4">
            Saldo disponible: <span className="text-green-400 font-bold text-lg">EUR{data.balance.toFixed(2)}</span>
          </div>
          <button onClick={doWithdraw} disabled={loading}
            className="w-full bg-yellow-400 text-black font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            <Send className="w-5 h-5"/>{loading?'Procesando...':'Ejecutar retiro real'}
          </button>
        </div>
      )}

      {tab === 'income' && (
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400"/>Registrar ingreso real
          </h3>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">Importe (EUR)</label>
            <input type="number" value={iAmount} onChange={e=>setIAmount(e.target.value)}
              placeholder="0.00" className="w-full bg-zinc-800 text-white rounded-xl px-5 py-4 text-lg border border-zinc-700 focus:outline-none focus:border-green-400" />
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">Fuente</label>
            <select value={iSource} onChange={e=>setISource(e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-xl px-5 py-4 text-lg border border-zinc-700">
              <option>AdMob</option>
              <option>Amazon Afiliados</option>
              <option>Stripe</option>
              <option>PayPal</option>
              <option>Transferencia</option>
              <option>Otro</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">Descripción (opcional)</label>
            <input type="text" value={iDesc} onChange={e=>setIDesc(e.target.value)}
              placeholder="Pago AdMob julio..." className="w-full bg-zinc-800 text-white rounded-xl px-5 py-4 text-lg border border-zinc-700" />
          </div>
          <button onClick={doIncome} disabled={loading}
            className="w-full bg-green-500 text-black font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            <ArrowUpRight className="w-5 h-5"/>{loading?'Registrando...':'Registrar ingreso'}
          </button>
        </div>
      )}

      {tab === 'reinvest' && (
        <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-5">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-blue-400"/>Bot de reinversión
          </h3>
          <div className="bg-zinc-800 rounded-xl p-5 text-base space-y-3">
            <div className="flex justify-between"><span className="text-zinc-400">Saldo disponible</span><span className="text-green-400 font-bold text-lg">EUR{data.balance.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Capital invertido</span><span className="text-blue-400 font-bold text-lg">EUR{data.investedCapital.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Rentabilidad estimada/mes</span><span className="text-purple-400 font-bold text-lg">EUR{(data.investedCapital * 0.124 / 12).toFixed(2)}</span></div>
          </div>
          <div>
            <label className="text-sm text-zinc-500 mb-2 block">
              Porcentaje a reinvertir: <span className="text-white font-bold text-lg">{reinvPct}%</span>
            </label>
            <input type="range" min={10} max={100} step={10} value={reinvPct} onChange={e=>setReinvPct(parseInt(e.target.value))} className="w-full h-2" />
          </div>
          <div className="text-sm text-zinc-500 bg-zinc-800 rounded-xl p-4">
            Se moverán <span className="text-yellow-400 font-bold text-lg">EUR{(data.balance * reinvPct / 100).toFixed(2)}</span> de tu saldo disponible a capital invertido.
          </div>
          <button onClick={doReinvest} disabled={loading || data.balance <= 0}
            className="w-full bg-blue-500 text-black font-bold py-4 rounded-xl text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            <TrendingUp className="w-5 h-5"/>{loading?'Procesando...':'Ejecutar reinversión'}
          </button>
          <p className="text-sm text-zinc-600 text-center">El capital invertido acumula rentabilidad estimada del 12.4% anual</p>
        </div>
      )}
    </div>
  );
}
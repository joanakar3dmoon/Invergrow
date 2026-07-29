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
      const r = await fetch(`${API}/api/withdraw`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(wAmount), method: wMethod, destination: wDest, notes: wNotes, adminCode: ADMIN_CODE })
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
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-yellow-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Panel Propietario</h2>
        <p className="text-zinc-500 text-sm text-center">Introduce el codigo de administrador para gestionar retiros e ingresos reales.</p>
        <input type="password" value={codeInput} onChange={e => setCodeInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && unlock()}
          placeholder="Codigo de acceso"
          className="w-full max-w-xs bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700 focus:outline-none focus:border-yellow-400 text-center text-lg tracking-widest" />
        {msg && <p className={`text-sm text-center ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>{msg.text}</p>}
        <button onClick={unlock} className="bg-yellow-400 text-black font-bold py-3 px-8 rounded-xl">Entrar</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2 text-white">
          <Shield className="w-4 h-4 text-yellow-400" /> Panel Propietario
        </h3>
        <button onClick={fetchData} className="text-zinc-400 hover:text-white"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
          msg.ok ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'
        }`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-zinc-500 text-xs mb-1">Saldo disponible</p>
          <p className="text-2xl font-bold text-green-400">EUR{data.balance.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-zinc-500 text-xs mb-1">Capital invertido</p>
          <p className="text-2xl font-bold text-blue-400">EUR{data.investedCapital.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-zinc-500 text-xs mb-1">Total retirado</p>
          <p className="text-xl font-bold text-yellow-400">EUR{data.totalWithdrawals.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <p className="text-zinc-500 text-xs mb-1">Ganancias netas</p>
          <p className="text-xl font-bold text-purple-400">EUR{data.netGains.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['overview','withdraw','income','reinvest'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab===t ? 'bg-yellow-400 text-black' : 'bg-zinc-800 text-zinc-400 hover:text-white'
            }`}>
            {t==='overview'?'Historial':t==='withdraw'?'Retirar':t==='income'?'Registrar ingreso':'Bot reinversion'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
            <List className="w-4 h-4"/>Ultimas transacciones
          </h3>
          {data.transactions.length === 0 && <p className="text-zinc-600 text-sm text-center py-8">Sin transacciones aun.</p>}
          {data.transactions.map((tx: any) => (
            <div key={tx.id} className="bg-zinc-900 rounded-xl p-3 border border-zinc-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{tx.description}</p>
                <p className="text-xs text-zinc-500">{tx.date} · {tx.reference}</p>
              </div>
              <span className={`text-sm font-bold ${tx.type==='DEPOSIT'||tx.type==='AI_REINVEST'?'text-green-400':'text-red-400'}`}>
                {tx.type==='WITHDRAWAL'?'-':'+'} EUR{parseFloat(tx.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'withdraw' && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-yellow-400"/>Retirar fondos reales
          </h3>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Importe (EUR)</label>
            <input type="number" value={wAmount} onChange={e=>setWAmount(e.target.value)}
              placeholder="0.00" className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700 focus:outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Metodo</label>
            <select value={wMethod} onChange={e=>setWMethod(e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700">
              <option value="paypal">PayPal</option>
              <option value="bizum">Bizum</option>
              <option value="revolut">Revolut</option>
              <option value="tarjeta">Tarjeta de débito</option>
              <option value="bank">Transferencia bancaria</option>
              <option value="crypto">Cripto</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">
              {wMethod === 'bizum' ? 'Número de teléfono' :
               wMethod === 'revolut' ? 'Email Revolut / alias' :
               wMethod === 'tarjeta' ? 'Número de tarjeta' :
               wMethod === 'crypto' ? 'Dirección de wallet' :
               wMethod === 'bank' ? 'IBAN / datos bancarios' :
               'Email PayPal'}
            </label>
            <input type="text" value={wDest} onChange={e=>setWDest(e.target.value)}
              placeholder={wMethod === 'bizum' ? '+34 6XX XXX XXX' :
                wMethod === 'revolut' ? 'email@revolut.me' :
                wMethod === 'tarjeta' ? 'XXXX XXXX XXXX XXXX' :
                wMethod === 'crypto' ? '0x... / bc1...' :
                wMethod === 'bank' ? 'ESXX XXXX XXXX XXXX XXXX XXXX' :
                'Email de PayPal'}
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700 focus:outline-none focus:border-yellow-400" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Notas (opcional)</label>
            <input type="text" value={wNotes} onChange={e=>setWNotes(e.target.value)}
              placeholder={wMethod === 'bizum' ? 'Nombre titular Bizum...' :
                wMethod === 'revolut' ? 'Nombre del titular...' :
                wMethod === 'tarjeta' ? 'Nombre en la tarjeta...' :
                'Motivo del retiro...'}
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700" />
          </div>
          {wMethod !== 'paypal' && (
            <div className="text-xs text-zinc-500 bg-zinc-800 rounded-xl p-3 border border-yellow-400/20">
              <span className="text-yellow-400">⚠️ Procesamiento manual:</span> los retiros por {wMethod === 'bizum' ? 'Bizum' : wMethod === 'revolut' ? 'Revolut' : wMethod === 'tarjeta' ? 'tarjeta de débito' : wMethod} se registran para ejecución manual por el administrador. El saldo se descuenta automáticamente.
            </div>
          )}
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Notas (opcional)</label>
            <input type="text" value={wNotes} onChange={e=>setWNotes(e.target.value)}
              placeholder="Retiro mensual..." className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700" />
          </div>
          <div className="text-xs text-zinc-500 bg-zinc-800 rounded-xl p-3">
            Saldo disponible: <span className="text-green-400 font-bold">EUR{data.balance.toFixed(2)}</span>
          </div>
          <button onClick={doWithdraw} disabled={loading}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            <Send className="w-4 h-4"/>{loading?'Procesando...':'Ejecutar retiro real'}
          </button>
        </div>
      )}

      {tab === 'income' && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4 text-green-400"/>Registrar ingreso real
          </h3>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Importe (EUR)</label>
            <input type="number" value={iAmount} onChange={e=>setIAmount(e.target.value)}
              placeholder="0.00" className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700 focus:outline-none focus:border-green-400" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Fuente</label>
            <select value={iSource} onChange={e=>setISource(e.target.value)}
              className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700">
              <option>AdMob</option>
              <option>Amazon Afiliados</option>
              <option>Stripe</option>
              <option>PayPal</option>
              <option>Transferencia</option>
              <option>Otro</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Descripcion (opcional)</label>
            <input type="text" value={iDesc} onChange={e=>setIDesc(e.target.value)}
              placeholder="Pago AdMob julio..." className="w-full bg-zinc-800 text-white rounded-xl px-4 py-3 border border-zinc-700" />
          </div>
          <button onClick={doIncome} disabled={loading}
            className="w-full bg-green-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            <ArrowUpRight className="w-4 h-4"/>{loading?'Registrando...':'Registrar ingreso'}
          </button>
        </div>
      )}

      {tab === 'reinvest' && (
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-blue-400"/>Bot de reinversion
          </h3>
          <div className="bg-zinc-800 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between"><span className="text-zinc-400">Saldo disponible</span><span className="text-green-400 font-bold">EUR{data.balance.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Capital invertido</span><span className="text-blue-400 font-bold">EUR{data.investedCapital.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Rentabilidad estimada/mes</span><span className="text-purple-400 font-bold">EUR{(data.investedCapital * 0.124 / 12).toFixed(2)}</span></div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">
              Porcentaje a reinvertir: <span className="text-white font-bold">{reinvPct}%</span>
            </label>
            <input type="range" min={10} max={100} step={10} value={reinvPct} onChange={e=>setReinvPct(parseInt(e.target.value))} className="w-full" />
          </div>
          <div className="text-xs text-zinc-500 bg-zinc-800 rounded-xl p-3">
            Se moveran <span className="text-yellow-400 font-bold">EUR{(data.balance * reinvPct / 100).toFixed(2)}</span> de tu saldo disponible a capital invertido.
          </div>
          <button onClick={doReinvest} disabled={loading || data.balance <= 0}
            className="w-full bg-blue-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            <TrendingUp className="w-4 h-4"/>{loading?'Procesando...':'Ejecutar reinversion'}
          </button>
          <p className="text-xs text-zinc-600 text-center">El capital invertido acumula rentabilidad estimada del 12.4% anual</p>
        </div>
      )}
    </div>
  );
}
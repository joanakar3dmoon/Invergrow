import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Clock, RefreshCw, Server, Shield, AlertCircle, ArrowUpRight, ArrowDownLeft, Activity, Users, CheckCircle2, ArrowRight, Sparkles, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemState, Transaction, Collaborator, WebhookLog } from './types';
import DownloadCard from './components/DownloadCard';
import WebhookConsole from './components/WebhookConsole';
import CollaboratorsPanel from './components/CollaboratorsPanel';
import WithdrawalForm from './components/WithdrawalForm';
import AIEnginePanel from './components/AIEnginePanel';
import AffiliatePanel from './components/AffiliatePanel';
import OwnerWithdrawPanel from './components/OwnerWithdrawPanel';

export default function App() {
  const [state, setState] = useState<SystemState>({ balance: 15420.50, investedCapital: 42000.00, totalWithdrawals: 2850.00, reinvestmentFund: 350.00, netGains: 185.20, collaborators: [], transactions: [], webhookLogs: [], aiWorkers: [], aiLogs: [], apiConfig: { geminiConnected: false, distributionWebhook: '', targetMarket: '', payoutModel: 'SPLIT_70_30' } });
  const [activeTab, setActiveTab] = useState<'ai' | 'finance' | 'affiliate' | 'owner'>('ai');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => { setStatusMsg({ type, text }); setTimeout(() => setStatusMsg(null), 5000); };

  const fetchState = async (silent = false) => {
    if (!silent) setLoading(true);
    try { const res = await fetch('/api/data'); if (!res.ok) throw new Error('Error recuperando datos.'); const data = await res.json(); setState(data); setError(null); }
    catch (err: any) { console.error(err); setError('No se pudo conectar con el servidor. Reintentando...'); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { fetchState(); const interval = setInterval(() => fetchState(true), 3000); return () => clearInterval(interval); }, []);

  const handleRefresh = async () => { setIsRefreshing(true); await fetchState(); setIsRefreshing(false); showToast('success', 'Panel actualizado.'); };

  const handleWithdraw = async (data: { amount: number; description: string; gateway: 'STRIPE' | 'CUSTOM'; reference: string }) => {
    try {
      const res = await fetch('/api/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error registrando retiro.'); }
      const updated = await res.json(); setState(updated.data);
      showToast('success', `Retiro de EUR${data.amount} solicitado. Ref: ${data.reference}`);
    } catch (err: any) { showToast('error', err.message || 'Error al procesar.'); throw err; }
  };

  const handleAddCollaborator = async (col: { name: string; role: string; wage: number }) => {
    try {
      const res = await fetch('/api/collaborators', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(col) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Error registrando colaborador.'); }
      const updated = await res.json(); setState(updated.data); showToast('success', `Colaborador: ${col.name}.`);
    } catch (err: any) { showToast('error', err.message || 'Error.'); throw err; }
  };

  const handleTriggerPayrollWebhook = async (colId: string, amount: number) => { await handleInjectWebhook({ event: "collaborator_payment_confirmed", collaboratorId: colId, amount }); };

  const handleInjectWebhook = async (payload: any) => {
    try {
      const res = await fetch('/api/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Error de webhook.');
      setState(result.data); showToast('success', `Webhook procesado: ${payload.event || payload.type}`);
    } catch (err: any) { showToast('error', `Fallo Webhook: ${err.message}`); throw err; }
  };

  const handleResetSystem = async () => {
    try { const res = await fetch('/api/reset', { method: 'POST' }); if (!res.ok) throw new Error('Error al restablecer.'); const result = await res.json(); setState(result.data); showToast('success', 'Sistema reseteado.'); }
    catch (err: any) { showToast('error', err.message || 'Error al resetear.'); }
  };

  return (
    <div id="invergrow-dashboard-root" className="min-h-screen bg-black text-zinc-100 font-sans antialiased pb-16">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-lg text-black shadow-lg">IG</div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">InverGrow <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 bg-emerald-950/50 border border-emerald-800/40 rounded-full">v1.2</span></h1>
              <p className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase">Plataforma de Reinversion & Nominas</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="font-mono uppercase tracking-wider text-[10px]">Server: Online</span>
            </div>
            <button onClick={handleRefresh} disabled={isRefreshing} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl cursor-pointer transition-all text-zinc-300">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 space-y-6">
        {error && <div className="p-4 bg-amber-950/20 border border-amber-900/40 text-amber-400 rounded-2xl flex items-center gap-3 text-sm"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>}
        {loading ? (
          <div className="py-24 text-center"><RefreshCw className="w-10 h-10 text-emerald-500 animate-spin mx-auto mb-4" /><p className="text-zinc-400">Cargando...</p></div>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg group hover:border-emerald-500/30 transition-all">
                <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Saldo Disponible</span><div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20"><Wallet className="w-4 h-4" /></div></div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-1">EUR {state.balance.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</h3>
                <p className="text-[11px] text-emerald-400 flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /><span>Sincronizado via API</span></p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg group hover:border-teal-500/30 transition-all">
                <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Capital Reinvertido</span><div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20"><Activity className="w-4 h-4" /></div></div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-1">EUR {state.investedCapital.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</h3>
                <p className="text-[11px] text-zinc-500">Rendimiento anual: <strong className="text-teal-400">12.4% APR</strong></p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg group hover:border-amber-500/30 transition-all">
                <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Retiros Procesados</span><div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20"><ArrowUpRight className="w-4 h-4" /></div></div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-1">EUR {state.totalWithdrawals.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</h3>
                <p className="text-[11px] text-zinc-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /><span>Ultimo retiro: Hace 9 dias</span></p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-2xl relative overflow-hidden shadow-lg group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center justify-between mb-3"><span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Nominas del Equipo</span><div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20"><Users className="w-4 h-4" /></div></div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-1">{state.collaborators.length} Miembros</h3>
                <p className="text-[11px] text-zinc-500">Conciliacion de sueldos automatizada</p>
              </div>
            </section>

            <div className="flex flex-wrap border-b border-zinc-800 gap-6 mt-2 mb-4">
              <button onClick={() => setActiveTab('ai')} className={`pb-3 text-sm font-bold tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${activeTab === 'ai' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" /> Factoria IA</button>
              <button onClick={() => setActiveTab('finance')} className={`pb-3 text-sm font-bold tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${activeTab === 'finance' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><DollarSign className="w-4 h-4 text-emerald-500" /> Finanzas & Nominas</button>
              <button onClick={() => setActiveTab('affiliate')} className={`pb-3 text-sm font-bold tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${activeTab === 'affiliate' ? 'border-orange-500 text-orange-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><ShoppingCart className="w-4 h-4 text-orange-400" /> Afiliados Amazon</button>
              <button onClick={() => setActiveTab('owner')} className={`pb-3 text-sm font-bold tracking-wide transition-all cursor-pointer border-b-2 flex items-center gap-2 ${activeTab === 'owner' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}><Shield className="w-4 h-4 text-emerald-400" /> Panel Propietario</button>
            </div>

            {activeTab === 'ai' ? (
              <AIEnginePanel state={state} onRefresh={handleRefresh} showToast={showToast} setState={setState} />
            ) : activeTab === 'affiliate' ? (
              <AffiliatePanel />
            ) : activeTab === 'owner' ? (
              <OwnerWithdrawPanel netGains={state.netGains} balance={state.balance} onWithdraw={handleWithdraw} />
            ) : (
              <>
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div><h3 className="text-sm font-semibold text-zinc-100">Rendimiento de Re-Inversiones</h3><p className="text-xs text-zinc-500">Cartera diversificada y liquidez historica</p></div>
                        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2 py-0.5 rounded-lg">+15.2% Trimestre</span>
                      </div>
                      <div className="h-44 w-full relative mt-4">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 500 150" preserveAspectRatio="none">
                          <defs><linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity="0.25" /><stop offset="100%" stopColor="#10b981" stopOpacity="0.0" /></linearGradient></defs>
                          <line x1="0" y1="30" x2="500" y2="30" stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
                          <line x1="0" y1="75" x2="500" y2="75" stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
                          <line x1="0" y1="120" x2="500" y2="120" stroke="#27272a" strokeWidth="1" strokeDasharray="3,3" />
                          <path d="M 0 110 C 60 115, 120 70, 180 80 C 240 90, 300 45, 360 40 C 420 35, 460 25, 500 20" fill="none" stroke="#10b981" strokeWidth="3.5" strokeLinecap="round" />
                          <path d="M 0 110 C 60 115, 120 70, 180 80 C 240 90, 300 45, 360 40 C 420 35, 460 25, 500 20 L 500 150 L 0 150 Z" fill="url(#chartGradient)" />
                          <circle cx="180" cy="80" r="5" fill="#10b981" stroke="#09090b" strokeWidth="2" />
                          <circle cx="360" cy="40" r="5" fill="#10b981" stroke="#09090b" strokeWidth="2" />
                          <circle cx="500" cy="20" r="6" fill="#10b981" stroke="#09090b" strokeWidth="2" />
                        </svg>
                        <div className="absolute top-[68px] left-[32%] text-[9px] font-mono text-zinc-400 bg-zinc-950/80 px-1 py-0.5 rounded border border-zinc-800">EUR 12,110</div>
                        <div className="absolute top-[28px] left-[68%] text-[9px] font-mono text-zinc-400 bg-zinc-950/80 px-1 py-0.5 rounded border border-zinc-800">EUR 14,850</div>
                        <div className="absolute top-[8px] right-2 text-[9px] font-mono text-emerald-400 bg-zinc-950/80 px-1.5 py-0.5 rounded border border-emerald-900/50">EUR {state.balance.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-800/60 pt-4 mt-4 text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
                      <span>Mar 2026</span><span>Abr 2026</span><span>May 2026</span><span>Jun 2026</span>
                    </div>
                  </div>
                  <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100 mb-1">Historial de Movimientos</h3>
                      <p className="text-xs text-zinc-500 mb-4">Sincronizacion en vivo con pasarelas</p>
                      <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                        {state.transactions.length === 0 ? (
                          <p className="text-xs text-zinc-500 text-center py-6">No hay transacciones registradas.</p>
                        ) : state.transactions.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-800/40 hover:border-zinc-700/40 transition-all">
                            <div className="flex items-center gap-2.5">
                              <div className={`p-1.5 rounded-lg ${tx.type === 'DEPOSIT' ? 'bg-emerald-950 border border-emerald-900/30 text-emerald-400' : tx.type === 'WITHDRAWAL' ? 'bg-amber-950 border border-amber-900/30 text-amber-400' : 'bg-indigo-950 border border-indigo-900/30 text-indigo-400'}`}>
                                {tx.type === 'DEPOSIT' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <h4 className="text-xs font-semibold text-zinc-200 truncate max-w-[120px]">{tx.description}</h4>
                                  <span className={`px-1.5 text-[8px] font-bold rounded ${tx.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400' : tx.status === 'PENDING' ? 'bg-amber-950 text-amber-400 animate-pulse' : 'bg-red-950 text-red-400'}`}>{tx.status}</span>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-mono block">{tx.date} - {tx.reference}</span>
                              </div>
                            </div>
                            <span className={`text-xs font-bold font-mono ${tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-zinc-200'}`}>{tx.type === 'DEPOSIT' ? '+' : '-'}EUR {tx.amount.toLocaleString('es-ES')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                      <span>Ultimos 15 movimientos</span><span className="flex items-center gap-1"><Shield className="w-3 h-3 text-emerald-400" /> Auditado</span>
                    </div>
                  </div>
                </section>
                <DownloadCard appUrl={window.location.href} />
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <WithdrawalForm onWithdraw={handleWithdraw} balance={state.balance} />
                  <CollaboratorsPanel collaborators={state.collaborators} onAddCollaborator={handleAddCollaborator} onTriggerPayrollWebhook={handleTriggerPayrollWebhook} balance={state.balance} />
                </section>
                <section>
                  <WebhookConsole collaborators={state.collaborators} onInjectWebhook={handleInjectWebhook} webhookLogs={state.webhookLogs} onReset={handleResetSystem} statusMessage={statusMsg} />
                </section>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

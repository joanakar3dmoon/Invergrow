import React, { useState } from 'react';
import { 
  Sparkles, Bot, Cpu, BookOpen, Globe, FileText, Send, 
  Settings, TrendingUp, DollarSign, Wallet, ArrowRight, 
  Terminal, Lock, ArrowUpRight, Zap, RefreshCw, Check, HelpCircle
} from 'lucide-react';
import { SystemState, AIWorker, AILog } from '../types';

interface AIEnginePanelProps {
  state: SystemState;
  onRefresh: () => Promise<void>;
  showToast: (type: 'success' | 'error', text: string) => void;
  setState: React.Dispatch<React.SetStateAction<SystemState>>;
}

export default function AIEnginePanel({ state, onRefresh, showToast, setState }: AIEnginePanelProps) {
  // Local states for forms
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>(state.apiConfig?.distributionWebhook || '');
  const [payoutModel, setPayoutModel] = useState<string>(state.apiConfig?.payoutModel || 'SPLIT_70_30');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  
  // Local state for manual AI generator
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('ai-1');
  const [topic, setTopic] = useState<string>('Inversiones Sostenibles 2026');
  const [customInstructions, setCustomInstructions] = useState<string>('Escribe un post de blog SEO optimizado de 300 palabras sobre tendencias de inversión sostenible y ETFs ecológicos en España.');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [earnedBonus, setEarnedBonus] = useState<number | null>(null);

  // States for worker actions loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Map icon strings to Lucide components
  const getWorkerIcon = (iconName: string) => {
    switch (iconName) {
      case 'FileText': return <FileText className="w-5 h-5" />;
      case 'Cpu': return <Cpu className="w-5 h-5" />;
      case 'BookOpen': return <BookOpen className="w-5 h-5" />;
      case 'Globe': return <Globe className="w-5 h-5" />;
      default: return <Bot className="w-5 h-5" />;
    }
  };

  // 1. Guardar Configuración de APIs
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributionWebhook: webhookUrl,
          payoutModel: payoutModel
        })
      });
      if (!res.ok) throw new Error('Error al guardar configuración de APIs.');
      const result = await res.json();
      setState(result.data);
      showToast('success', 'Configuración de distribución y modelo de reparto IA guardados.');
    } catch (err: any) {
      showToast('error', err.message || 'Error guardando config.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // 2. Desbloquear Trabajador IA
  const handleUnlockWorker = async (workerId: string, cost: number) => {
    if (state.reinvestmentFund < cost) {
      showToast('error', 'Fondo de reinversión insuficiente.');
      return;
    }
    setActionLoading(`unlock-${workerId}`);
    try {
      const res = await fetch('/api/ai/workers/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al contratar bot.');
      }
      const result = await res.json();
      setState(result.data);
      showToast('success', '¡Bot de ingresos pasivos contratado y desplegado con éxito!');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 3. Mejorar Trabajador IA
  const handleUpgradeWorker = async (workerId: string, cost: number) => {
    if (state.reinvestmentFund < cost) {
      showToast('error', 'Fondo de reinversión insuficiente para aplicar optimización.');
      return;
    }
    setActionLoading(`upgrade-${workerId}`);
    try {
      const res = await fetch('/api/ai/workers/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al optimizar bot.');
      }
      const result = await res.json();
      setState(result.data);
      showToast('success', '¡Módulos de red optimizados. Bot subido de nivel!');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 4. Traspasar ganancias a balance retirable principal
  const handleTransferGains = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('error', 'Introduce un importe válido mayor a €0.');
      return;
    }
    if (amount > state.netGains) {
      showToast('error', 'No tienes suficientes Ganancias Netas.');
      return;
    }

    setActionLoading('transfer');
    try {
      const res = await fetch('/api/ai/transfer-earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al realizar el traspaso.');
      }
      const result = await res.json();
      setState(result.data);
      showToast('success', `¡Traspasados €${amount.toFixed(2)} al Saldo Principal retirable!`);
      setTransferAmount('');
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // 5. Ejecutar generación manual de contenido real con Gemini
  const handleGenerateManualAsset = async () => {
    if (!topic.trim() || !customInstructions.trim()) {
      showToast('error', 'Por favor, rellena el tema y las instrucciones de la IA.');
      return;
    }
    setIsGenerating(true);
    setGeneratedResult(null);
    setEarnedBonus(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorkerId,
          topic: topic,
          prompt: customInstructions
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Fallo de procesamiento del modelo Gemini.');
      }
      const result = await res.json();
      setState(result.data);
      setGeneratedResult(result.text);
      setEarnedBonus(result.revenue);
      showToast('success', `¡Activo digital creado! Generados €${result.revenue} por monetización directa.`);
    } catch (err: any) {
      showToast('error', err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate current dynamic passive income rate (euros per minute)
  const currentPassiveRate = state.aiWorkers
    ?.filter(w => w.unlocked && w.status === 'ACTIVE')
    ?.reduce((acc, curr) => {
      const multiplier = 1 + (curr.level - 1) * 0.25;
      return acc + (curr.baseIncomeRate * multiplier);
    }, 0) || 0;

  const unlockedWorkers = state.aiWorkers?.filter(w => w.unlocked) || [];

  return (
    <div id="ai-engine-panel" className="space-y-6">
      
      {/* 1. Wallets & Reinvestment Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Fondo de Reinversión Wallet (70%) */}
        <div className="bg-zinc-900 border border-emerald-500/20 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Fondo de Reinversión (70%)</span>
              <h4 className="text-xs text-zinc-400 font-sans mt-0.5">Destinado a mejorar o contratar Bots IA</h4>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Zap className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          
          <h3 className="text-3xl font-bold font-mono text-emerald-400 mb-2">
            €{state.reinvestmentFund ? state.reinvestmentFund.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </h3>
          
          <p className="text-[11px] text-zinc-500">
            Los ingresos de la IA se acumulan aquí automáticamente según tu modelo de reparto para escalar tu infraestructura.
          </p>
        </div>

        {/* Ganancias Netas Retirables Wallet (30%) */}
        <div className="bg-zinc-900 border border-teal-500/20 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Ganancias Netas (30%)</span>
              <h4 className="text-xs text-zinc-400 font-sans mt-0.5">Retiro inmediato de beneficios netos</h4>
            </div>
            <div className="p-2 bg-teal-500/10 text-teal-400 rounded-lg border border-teal-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          
          <h3 className="text-3xl font-bold font-mono text-teal-400 mb-2">
            €{state.netGains ? state.netGains.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </h3>
          
          <p className="text-[11px] text-zinc-500">
            Beneficio limpio listo para traspasar a tu saldo de caja y retirar por transferencia bancaria o tarjeta.
          </p>
        </div>

        {/* Traspasar Ganancias Form */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-teal-400 rotate-90" /> Traspasar Beneficios a Saldo de Caja
            </h4>
            <p className="text-[11px] text-zinc-500 mb-4">
              Mueve capital desde tus Ganancias Netas de IA hacia tu balance principal disponible para pagar facturas o retirar.
            </p>
          </div>

          <form onSubmit={handleTransferGains} className="space-y-3">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-zinc-500 font-mono">€</span>
              <input 
                type="number"
                step="0.01"
                min="0.01"
                max={state.netGains || 0}
                placeholder="0.00"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-7 py-2 text-xs text-zinc-200 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setTransferAmount((state.netGains || 0).toString())}
                className="absolute right-2 top-2 text-[9px] font-mono font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded cursor-pointer"
              >
                MÁX
              </button>
            </div>
            
            <button
              type="submit"
              disabled={actionLoading === 'transfer' || !transferAmount || parseFloat(transferAmount) <= 0}
              className="w-full py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:from-zinc-800 disabled:to-zinc-800 text-black font-semibold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              {actionLoading === 'transfer' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando...
                </>
              ) : (
                <>
                  Traspasar Fondos <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Dynamic passive income ticker summary bar */}
      <div className="bg-zinc-900/60 border border-zinc-800 px-6 py-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <p className="text-xs text-zinc-300">
            Fábrica IA corriendo en segundo plano: <strong className="text-emerald-400 font-mono font-bold">€{currentPassiveRate.toFixed(2)}/min</strong> generados en total de forma pasiva.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500">Modelo de reparto:</span>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-emerald-950/40 border border-emerald-800/40 rounded-full text-emerald-400">
            {state.apiConfig?.payoutModel === 'SPLIT_70_30' ? '70% Reinversión / 30% Líquido' : 
             state.apiConfig?.payoutModel === '100_REINVEST' ? '100% Crecimiento Re-Invertido' : '100% Retiro Neto'}
          </span>
        </div>
      </div>

      {/* 2. Main layout: Active Bots (Left) & Real API Config + Manual generator (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Bots Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" /> Bots de Ingresos IA en Red Pasiva
                </h3>
                <p className="text-xs text-zinc-500">Adquiere y escala tus bots usando el Fondo de Reinversión acumulado</p>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                Fondo: €{state.reinvestmentFund?.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {state.aiWorkers?.map((worker) => (
                <div 
                  key={worker.id}
                  className={`bg-zinc-950/40 border p-4.5 rounded-xl flex flex-col justify-between transition-all ${
                    worker.unlocked 
                      ? 'border-zinc-800 hover:border-emerald-500/30' 
                      : 'border-zinc-900/60 opacity-60 bg-zinc-950/20'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${
                        worker.unlocked 
                          ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/20' 
                          : 'bg-zinc-900 text-zinc-600 border border-zinc-800/40'
                      }`}>
                        {getWorkerIcon(worker.icon)}
                      </div>
                      <div className="text-right">
                        {worker.unlocked ? (
                          <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 rounded">
                            NIVEL {worker.level}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold font-mono px-2 py-0.5 bg-zinc-900 text-zinc-500 border border-zinc-800 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> BLOQUEADO
                          </span>
                        )}
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-zinc-200">{worker.name}</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5 mb-2.5">{worker.role}</p>

                    <div className="space-y-1.5 border-t border-zinc-900 pt-2.5 mb-4">
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">Modelo:</span>
                        <span className="text-zinc-300">{worker.model}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">Rentabilidad:</span>
                        <span className="text-emerald-400 font-bold">
                          {worker.unlocked 
                            ? `+€${(worker.baseIncomeRate * (1 + (worker.level - 1) * 0.25)).toFixed(2)}/min` 
                            : `+€${worker.baseIncomeRate.toFixed(2)}/min`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500">Total Generado:</span>
                        <span className="text-teal-400">€{worker.totalGenerated.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions (Buy or Upgrade) */}
                  {worker.unlocked ? (
                    <button
                      onClick={() => handleUpgradeWorker(worker.id, worker.costToUpgrade)}
                      disabled={actionLoading !== null || state.reinvestmentFund < worker.costToUpgrade}
                      className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-600 disabled:border-zinc-900 text-zinc-200 border border-zinc-800 rounded-lg text-[10px] font-mono cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {actionLoading === `upgrade-${worker.id}` ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <ArrowUpRight className="w-3 h-3 text-emerald-400" /> Optimizar Módulos (€{worker.costToUpgrade})
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnlockWorker(worker.id, worker.costToUnlock)}
                      disabled={actionLoading !== null || state.reinvestmentFund < worker.costToUnlock}
                      className="w-full py-2 bg-gradient-to-r from-emerald-900/20 to-teal-900/20 hover:from-emerald-900/40 hover:to-teal-900/40 disabled:from-zinc-950 disabled:to-zinc-950 border border-emerald-950/60 hover:border-emerald-500/40 disabled:border-zinc-900 disabled:text-zinc-600 text-emerald-400 rounded-lg text-[10px] font-mono cursor-pointer transition-all flex items-center justify-center gap-1.5"
                    >
                      {actionLoading === `unlock-${worker.id}` ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          Contratar Agente (€{worker.costToUnlock})
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI Activity Ticker (Retro Terminal) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3">
              <Terminal className="w-4 h-4 text-emerald-400" /> Terminal de Procesamiento & Monetización
            </h3>
            
            <div className="bg-black/80 border border-zinc-850 p-4 rounded-xl font-mono text-[11px] space-y-2 h-[154px] overflow-y-auto pr-1">
              {state.aiLogs?.length === 0 ? (
                <p className="text-zinc-500 text-center py-10">Buscando solicitudes API en tiempo real...</p>
              ) : (
                state.aiLogs?.map((log) => (
                  <div key={log.id} className="border-b border-zinc-900 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-zinc-500">
                      <span>[{log.timestamp}] - {log.workerName}</span>
                      <span className="text-emerald-400 font-bold font-mono">+{log.revenue > 0 ? `€${log.revenue.toFixed(2)}` : '€0.00'}</span>
                    </div>
                    <p className="text-zinc-300 mt-0.5">
                      <strong className="text-teal-400">{log.action}:</strong> {log.details}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Real API Connect & Manual Task Trigger (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* API Connections Configuration */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800/60">
              <Settings className="w-4 h-4 text-emerald-400" /> Conectar APIs Reales & Modelo de Reparto
            </h3>

            {/* Gemini Live connection indicator */}
            <div className="mb-4 bg-zinc-950 p-3 rounded-xl border border-zinc-850 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-3 h-3 rounded-full shrink-0 ${state.apiConfig?.geminiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                <div>
                  <h4 className="text-xs font-semibold text-zinc-200">Motor Inteligente Gemini</h4>
                  <p className="text-[10px] text-zinc-500">
                    {state.apiConfig?.geminiConnected 
                      ? 'Integración Activa (gemini-3.5-flash)' 
                      : 'Modo de Demostración y Simulación'}
                  </p>
                </div>
              </div>
              <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                state.apiConfig?.geminiConnected 
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' 
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
              }`}>
                {state.apiConfig?.geminiConnected ? 'CONECTADO LIVE' : 'EMULACIÓN'}
              </span>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Webhook API for Auto CMS Distribution */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Webhook de Distribución CMS (WordPress/Shopify/Make)
                </label>
                <input 
                  type="url"
                  placeholder="https://api.wordpress.org/mi-webhook-ingresos-ia"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
                <p className="text-[9px] text-zinc-500 mt-1">
                  Cada vez que un bot genere un activo digital, enviaremos la carga estructurada a este webhook externo.
                </p>
              </div>

              {/* Reparto de Ingresos Selector */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Modelo de Reparto de Ganancias Pasivas
                </label>
                <select
                  value={payoutModel}
                  onChange={(e) => setPayoutModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="SPLIT_70_30">70% Fondo Reinversión / 30% Ganancias Retirables (Recomendado)</option>
                  <option value="100_REINVEST">100% Fondo Reinversión (Crecimiento exponencial de bots)</option>
                  <option value="100_WITHDRAW">100% Ganancias Retirables (Flujo de caja para retiro)</option>
                </select>
                <p className="text-[9px] text-zinc-500 mt-1">
                  Controla automáticamente qué fracción de tus ingresos automatizados se reserva para contratar bots y cuánto queda listo para retirar.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSavingConfig}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-750 text-white font-medium text-xs rounded-xl cursor-pointer transition-all"
              >
                {isSavingConfig ? 'Guardando configuración...' : 'Guardar Parámetros de APIs'}
              </button>
            </form>
          </div>

          {/* Manual AI High Fidelity Generation Engine */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2 mb-1 pb-2 border-b border-zinc-800/60">
              <Sparkles className="w-4 h-4 text-emerald-400" /> Crear Activo de IA y Vender En Vivo
            </h3>
            
            <p className="text-xs text-zinc-400">
              Usa tus bots activos para redactar y vender contenido de alta fidelidad. Si tu clave de Gemini está vinculada, la IA creará contenido real.
            </p>

            {unlockedWorkers.length === 0 ? (
              <div className="p-3 bg-zinc-950 border border-zinc-900 text-center rounded-xl text-xs text-zinc-500">
                Debes tener al menos un Agente IA desbloqueado para ejecutar tareas manuales de monetización.
              </div>
            ) : (
              <div className="space-y-3.5">
                {/* Seleccionar Agente */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Seleccionar Bot Ejecutor
                  </label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
                  >
                    {unlockedWorkers.map(w => (
                      <option key={w.id} value={w.id}>{w.name} (Nivel {w.level})</option>
                    ))}
                  </select>
                </div>

                {/* Tema */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Tema del Contenido
                  </label>
                  <input 
                    type="text"
                    placeholder="Eje: Manual de Arbitraje de Criptomonedas 2026"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none font-mono"
                  />
                </div>

                {/* Instrucciones personalizadas */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Instrucciones Especiales para el Motor de IA
                  </label>
                  <textarea 
                    rows={3}
                    placeholder="Escribe instrucciones de lo que deba escribir la IA..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none font-sans resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateManualAsset}
                  disabled={isGenerating}
                  className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-zinc-800 disabled:to-zinc-800 text-black font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Procesando con Gemini...
                    </>
                  ) : (
                    <>
                      Generar Producto & Monetizar <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Generated output visualization */}
            {generatedResult && (
              <div className="bg-zinc-950 border border-emerald-500/20 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <span className="text-[10px] font-mono font-bold text-emerald-400">Resultado de Gemini en Vivo</span>
                  {earnedBonus && (
                    <span className="text-[10px] font-mono font-bold text-teal-400">Ingreso obtenido: +€{earnedBonus.toFixed(2)}</span>
                  )}
                </div>
                
                <div className="text-[11px] text-zinc-300 font-sans max-h-[160px] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {generatedResult}
                </div>
                <div className="text-[9px] text-zinc-500 font-mono text-center">
                  Activo enviado al webhook de distribución para venta pasiva automatizada.
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

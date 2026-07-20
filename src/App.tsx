import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Wallet, Activity, Users, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Shield, Sparkles, ShoppingCart, Youtube, DollarSign,
  Zap, BarChart3, Clock, CheckCircle2, AlertCircle, ArrowRight,
  Play, Eye, ThumbsUp, Bell, Settings, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemState } from './types';

// ─── MOCK YouTube Stats ──────────────────────────────────────────────────────
const YT_STATS = {
  subscribers: 1240,
  totalViews: 48320,
  totalVideos: 23,
  monthlyRevenue: 42.80,
  lastUpload: 'hace 2 horas',
  recentVideos: [
    { title: 'Lluvia suave para dormir · 3h', views: 3420, likes: 87, date: 'hoy' },
    { title: 'Bosque nocturno · meditación', views: 2180, likes: 54, date: 'ayer' },
    { title: 'Sonidos de olas · focus', views: 1890, likes: 43, date: 'hace 3 días' },
    { title: 'Tibetano 432Hz · relajación', views: 1540, likes: 38, date: 'hace 5 días' },
  ]
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const from = 0;
    const to = value;
    const step = (ts: number) => {
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (to - from) * eased);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{prefix}{fmt(display)}{suffix}</>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, prefix = '€' }: any) {
  const colors: Record<string, { bg: string; text: string; glow: string; border: string }> = {
    green:  { bg: 'rgba(0,255,136,0.06)',  text: '#00ff88', glow: 'glow-green',  border: 'rgba(0,255,136,0.15)' },
    teal:   { bg: 'rgba(0,212,255,0.06)',  text: '#00d4ff', glow: 'glow-teal',   border: 'rgba(0,212,255,0.15)' },
    purple: { bg: 'rgba(168,85,247,0.06)', text: '#a855f7', glow: 'glow-purple', border: 'rgba(168,85,247,0.15)' },
    orange: { bg: 'rgba(255,107,53,0.06)', text: '#ff6b35', glow: 'glow-orange', border: 'rgba(255,107,53,0.15)' },
  };
  const c = colors[color] || colors.green;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className={`stat-card glass ${c.glow}`}
      style={{ border: `1px solid ${c.border}` }}
    >
      {/* BG blob */}
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl pointer-events-none" style={{ background: c.bg }} />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            {React.cloneElement(icon, { className: 'w-4 h-4', style: { color: c.text } })}
          </div>
        </div>
        <div className="text-3xl font-black mb-1" style={{ color: '#f1f5f9' }}>
          {prefix}<Counter value={value} />
        </div>
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</p>
      </div>
    </motion.div>
  );
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────
function MiniChart({ color = '#00ff88' }: { color?: string }) {
  const points = [110, 95, 105, 75, 80, 60, 50, 40, 35, 28, 20];
  const max = 115; const min = 15; const range = max - min;
  const w = 500; const h = 150;
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * h * 0.85 - 10}`);
  const d = `M ${coords.join(' L ')}`;
  const fill = `M ${coords.join(' L ')} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="glow1">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {[0.25, 0.5, 0.75].map(y => (
        <line key={y} x1={0} y1={h * y} x2={w} y2={h * y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="6,4" />
      ))}
      <path d={fill} fill="url(#lg1)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow1)" />
      {points.map((_, i) => i % 3 === 0 && (
        <circle key={i} cx={(i / (points.length - 1)) * w} cy={h - ((points[i] - min) / range) * h * 0.85 - 10} r="4" fill={color} stroke="#020408" strokeWidth="2" filter="url(#glow1)" />
      ))}
    </svg>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function DashboardTab({ state }: { state: SystemState }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Wallet />} label="Saldo Disponible" value={state.balance} sub="↑ Sincronizado en vivo" color="green" />
        <StatCard icon={<Activity />} label="Capital Reinvertido" value={state.investedCapital} sub="12.4% APR estimado" color="teal" />
        <StatCard icon={<ArrowUpRight />} label="Retiros Procesados" value={state.totalWithdrawals} sub="Último hace 9 días" color="orange" />
        <StatCard icon={<Users />} label="Fondo Reinversión" value={state.reinvestmentFund} sub="Acumulado este mes" color="purple" />
      </div>

      {/* Chart + Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
          className="lg:col-span-7 glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Rendimiento de Cartera</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Histórico de reinversiones · 2026</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-green"><TrendingUp className="w-3 h-3" /> +15.2%</span>
            </div>
          </div>
          <div className="h-40"><MiniChart color="#00ff88" /></div>
          <div className="flex justify-between mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'].map(m => (
              <span key={m} className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{m}</span>
            ))}
          </div>
        </motion.div>

        {/* Transactions */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="lg:col-span-5 glass rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Movimientos Recientes</h3>
            <span className="badge badge-blue">En vivo</span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto">
            {state.transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <Activity className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin movimientos aún</p>
              </div>
            ) : state.transactions.slice(0, 6).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl glass-hover transition-all" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                    {tx.type === 'DEPOSIT'
                      ? <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
                      : <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white truncate max-w-[140px]">{tx.description}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{tx.date}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold font-mono ${tx.type === 'DEPOSIT' ? 'text-green-400' : 'text-white'}`}>
                  {tx.type === 'DEPOSIT' ? '+' : '-'}€{tx.amount.toLocaleString('es-ES')}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* AI Revenue Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 80% 50%, rgba(0,255,136,0.04), transparent 60%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center animate-float" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)' }}>
              <Zap className="w-6 h-6" style={{ color: '#00ff88' }} />
            </div>
            <div>
              <h3 className="font-bold text-white">Motor de Ingresos IA</h3>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Generando ingresos pasivos · 24/7</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-2xl font-black text-gradient-green">€{fmt(state.netGains)}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Ganancia neta hoy</p>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── YOUTUBE TAB ──────────────────────────────────────────────────────────────
function YoutubeTab() {
  const [botActive, setBotActive] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Channel Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(255,0,0,0.05), transparent 60%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.2)' }}>
              <Youtube className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">@Equilibrio-c2k</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>equilibrioapp3@gmail.com · Canal evergreen</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="badge badge-red" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-neon" />
                  Live
                </span>
                <span className="badge badge-green">Monetizado</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setBotActive(v => !v)}
            className={botActive ? 'btn-primary' : 'btn-ghost'}
          >
            {botActive ? '⏸ Pausar Bot' : '▶ Activar Bot'}
          </button>
        </div>
      </motion.div>

      {/* YouTube Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: <Users />, label: 'Suscriptores', value: fmtK(YT_STATS.subscribers), color: '#a855f7' },
          { icon: <Eye />,   label: 'Visualizaciones', value: fmtK(YT_STATS.totalViews), color: '#00d4ff' },
          { icon: <Play />,  label: 'Vídeos subidos', value: `${YT_STATS.totalVideos}`, color: '#00ff88' },
          { icon: <DollarSign />, label: 'Ingresos mes', value: `€${fmt(YT_STATS.monthlyRevenue)}`, color: '#f59e0b' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="glass rounded-2xl p-5 glass-hover transition-all">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
              {React.cloneElement(s.icon, { className: 'w-4 h-4', style: { color: s.color } })}
            </div>
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Bot Status + Recent Videos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Panel */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white">Estado del Bot</h3>
            <span className={`badge ${botActive ? 'badge-green' : 'badge-amber'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${botActive ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`} />
              {botActive ? 'Activo' : 'En pausa'}
            </span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Próxima subida', value: botActive ? 'En ~4h' : 'Bot pausado', icon: <Clock className="w-3.5 h-3.5" /> },
              { label: 'Frecuencia', value: 'Cada 6 horas', icon: <RefreshCw className="w-3.5 h-3.5" /> },
              { label: 'Última subida', value: YT_STATS.lastUpload, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
              { label: 'Tipo de contenido', value: 'Sonidos relajación', icon: <Sparkles className="w-3.5 h-3.5" /> },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {row.icon}
                  <span className="text-xs">{row.label}</span>
                </div>
                <span className="text-xs font-semibold text-white">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)' }}>
            <p className="text-xs" style={{ color: 'rgba(0,255,136,0.7)' }}>⚡ Pendiente: autorización OAuth con equilibrioapp3@gmail.com para activar subidas automáticas.</p>
          </div>
        </motion.div>

        {/* Recent Videos */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
          className="glass rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-5">Vídeos Recientes</h3>
          <div className="space-y-3">
            {YT_STATS.recentVideos.map((v, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass-hover transition-all" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(255,0,0,0.08)' }}>
                  <Play className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{v.title}</p>
                  <div className="flex items-center gap-3 mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span className="text-xs flex items-center gap-1"><Eye className="w-3 h-3" />{fmtK(v.views)}</span>
                    <span className="text-xs flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{v.likes}</span>
                    <span className="text-xs">{v.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Revenue chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Ingresos YouTube · 2026</h3>
          <span className="badge badge-green"><TrendingUp className="w-3 h-3" />+28% vs mes anterior</span>
        </div>
        <div className="h-32"><MiniChart color="#ef4444" /></div>
      </motion.div>
    </motion.div>
  );
}

// ─── WITHDRAW TAB ─────────────────────────────────────────────────────────────
function WithdrawTab({ state, onWithdraw, showToast }: any) {
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > state.balance) {
      showToast('error', 'Importe inválido o mayor que el saldo disponible.');
      return;
    }
    setLoading(true);
    try {
      await onWithdraw({ amount: amt, description: desc || 'Retiro manual', gateway: 'CUSTOM', reference: `REF-${Date.now()}` });
      setAmount(''); setDesc('');
    } catch {}
    setLoading(false);
  };

  const presets = [50, 100, 250, 500];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl mx-auto">
      {/* Balance card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 relative overflow-hidden glow-green">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.08), transparent 60%)' }} />
        <div className="relative z-10 text-center">
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Saldo disponible para retirar</p>
          <p className="text-5xl font-black text-gradient-green">€{fmt(state.balance)}</p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>PayPal · joanlazaro83@gmail.com</p>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-5">Solicitar Retiro</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Importe (€)</label>
            <input type="number" className="input-glass" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} min="1" step="0.01" />
            {/* Preset buttons */}
            <div className="flex gap-2 mt-2">
              {presets.map(p => (
                <button key={p} type="button" onClick={() => setAmount(String(p))}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: amount === String(p) ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: amount === String(p) ? '#00ff88' : 'rgba(255,255,255,0.5)', border: `1px solid ${amount === String(p) ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                  €{p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs mb-2 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Descripción (opcional)</label>
            <input type="text" className="input-glass" placeholder="Ej: Retiro mensual" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            {loading ? 'Procesando...' : 'Solicitar Retiro'}
          </button>
        </form>
      </motion.div>

      {/* History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-4">Historial de Retiros</h3>
        {state.transactions.filter((t: any) => t.type === 'WITHDRAWAL').length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin retiros registrados</p>
        ) : state.transactions.filter((t: any) => t.type === 'WITHDRAWAL').map((tx: any) => (
          <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div>
              <p className="text-xs font-semibold text-white">{tx.description}</p>
              <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{tx.date} · {tx.reference}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white">-€{tx.amount.toLocaleString('es-ES')}</p>
              <span className={`badge mt-1 ${tx.status === 'COMPLETED' ? 'badge-green' : tx.status === 'PENDING' ? 'badge-amber' : 'badge-red'}`}>{tx.status}</span>
            </div>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

// ─── ADMIN TAB ────────────────────────────────────────────────────────────────
function AdminTab({ state, onAddCollaborator, showToast }: any) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [wage, setWage] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !role || !wage) { showToast('error', 'Rellena todos los campos.'); return; }
    await onAddCollaborator({ name, role, wage: parseFloat(wage) });
    setName(''); setRole(''); setWage('');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <Shield className="w-4 h-4" style={{ color: '#a855f7' }} />
            </div>
            <h3 className="text-sm font-bold text-white">Panel de Administración</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Propietario', value: 'Joan · r3dm' },
              { label: 'PayPal', value: 'joanlazaro83@gmail.com' },
              { label: 'Amazon ID', value: 'r3dm01-21' },
              { label: 'Versión', value: 'InverGrow v2.0' },
              { label: 'Canal YouTube', value: '@Equilibrio-c2k' },
              { label: 'Supabase', value: 'tolzqxflecqbjdefohom' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.label}</span>
                <span className="text-xs font-mono font-semibold text-white">{row.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Add Collaborator */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)' }}>
              <Users className="w-4 h-4" style={{ color: '#00d4ff' }} />
            </div>
            <h3 className="text-sm font-bold text-white">Equipo & Nóminas</h3>
          </div>

          {state.collaborators.length > 0 && (
            <div className="mb-4 space-y-2">
              {state.collaborators.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <p className="text-xs font-semibold text-white">{c.name}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.role}</p>
                  </div>
                  <span className="text-xs font-bold text-gradient-green">€{fmt(c.wage)}/mes</span>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-3">
            <input className="input-glass" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} />
            <input className="input-glass" placeholder="Rol" value={role} onChange={e => setRole(e.target.value)} />
            <input className="input-glass" type="number" placeholder="Salario mensual (€)" value={wage} onChange={e => setWage(e.target.value)} />
            <button type="submit" className="btn-ghost w-full flex items-center justify-center gap-2">
              <Users className="w-4 h-4" /> Añadir colaborador
            </button>
          </form>
        </motion.div>
      </div>

      {/* Afiliados Amazon */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)' }}>
            <ShoppingCart className="w-4 h-4" style={{ color: '#ff6b35' }} />
          </div>
          <h3 className="text-sm font-bold text-white">Afiliados Amazon · r3dm01-21</h3>
          <span className="badge badge-green ml-auto">Activo</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Comisión generada', value: '€12.40', color: '#00ff88' },
            { label: 'Clics este mes', value: '284', color: '#00d4ff' },
            { label: 'Conversiones', value: '7', color: '#a855f7' },
            { label: 'Productos activos', value: '18', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* AdMob */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <BarChart3 className="w-4 h-4" style={{ color: '#00ff88' }} />
          </div>
          <h3 className="text-sm font-bold text-white">AdMob · Ingresos Publicitarios</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { app: 'Lanzarus', revenue: '€8.20', ecpm: '€1.40', color: '#00ff88' },
            { app: 'r3dm/guia', revenue: '€5.60', ecpm: '€0.90', color: '#00d4ff' },
            { app: 'Nexusia', revenue: '€3.10', ecpm: '€0.75', color: '#a855f7' },
          ].map((a, i) => (
            <div key={i} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${a.color}15` }}>
              <p className="text-xs font-bold text-white mb-2">{a.app}</p>
              <p className="text-xl font-black" style={{ color: a.color }}>{a.revenue}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>eCPM {a.ecpm}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{ background: msg.type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'success' ? 'rgba(0,255,136,0.3)' : 'rgba(239,68,68,0.3)'}`, backdropFilter: 'blur(20px)' }}
        >
          {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          <span className="text-sm font-semibold text-white">{msg.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'youtube' | 'withdraw' | 'admin';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard',  icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'youtube',   label: 'YouTube',    icon: <Youtube className="w-4 h-4" /> },
  { id: 'withdraw',  label: 'Retiros',    icon: <ArrowUpRight className="w-4 h-4" /> },
  { id: 'admin',     label: 'Admin',      icon: <Settings className="w-4 h-4" /> },
];

export default function App() {
  const [state, setState] = useState<SystemState>({
    balance: 15420.50,
    investedCapital: 42000.00,
    totalWithdrawals: 2850.00,
    reinvestmentFund: 350.00,
    netGains: 185.20,
    collaborators: [],
    transactions: [],
    webhookLogs: [],
    aiWorkers: [],
    aiLogs: [],
    apiConfig: { geminiConnected: false, distributionWebhook: '', targetMarket: '', payoutModel: 'SPLIT_70_30' }
  });

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = useCallback((type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setState(data);
    } catch {}
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => {
    fetchState();
    const iv = setInterval(() => fetchState(true), 5000);
    return () => clearInterval(iv);
  }, [fetchState]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchState();
    setIsRefreshing(false);
    showToast('success', 'Panel actualizado.');
  };

  const handleWithdraw = async (data: any) => {
    const res = await fetch('/api/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const updated = await res.json();
    setState(updated.data);
    showToast('success', `Retiro de €${data.amount} solicitado con éxito.`);
  };

  const handleAddCollaborator = async (col: any) => {
    const res = await fetch('/api/collaborators', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(col) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    const updated = await res.json();
    setState(updated.data);
    showToast('success', `Colaborador añadido: ${col.name}.`);
  };

  return (
    <div className="min-h-screen bg-animated" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background: 'rgba(2,4,8,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm" style={{ background: 'linear-gradient(135deg, #00ff88, #00d4aa)', color: '#020408' }}>
              IG
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight">InverGrow</h1>
              <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.65rem' }}>v2.0 · Plataforma de ingresos</p>
            </div>
          </div>

          {/* Nav tabs — desktop */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`nav-tab flex items-center gap-2 ${activeTab === tab.id ? 'active' : ''}`}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono" style={{ background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', color: '#00ff88' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />LIVE
            </div>
            <button onClick={handleRefresh} disabled={isRefreshing} className="btn-ghost py-2 px-3">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(0,255,136,0.3)', borderTopColor: '#00ff88' }} />
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Cargando InverGrow...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
              {activeTab === 'dashboard' && <DashboardTab state={state} />}
              {activeTab === 'youtube'   && <YoutubeTab />}
              {activeTab === 'withdraw'  && <WithdrawTab state={state} onWithdraw={handleWithdraw} showToast={showToast} />}
              {activeTab === 'admin'     && <AdminTab state={state} onAddCollaborator={handleAddCollaborator} showToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Bottom nav — mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex" style={{ background: 'rgba(2,4,8,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all"
            style={{ color: activeTab === tab.id ? '#00ff88' : 'rgba(255,255,255,0.35)' }}>
            {tab.icon}
            <span className="text-xs font-semibold">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div layoutId="tab-indicator" className="absolute bottom-0 w-8 h-0.5 rounded-full" style={{ background: '#00ff88' }} />
            )}
          </button>
        ))}
      </nav>

      <Toast msg={toast} />
    </div>
  );
}

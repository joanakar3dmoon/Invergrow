import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Wallet, Activity, Users, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Shield, Sparkles, ShoppingCart, Youtube, DollarSign,
  Zap, BarChart3, Clock, CheckCircle2, AlertCircle, ChevronRight,
  Play, Eye, ThumbsUp, Settings, Repeat, Bell, Star, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemState } from './types';

// ─── Constants ────────────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${n}`;

const YT = {
  subscribers: 1240, totalViews: 48320, totalVideos: 23,
  monthlyRevenue: 42.80, lastUpload: 'hace 2 horas',
  recentVideos: [
    { title: 'Lluvia suave para dormir · 3h',    views: 3420, likes: 87, date: 'hoy' },
    { title: 'Bosque nocturno · meditación 2h',  views: 2180, likes: 54, date: 'ayer' },
    { title: 'Sonidos de olas · focus',           views: 1890, likes: 43, date: 'hace 3d' },
    { title: 'Tibetano 432Hz · relajación',       views: 1540, likes: 38, date: 'hace 5d' },
  ]
};

const ADMOB = [
  { app: 'Lanzarus',  revenue: 8.20,  ecpm: 1.40, impressions: 5840, color: '#00ff88' },
  { app: 'r3dm/guia', revenue: 5.60,  ecpm: 0.90, impressions: 6222, color: '#00d4ff' },
  { app: 'Nexusia',   revenue: 3.10,  ecpm: 0.75, impressions: 4133, color: '#a855f7' },
];

const AFFILIATE_PRODUCTS = [
  { name: 'Auriculares Sony WH-1000XM5', clicks: 84, sales: 3, commission: 4.20 },
  { name: 'Meditación Mindfulness libro', clicks: 61, sales: 2, commission: 1.80 },
  { name: 'Altavoz Bluetooth JBL Flip 6', clicks: 52, sales: 1, commission: 2.30 },
  { name: 'Diffuser aromas zen',           clicks: 47, sales: 1, commission: 1.40 },
];

// ─── Animated Counter ─────────────────────────────────────────────────────────
function Counter({ value }: { value: number }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 1200;
    const step = (ts: number) => {
      const p = Math.min((ts - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisp(value * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <>{fmt(disp)}</>;
}

// ─── SVG Sparkline ────────────────────────────────────────────────────────────
function Sparkline({ data, color = '#00ff88' }: { data: number[]; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data), range = max - min || 1;
  const W = 400, H = 120;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H * 0.8 - 10}`);
  const d = `M ${pts.join(' L ')}`;
  const fill = `${d} L ${W},${H} L 0,${H} Z`;
  const id = `g${color.replace('#','')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id={`f${id}`}><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0.25,0.5,0.75].map(y => <line key={y} x1={0} y1={H*y} x2={W} y2={H*y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="5,4"/>)}
      <path d={fill} fill={`url(#${id})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#f${id})`}/>
      {data.map((_, i) => i % 2 === 0 && (
        <circle key={i} cx={(i/(data.length-1))*W} cy={H-((data[i]-min)/range)*H*0.8-10} r="3.5" fill={color} stroke="#040608" strokeWidth="1.5" filter={`url(#f${id})`}/>
      ))}
    </svg>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
function BarChart({ data, color = '#00ff88', labels }: { data: number[]; color?: string; labels?: string[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1.5 h-full w-full">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(v / max) * 100}%` }}
            transition={{ delay: i * 0.05, duration: 0.6, ease: [0.4,0,0.2,1] }}
            className="w-full rounded-t-sm"
            style={{ background: `linear-gradient(to top, ${color}40, ${color})`, minHeight: 3 }}
          />
          {labels && <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, prefix = '€', suffix = '' }: any) {
  const map: Record<string, { bg: string; border: string; glow: string }> = {
    green:  { bg: 'rgba(0,255,136,0.06)',  border: 'rgba(0,255,136,0.15)',  glow: '0 0 40px rgba(0,255,136,0.08)' },
    teal:   { bg: 'rgba(0,212,255,0.06)',  border: 'rgba(0,212,255,0.15)',  glow: '0 0 40px rgba(0,212,255,0.08)' },
    purple: { bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.15)', glow: '0 0 40px rgba(168,85,247,0.08)' },
    orange: { bg: 'rgba(255,107,53,0.06)', border: 'rgba(255,107,53,0.15)', glow: '0 0 40px rgba(255,107,53,0.08)' },
    gold:   { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', glow: '0 0 40px rgba(245,158,11,0.08)' },
  };
  const c = map[color] || map.green;
  const textColor = { green:'#00ff88', teal:'#00d4ff', purple:'#a855f7', orange:'#ff6b35', gold:'#f59e0b' }[color] || '#00ff88';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, boxShadow: c.glow }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${c.border}` }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl pointer-events-none" style={{ background: c.bg }} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            {React.cloneElement(icon, { className: 'w-3.5 h-3.5', style: { color: textColor } })}
          </div>
        </div>
        <p className="text-3xl font-black tracking-tight" style={{ color: '#f1f5f9' }}>
          {prefix}<Counter value={value} />{suffix}
        </p>
        <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>
      </div>
    </motion.div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon, title, sub, badge, iconColor = '#00ff88', iconBg = 'rgba(0,255,136,0.1)' }: any) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: iconBg, border: `1px solid ${iconColor}25` }}>
          {React.cloneElement(icon, { className: 'w-4 h-4', style: { color: iconColor } })}
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
        </div>
      </div>
      {badge}
    </div>
  );
}

// ─── Glass Card ───────────────────────────────────────────────────────────────
function Card({ children, className = '', delay = 0, style = {} }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl p-6 relative overflow-hidden ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', ...style }}
    >
      {children}
    </motion.div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ color = 'green', children }: any) {
  const map: Record<string, { bg: string; text: string; border: string }> = {
    green:  { bg: 'rgba(0,255,136,0.1)',  text: '#00ff88', border: 'rgba(0,255,136,0.25)' },
    teal:   { bg: 'rgba(0,212,255,0.1)',  text: '#00d4ff', border: 'rgba(0,212,255,0.25)' },
    amber:  { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.25)' },
    red:    { bg: 'rgba(239,68,68,0.1)',  text: '#ef4444', border: 'rgba(239,68,68,0.25)' },
    purple: { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.25)' },
  };
  const c = map[color] || map.green;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {children}
    </span>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = '#00ff88' }: { value: number; max: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <motion.div
        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: [0.4,0,0.2,1] }}
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}80, ${color})` }}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 1 — DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
function DashboardTab({ state }: { state: SystemState }) {
  const totalAdmob = ADMOB.reduce((s, a) => s + a.revenue, 0);
  const totalYT = YT.monthlyRevenue;
  const totalAffiliate = AFFILIATE_PRODUCTS.reduce((s, p) => s + p.commission, 0);
  const totalMonthly = totalAdmob + totalYT + totalAffiliate;
  const reinvestPct = 0.3;
  const reinvestAmt = totalMonthly * reinvestPct;
  const withdrawAmt = totalMonthly * (1 - reinvestPct);

  const monthLabels = ['Ene','Feb','Mar','Abr','May','Jun','Jul'];
  const monthData   = [820, 1240, 980, 1580, 1320, 1890, 2140];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Wallet />}       label="Saldo Total"        value={state.balance}          sub="↑ Actualizado en vivo"    color="green" />
        <StatCard icon={<Repeat />}       label="Capital Invertido"  value={state.investedCapital}  sub="APR estimado 12.4%"       color="teal" />
        <StatCard icon={<ArrowUpRight />} label="Total Retirado"     value={state.totalWithdrawals}  sub="Último hace 9 días"       color="orange" />
        <StatCard icon={<Zap />}          label="Ingresos Este Mes"  value={totalMonthly}           sub="YouTube + AdMob + Afil."  color="gold" />
      </div>

      {/* Chart + Income Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Monthly Chart */}
        <Card className="lg:col-span-7" delay={0.05}>
          <SectionHeader icon={<BarChart3 />} title="Evolución de Ingresos" sub="2026 · €/mes" badge={<Badge color="green"><TrendingUp className="w-3 h-3"/>+28%</Badge>} />
          <div className="h-36">
            <BarChart data={monthData} color="#00ff88" labels={monthLabels} />
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { label: 'Mejor mes', value: '€2.140', color: '#00ff88' },
              { label: 'Media mensual', value: '€1.424', color: '#00d4ff' },
              { label: 'Proyección anual', value: '€25.6K', color: '#a855f7' },
            ].map((s, i) => (
              <div key={i} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Income Breakdown */}
        <Card className="lg:col-span-5" delay={0.1}>
          <SectionHeader icon={<Activity />} title="Fuentes de Ingresos" sub="Este mes" iconColor="#00d4ff" iconBg="rgba(0,212,255,0.1)" />
          <div className="space-y-4">
            {[
              { label: 'YouTube Equilibrio', value: totalYT,       max: totalMonthly, color: '#ef4444', icon: <Youtube className="w-3.5 h-3.5" /> },
              { label: 'AdMob (3 apps)',     value: totalAdmob,    max: totalMonthly, color: '#00ff88', icon: <BarChart3 className="w-3.5 h-3.5" /> },
              { label: 'Afiliados Amazon',   value: totalAffiliate,max: totalMonthly, color: '#f59e0b', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
            ].map((s, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2" style={{ color: s.color }}>
                    {s.icon}
                    <span className="text-xs font-semibold text-white">{s.label}</span>
                  </div>
                  <span className="text-xs font-black font-mono" style={{ color: s.color }}>€{fmt(s.value)}</span>
                </div>
                <ProgressBar value={s.value} max={totalMonthly} color={s.color} />
              </div>
            ))}
          </div>

          {/* Reinversion summary */}
          <div className="mt-5 p-4 rounded-xl space-y-2" style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.1)' }}>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>🔄 Reinversión (30%)</span>
              <span className="font-bold text-green-400">€{fmt(reinvestAmt)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>💸 Disponible para retirar</span>
              <span className="font-bold text-white">€{fmt(withdrawAmt)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Status Strip */}
      <Card delay={0.15}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)' }}>
              <Sparkles className="w-6 h-6" style={{ color: '#00ff88' }} />
            </div>
            <div>
              <h3 className="font-bold text-white">Motor de Ingresos Pasivos</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>YouTube · AdMob · Afiliados · Reinversión automática 24/7</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color="green"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>ACTIVO</Badge>
            <p className="text-2xl font-black" style={{ color: '#00ff88' }}>€{fmt(state.netGains)}<span className="text-xs font-normal text-white/40 ml-1">hoy</span></p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — YOUTUBE + BOT
// ══════════════════════════════════════════════════════════════════════════════
function YoutubeTab() {
  const [botActive, setBotActive] = useState(false);
  const ytMonthData = [12, 18, 15, 28, 22, 35, 43];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Channel Hero */}
      <Card>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(239,68,68,0.05), transparent 60%)' }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Youtube className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">@Equilibrio-c2k</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>equilibrioapp3@gmail.com · Canal evergreen de relajación</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge color="red"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"/>Live</Badge>
                <Badge color="green">Monetizado</Badge>
                <Badge color="amber">Bot pendiente OAuth</Badge>
              </div>
            </div>
          </div>
          <button onClick={() => setBotActive(v => !v)}
            className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={botActive
              ? { background: 'rgba(0,255,136,0.15)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88' }
              : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
            {botActive ? '⏸ Pausar Bot' : '▶ Activar Bot'}
          </button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: <Users />,      label: 'Suscriptores',    value: fmtK(YT.subscribers),     color: '#a855f7' },
          { icon: <Eye />,        label: 'Visualizaciones',  value: fmtK(YT.totalViews),       color: '#00d4ff' },
          { icon: <Play />,       label: 'Vídeos subidos',   value: `${YT.totalVideos}`,        color: '#00ff88' },
          { icon: <DollarSign />, label: 'Ingresos mes',     value: `€${fmt(YT.monthlyRevenue)}`, color: '#f59e0b' },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.07 }}
            className="rounded-2xl p-5 transition-all"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${s.color}15`, border: `1px solid ${s.color}25` }}>
              {React.cloneElement(s.icon, { className: 'w-4 h-4', style: { color: s.color } })}
            </div>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bot Status */}
        <Card delay={0.15}>
          <SectionHeader icon={<Zap />} title="Estado del Bot" sub="Subidas automáticas cada 6h"
            badge={<Badge color={botActive ? 'green' : 'amber'}><span className={`w-1.5 h-1.5 rounded-full inline-block ${botActive ? 'bg-green-400 animate-pulse' : 'bg-amber-400'}`}/>{botActive ? 'Activo' : 'En pausa'}</Badge>}
            iconColor="#00ff88" iconBg="rgba(0,255,136,0.1)" />
          <div className="space-y-2.5">
            {[
              { label: 'Próxima subida',      value: botActive ? 'En ~4h'           : 'Pausado',          icon: <Clock className="w-3.5 h-3.5"/> },
              { label: 'Frecuencia',          value: 'Cada 6 horas',                                      icon: <RefreshCw className="w-3.5 h-3.5"/> },
              { label: 'Última subida',       value: YT.lastUpload,                                       icon: <CheckCircle2 className="w-3.5 h-3.5"/> },
              { label: 'Tipo de contenido',   value: 'Sonidos · relajación · 432Hz',                      icon: <Sparkles className="w-3.5 h-3.5"/> },
              { label: 'Títulos optimizados', value: 'SEO automático',                                    icon: <Star className="w-3.5 h-3.5"/> },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {r.icon}<span className="text-xs">{r.label}</span>
                </div>
                <span className="text-xs font-semibold text-white">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <p className="text-xs" style={{ color: '#f59e0b' }}>⚡ Pendiente: código OAuth de equilibrioapp3@gmail.com para activar subidas reales.</p>
          </div>
        </Card>

        {/* Recent Videos */}
        <Card delay={0.2}>
          <SectionHeader icon={<Play />} title="Vídeos Recientes" sub="Últimas subidas" iconColor="#ef4444" iconBg="rgba(239,68,68,0.1)" />
          <div className="space-y-2.5">
            {YT.recentVideos.map((v, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <Play className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{v.title}</p>
                  <div className="flex items-center gap-3 mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <span className="text-xs flex items-center gap-1"><Eye className="w-3 h-3"/>{fmtK(v.views)}</span>
                    <span className="text-xs flex items-center gap-1"><ThumbsUp className="w-3 h-3"/>{v.likes}</span>
                    <span className="text-xs">{v.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card delay={0.25}>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={<TrendingUp />} title="Ingresos YouTube · 2026" sub="€/mes" iconColor="#ef4444" iconBg="rgba(239,68,68,0.1)" badge={<Badge color="green"><TrendingUp className="w-3 h-3"/>+28%</Badge>} />
        </div>
        <div className="h-32">
          <Sparkline data={ytMonthData} color="#ef4444" />
        </div>
      </Card>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — RETIROS + REINVERSIÓN
// ══════════════════════════════════════════════════════════════════════════════
function WithdrawTab({ state, onWithdraw, showToast }: any) {
  const [amount, setAmount]     = useState('');
  const [desc, setDesc]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [reinvestPct, setReinvestPct] = useState(30);

  const totalMonthly = ADMOB.reduce((s,a)=>s+a.revenue,0) + YT.monthlyRevenue + AFFILIATE_PRODUCTS.reduce((s,p)=>s+p.commission,0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > state.balance) { showToast('error', 'Importe inválido o mayor al saldo.'); return; }
    setLoading(true);
    try {
      await onWithdraw({
        amount: amt,
        method: 'paypal',
        destination: 'joanlazaro83@gmail.com',
        notes: desc || 'Retiro manual',
        adminCode: 'joan123',
      });
      setAmount(''); setDesc('');
    } catch(err: any) { showToast('error', err.message || 'Error al procesar el retiro.'); }
    setLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Balance + Withdraw Form */}
        <div className="lg:col-span-5 space-y-5">
          {/* Balance Hero */}
          <Card>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.08), transparent 60%)' }} />
            <div className="relative z-10 text-center py-2">
              <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>Saldo disponible</p>
              <p className="text-5xl font-black" style={{ background: 'linear-gradient(135deg,#00ff88,#00d4ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>€{fmt(state.balance)}</p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>PayPal · joanlazaro83@gmail.com</p>
            </div>
          </Card>

          {/* Withdraw Form */}
          <Card delay={0.1}>
            <SectionHeader icon={<ArrowUpRight />} title="Solicitar Retiro" iconColor="#f59e0b" iconBg="rgba(245,158,11,0.1)" />
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Importe (€)</label>
                <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm font-mono text-white outline-none transition-all"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} min="1" step="0.01" />
                <div className="flex gap-2 mt-2">
                  {[50,100,250,500].map(p => (
                    <button key={p} type="button" onClick={() => setAmount(String(p))}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{ background: amount===String(p) ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: amount===String(p) ? '#00ff88' : 'rgba(255,255,255,0.45)', border: `1px solid ${amount===String(p) ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.07)'}` }}>
                      €{p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Descripción</label>
                <input type="text" placeholder="Retiro mensual..." value={desc} onChange={e=>setDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background:'linear-gradient(135deg,rgba(0,255,136,0.2),rgba(0,212,255,0.2))', border:'1px solid rgba(0,255,136,0.3)', color:'#00ff88' }}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <ArrowUpRight className="w-4 h-4"/>}
                {loading ? 'Procesando...' : 'Solicitar Retiro'}
              </button>
            </form>
          </Card>
        </div>

        {/* Reinversion Panel */}
        <div className="lg:col-span-7 space-y-5">
          <Card delay={0.1}>
            <SectionHeader icon={<Repeat />} title="Configuración de Reinversión" sub="Porcentaje automático de reinversión" iconColor="#a855f7" iconBg="rgba(168,85,247,0.1)" />
            
            {/* Slider */}
            <div className="mb-5">
              <div className="flex justify-between mb-2">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Reinvertir</span>
                <span className="text-sm font-black" style={{ color: '#a855f7' }}>{reinvestPct}%</span>
              </div>
              <input type="range" min={0} max={100} value={reinvestPct} onChange={e=>setReinvestPct(Number(e.target.value))}
                className="w-full" style={{ accentColor: '#a855f7' }} />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>0% (todo retiras)</span>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>100% (todo reinviertes)</span>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Ingresos/mes', value: `€${fmt(totalMonthly)}`, color: '#00d4ff' },
                { label: `Reinvertir (${reinvestPct}%)`, value: `€${fmt(totalMonthly * reinvestPct/100)}`, color: '#a855f7' },
                { label: `Retirar (${100-reinvestPct}%)`, value: `€${fmt(totalMonthly * (1-reinvestPct/100))}`, color: '#00ff88' },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${s.color}15` }}>
                  <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Reinvest allocation */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Distribución de reinversión</p>
              {[
                { label: 'Crear más contenido YouTube', pct: 50, color: '#ef4444' },
                { label: 'Herramientas & hosting',      pct: 30, color: '#00d4ff' },
                { label: 'Fondo de reserva',            pct: 20, color: '#a855f7' },
              ].map((r, i) => {
                const reinvestTotal = totalMonthly * reinvestPct / 100;
                return (
                  <div key={i}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{r.label}</span>
                      <span className="text-xs font-bold font-mono" style={{ color: r.color }}>€{fmt(reinvestTotal * r.pct/100)}</span>
                    </div>
                    <ProgressBar value={r.pct} max={100} color={r.color} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Withdrawal History */}
          <Card delay={0.2}>
            <SectionHeader icon={<Clock />} title="Historial de Retiros" iconColor="#f59e0b" iconBg="rgba(245,158,11,0.1)" />
            {state.transactions.filter((t: any) => t.type === 'WITHDRAWAL').length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Sin retiros registrados aún</p>
            ) : state.transactions.filter((t: any) => t.type === 'WITHDRAWAL').map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl mb-2" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div>
                  <p className="text-xs font-semibold text-white">{tx.description}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{tx.date} · {tx.reference}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">-€{fmt(tx.amount)}</p>
                  <Badge color={tx.status==='COMPLETED'?'green':tx.status==='PENDING'?'amber':'red'}>{tx.status}</Badge>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — ADMIN · ADMOB · AFILIADOS
// ══════════════════════════════════════════════════════════════════════════════
function AdminTab({ state, onAddCollaborator, showToast }: any) {
  const [name, setName]   = useState('');
  const [role, setRole]   = useState('');
  const [wage, setWage]   = useState('');
  const [activeSection, setActiveSection] = useState<'info'|'admob'|'affiliate'>('info');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name||!role||!wage) { showToast('error','Rellena todos los campos.'); return; }
    await onAddCollaborator({ name, role, wage: parseFloat(wage) });
    setName(''); setRole(''); setWage('');
    showToast('success', `Colaborador ${name} añadido.`);
  };

  const totalAdmob = ADMOB.reduce((s,a)=>s+a.revenue,0);
  const totalAffiliate = AFFILIATE_PRODUCTS.reduce((s,p)=>s+p.commission,0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Section Switcher */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {[
          { id: 'info' as const,       label: 'Sistema & Equipo', icon: <Shield className="w-3.5 h-3.5"/> },
          { id: 'admob' as const,      label: 'AdMob',            icon: <BarChart3 className="w-3.5 h-3.5"/> },
          { id: 'affiliate' as const,  label: 'Afiliados Amazon', icon: <ShoppingCart className="w-3.5 h-3.5"/> },
        ].map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all"
            style={{
              background: activeSection===s.id ? 'rgba(0,255,136,0.1)' : 'transparent',
              color: activeSection===s.id ? '#00ff88' : 'rgba(255,255,255,0.4)',
              border: activeSection===s.id ? '1px solid rgba(0,255,136,0.2)' : '1px solid transparent'
            }}>
            {s.icon}{s.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── Sistema & Equipo ── */}
        {activeSection === 'info' && (
          <motion.div key="info" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Info */}
            <Card>
              <SectionHeader icon={<Shield />} title="Información del Sistema" iconColor="#a855f7" iconBg="rgba(168,85,247,0.1)" badge={<Badge color="green">v2.0</Badge>} />
              <div className="space-y-2.5">
                {[
                  { label: 'Propietario',    value: 'Joan · r3dm' },
                  { label: 'PayPal retiros', value: 'joanlazaro83@gmail.com' },
                  { label: 'Amazon ID',      value: 'r3dm01-21' },
                  { label: 'Canal YouTube',  value: '@Equilibrio-c2k' },
                  { label: 'GitHub',         value: 'joanakar3dmoon/Invergrow' },
                  { label: 'Supabase',       value: 'tolzqxflecqbjdefohom' },
                  { label: 'Vercel',         value: 'invergrow.vercel.app' },
                ].map((r,i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{r.label}</span>
                    <span className="text-xs font-mono font-semibold text-white">{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Team */}
            <Card delay={0.1}>
              <SectionHeader icon={<Users />} title="Equipo & Nóminas" iconColor="#00d4ff" iconBg="rgba(0,212,255,0.1)" />
              {state.collaborators.length > 0 && (
                <div className="mb-4 space-y-2">
                  {state.collaborators.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <div>
                        <p className="text-xs font-bold text-white">{c.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{c.role}</p>
                      </div>
                      <span className="text-sm font-black" style={{ color: '#00ff88' }}>€{fmt(c.wage)}/mes</span>
                    </div>
                  ))}
                </div>
              )}
              <form onSubmit={handleAdd} className="space-y-3">
                {[
                  { placeholder: 'Nombre', value: name, setter: setName },
                  { placeholder: 'Rol', value: role, setter: setRole },
                ].map((f, i) => (
                  <input key={i} className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}
                    placeholder={f.placeholder} value={f.value} onChange={e=>f.setter(e.target.value)} />
                ))}
                <input type="number" className="w-full px-4 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}
                  placeholder="Salario mensual (€)" value={wage} onChange={e=>setWage(e.target.value)} />
                <button type="submit" className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  style={{ background:'rgba(0,212,255,0.08)', border:'1px solid rgba(0,212,255,0.2)', color:'#00d4ff' }}>
                  <Users className="w-4 h-4"/> Añadir Colaborador
                </button>
              </form>
            </Card>
          </motion.div>
        )}

        {/* ── AdMob ── */}
        {activeSection === 'admob' && (
          <motion.div key="admob" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-5">
            {/* Total */}
            <Card>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.15)' }}>
                    <BarChart3 className="w-6 h-6" style={{ color: '#00ff88' }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Ingresos AdMob Totales</h3>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>3 apps · Google AdMob · cuenta joanlazaro83@gmail.com</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black" style={{ color: '#00ff88' }}>€{fmt(totalAdmob)}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>este mes</p>
                </div>
              </div>
            </Card>

            {/* Per App */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {ADMOB.map((a, i) => (
                <Card key={i} delay={i*0.07} style={{ border: `1px solid ${a.color}15` }}>
                  <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl pointer-events-none" style={{ background: `${a.color}08` }} />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-white">{a.app}</h4>
                      <Badge color={i===0?'green':i===1?'teal':'purple'}>App {i+1}</Badge>
                    </div>
                    <p className="text-3xl font-black" style={{ color: a.color }}>€{fmt(a.revenue)}</p>
                    <div className="mt-3 space-y-2">
                      {[
                        { label: 'eCPM', value: `€${fmt(a.ecpm)}` },
                        { label: 'Impresiones', value: fmtK(a.impressions) },
                      ].map((s,j) => (
                        <div key={j} className="flex justify-between text-xs">
                          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</span>
                          <span className="font-mono font-semibold text-white">{s.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3">
                      <ProgressBar value={a.revenue} max={totalAdmob} color={a.color} />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* AdMob chart */}
            <Card delay={0.2}>
              <div className="flex items-center justify-between mb-4">
                <SectionHeader icon={<TrendingUp />} title="Rendimiento AdMob · 2026" iconColor="#00ff88" iconBg="rgba(0,255,136,0.1)" />
              </div>
              <div className="h-32">
                <Sparkline data={[2.1,3.4,2.8,4.5,5.2,6.1,6.9]} color="#00ff88" />
              </div>
            </Card>
          </motion.div>
        )}

        {/* ── Afiliados ── */}
        {activeSection === 'affiliate' && (
          <motion.div key="affiliate" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Comisión total',     value: `€${fmt(totalAffiliate)}`, color: '#f59e0b' },
                { label: 'Clics este mes',     value: `${AFFILIATE_PRODUCTS.reduce((s,p)=>s+p.clicks,0)}`, color: '#00d4ff' },
                { label: 'Conversiones',       value: `${AFFILIATE_PRODUCTS.reduce((s,p)=>s+p.sales,0)}`, color: '#00ff88' },
                { label: 'Productos activos',  value: `${AFFILIATE_PRODUCTS.length}`, color: '#a855f7' },
              ].map((s,i) => (
                <Card key={i} delay={i*0.07}>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                </Card>
              ))}
            </div>

            {/* Product Table */}
            <Card delay={0.15}>
              <SectionHeader icon={<ShoppingCart />} title="Productos Afiliados" sub={`Amazon · ID: r3dm01-21`} iconColor="#f59e0b" iconBg="rgba(245,158,11,0.1)" badge={<Badge color="green">Activo</Badge>} />
              <div className="space-y-2.5">
                {AFFILIATE_PRODUCTS.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <Package className="w-4 h-4" style={{ color: '#f59e0b' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{p.name}</p>
                      <div className="flex items-center gap-3 mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        <span className="text-xs">{p.clicks} clics</span>
                        <span className="text-xs">{p.sales} ventas</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black" style={{ color: '#f59e0b' }}>€{fmt(p.commission)}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>comisión</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <Bell className="w-4 h-4 shrink-0" style={{ color: '#f59e0b' }} />
                <p className="text-xs" style={{ color: '#f59e0b' }}>Crea links con tu ID <strong>r3dm01-21</strong> en tus vídeos de YouTube para maximizar comisiones.</p>
              </div>
            </Card>

            {/* Affiliate Chart */}
            <Card delay={0.25}>
              <SectionHeader icon={<TrendingUp />} title="Comisiones Afiliados · 2026" iconColor="#f59e0b" iconBg="rgba(245,158,11,0.1)" badge={<Badge color="amber">+42%</Badge>} />
              <div className="h-32">
                <Sparkline data={[1.2,2.1,1.8,3.4,2.9,4.1,4.8]} color="#f59e0b" />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ msg }: { msg: { type: 'success'|'error'; text: string }|null }) {
  return (
    <AnimatePresence>
      {msg && (
        <motion.div
          initial={{ opacity:0, y:40, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:40 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl"
          style={{ background: msg.type==='success'?'rgba(0,255,136,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${msg.type==='success'?'rgba(0,255,136,0.3)':'rgba(239,68,68,0.3)'}`, backdropFilter:'blur(20px)' }}>
          {msg.type==='success' ? <CheckCircle2 className="w-4 h-4 text-green-400"/> : <AlertCircle className="w-4 h-4 text-red-400"/>}
          <span className="text-sm font-semibold text-white">{msg.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
type Tab = 'dashboard'|'youtube'|'withdraw'|'admin';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id:'dashboard', label:'Dashboard', icon:<BarChart3 className="w-4 h-4"/> },
  { id:'youtube',   label:'YouTube',   icon:<Youtube className="w-4 h-4"/> },
  { id:'withdraw',  label:'Retiros',   icon:<Repeat className="w-4 h-4"/> },
  { id:'admin',     label:'Admin',     icon:<Settings className="w-4 h-4"/> },
];

export default function App() {
  const [state, setState] = useState<SystemState>({
    balance: 0, investedCapital: 0, totalWithdrawals: 0,
    reinvestmentFund: 0, netGains: 0,
    collaborators: [], transactions: [], webhookLogs: [], aiWorkers: [], aiLogs: [],
    apiConfig: { geminiConnected:false, distributionWebhook:'', targetMarket:'', payoutModel:'SPLIT_70_30' }
  });
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type:'success'|'error'; text:string }|null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const showToast = useCallback((type: 'success'|'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchState = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data && typeof data.balance !== 'undefined') setState(data);
    } catch (e) {
      console.error('fetchState error:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const iv = setInterval(() => fetchState(true), 6000);
    return () => clearInterval(iv);
  }, [fetchState]);

  const handleWithdraw = async (data: any) => {
    const res = await fetch('/api/withdraw', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error al procesar el retiro');
    await fetchState(true);
    showToast('success', `Retiro de €${fmt(data.amount)} solicitado.`);
  };

  const handleAddCollaborator = async (col: any) => {
    const res = await fetch('/api/collaborators', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(col) });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
    setState((await res.json()).data);
  };

  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at 20% 10%, rgba(0,255,136,0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(168,85,247,0.04) 0%, transparent 50%), #040608' }}>

      {/* Header */}
      <header className="sticky top-0 z-40" style={{ background:'rgba(4,6,8,0.8)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background:'linear-gradient(135deg,#00ff88,#00c4aa)', color:'#040608' }}>IG</div>
            <div>
              <h1 className="text-sm font-black text-white">InverGrow</h1>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.6rem', fontFamily:'monospace' }}>v2.0 · Ingresos Pasivos IA</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: activeTab===tab.id ? 'rgba(0,255,136,0.12)' : 'transparent',
                  color: activeTab===tab.id ? '#00ff88' : 'rgba(255,255,255,0.45)',
                  border: activeTab===tab.id ? '1px solid rgba(0,255,136,0.2)' : '1px solid transparent'
                }}>
                {tab.icon}{tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
              style={{ background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.15)', color:'#00ff88' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"/>LIVE
            </div>
            <button onClick={async()=>{ setIsRefreshing(true); await fetchState(); setIsRefreshing(false); showToast('success','Panel actualizado.'); }}
              className="p-2 rounded-xl transition-all" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <RefreshCw className={`w-4 h-4 text-white/60 ${isRefreshing?'animate-spin':''}`}/>
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-28 md:pb-8" style={{ touchAction: 'pan-y', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor:'rgba(0,255,136,0.2)', borderTopColor:'#00ff88' }}/>
            <p className="text-sm" style={{ color:'rgba(255,255,255,0.4)' }}>Cargando InverGrow...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}}>
              {activeTab==='dashboard' && <DashboardTab state={state} />}
              {activeTab==='youtube'   && <YoutubeTab />}
              {activeTab==='withdraw'  && <WithdrawTab state={state} onWithdraw={handleWithdraw} showToast={showToast} />}
              {activeTab==='admin'     && <AdminTab state={state} onAddCollaborator={handleAddCollaborator} showToast={showToast} />}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex"
        style={{ background:'rgba(4,6,8,0.95)', backdropFilter:'blur(24px)', borderTop:'1px solid rgba(255,255,255,0.07)', touchAction:'none' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center gap-1 py-3 transition-all relative"
            style={{ color: activeTab===tab.id ? '#00ff88' : 'rgba(255,255,255,0.35)' }}>
            {tab.icon}
            <span style={{ fontSize:'0.65rem', fontWeight:700 }}>{tab.label}</span>
            {activeTab===tab.id && (
              <motion.div layoutId="mob-indicator" className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background:'#00ff88' }}/>
            )}
          </button>
        ))}
      </nav>

      <Toast msg={toast} />
    </div>
  );
}

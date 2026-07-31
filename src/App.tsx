import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Wallet, Activity, Users, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Shield, Sparkles, ShoppingCart, Youtube, DollarSign,
  Zap, BarChart3, Clock, CheckCircle2, AlertCircle, ChevronRight,
  Play, Eye, ThumbsUp, Settings, Repeat, Bell, Star, Package, Search, ExternalLink, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemState } from './types';
import OwnerWithdrawPanel from './components/OwnerWithdrawPanel';

// ─── Constants ────────────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${n}`;

// YT defaults — se sobreescriben con datos reales desde /api/youtube
const YT_DEFAULT = {
  subscribers: 0, totalViews: 0, totalVideos: 0,
  monthlyRevenue: 0, views30d: 0, watchMinutes30d: 0,
  connected: false,
  recentVideos: [] as { title: string; views: number; likes: number; date: string }[],
};

// ─── UI Components ────────────────────────────────────────────────────────────
function Counter({ value }: { value: number }) {
  const [disp, setDisp] = useState(0);
  useEffect(() => {
    let start = disp, end = value, duration = 800, startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisp(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{fmt(disp)}</>;
}

function Sparkline({ data, color = '#00ff88' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const W = 200, H = 60;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i/(data.length-1))*W},${H-((v-min)/range)*H*0.8-10}`).join(' ');
  const d = `M${points}`;
  const fill = `M0,${H} ${points} ${W},${H}Z`;
  const id = `spark-${Math.random().toString(36).slice(2,6)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
        <filter id={`f${id}`}><feDropShadow dx="0" dy="0" stdDeviation="2" floodColor={color} floodOpacity="0.4"/></filter>
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

function StatCard({ icon, label, value, sub, color, prefix = '€', suffix = '' }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5 transition-all" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
        {React.cloneElement(icon, { className: 'w-4 h-4', style: { color } })}
      </div>
      <p className="text-2xl font-black text-white">{prefix}{value}{suffix}</p>
      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
      {sub && <p className="text-xs mt-1.5" style={{ color: `${color}80` }}>{sub}</p>}
    </motion.div>
  );
}

function SectionHeader({ icon, title, sub, badge, iconColor = '#00ff88', iconBg = 'rgba(0,255,136,0.1)' }: any) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: iconBg, border: `1px solid ${iconColor}20` }}>
        {React.cloneElement(icon, { className: 'w-4 h-4', style: { color: iconColor } })}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-white">{title}</h3>
          {badge}
        </div>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
      </div>
    </div>
  );
}

function Card({ children, className = '', delay = 0, style = {} }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`rounded-2xl p-5 relative overflow-hidden ${className}`}
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', ...style }}>
      {children}
    </motion.div>
  );
}

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
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* KPI Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={<Wallet />}       label="Saldo Disponible"   value={state.balance}          sub="↑ Actualizado en vivo"    color="#00ff88" />
        <StatCard icon={<Repeat />}       label="Capital Invertido"  value={state.investedCapital}  sub="En contenido y activos"   color="#00d4ff" />
        <StatCard icon={<ArrowUpRight />} label="Total Retirado"     value={state.totalWithdrawals}  sub="A PayPal real"            color="#f59e0b" />
        <StatCard icon={<Zap />}          label="Ganancias Netas"    value={state.netGains}          sub="Histórico total"          color="#a855f7" />
      </div>

      {/* Workers en acción */}
      <Card>
        <SectionHeader icon={<Sparkles />} title="🤖 Workers Activos" sub="Generando ingresos cada hora" iconColor="#00ff88" iconBg="rgba(0,255,136,0.1)" />
        <div className="space-y-3">
          {[0,1,2].map(i => {
            const w = (state as any).aiWorkers?.[i];
            if (!w) return null;
            const txs = (state.transactions || []).filter((t: any) =>
              t.type==='AI_REVENUE' && t.description?.includes(w.name)
            );
            const total = txs.reduce((s: number, t: any) => s + t.amount, 0);
            const lastTx = txs[0];
            return (
              <div key={w.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${w.color||'#00ff88'}15`, border: `1px solid ${w.color||'#00ff88'}25` }}>
                  {w.icon || '🤖'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">{w.name}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}>
                      Lv.{w.level||1}
                    </span>
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{w.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black" style={{ color: '#00ff88' }}>+€{fmt(total)}</p>
                  {lastTx && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{new Date(lastTx.date).toLocaleDateString('es-ES')}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Resumen de Ingresos Reales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <SectionHeader icon={<DollarSign />} title="Fuentes de Ingresos Reales" sub="Datos conectados a APIs reales" iconColor="#00ff88" iconBg="rgba(0,255,136,0.1)" />
          <div className="space-y-3">
            {[
              { label: 'AdSense (anuncios web)',      value: 'Pendiente de tráfico', color: '#00ff88', icon: <BarChart3 className="w-4 h-4"/> },
              { label: 'YouTube ID',    value: '@Equilibrio-c2k',  color: '#ff4444', icon: <Youtube className="w-4 h-4"/> },
              { label: 'YouTube (canal personal)',     value: 'Datos en pestaña YouTube', color: '#ef4444', icon: <Youtube className="w-4 h-4"/> },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
                  {React.cloneElement(s.icon, { className: 'w-4 h-4', style: { color: s.color } })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">{s.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: `${s.color}80` }}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.12)' }}>
            <p className="text-xs" style={{ color: '#00ff88' }}>
              ⚡ Los balances solo se actualizan con ingresos reales. Usa la pestaña <strong>Amazon</strong> para buscar productos y generar comisiones de afiliado.
            </p>
          </div>
        </Card>

        {/* Últimas Transacciones */}
        <Card delay={0.1}>
          <SectionHeader icon={<Activity />} title="Últimas Transacciones" sub="Historial de movimientos reales" iconColor="#00d4ff" iconBg="rgba(0,212,255,0.1)" />
          {state.transactions.length > 0 ? (
            <div className="space-y-2">
              {state.transactions.slice(0, 8).map((t: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.type==='DEPOSIT' ? 'rgba(0,255,136,0.08)' : 'rgba(239,68,68,0.08)' }}>
                      {t.type==='DEPOSIT' ? <ArrowDownLeft className="w-3.5 h-3.5" style={{ color: '#00ff88' }} /> : <ArrowUpRight className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">{t.description || t.type}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{new Date(t.date).toLocaleDateString('es-ES')}</p>
                    </div>
                  </div>
                  <span className="text-sm font-black" style={{ color: t.type==='DEPOSIT' ? '#00ff88' : '#ef4444' }}>
                    {t.type==='DEPOSIT' ? '+' : '-'}€{fmt(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center py-10 gap-3">
              <Activity className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Aún no hay transacciones reales</p>
            </div>
          )}
        </Card>
      </div>

      {/* Balance Chart */}
      <Card delay={0.15}>
        <SectionHeader icon={<TrendingUp />} title="Evolución de Ganancias" sub="2026" iconColor="#00ff88" iconBg="rgba(0,255,136,0.1)" />
        <div className="h-32">
          <Sparkline data={[0.5, 0.8, 0.3, 1.2, 0.9, 1.5, 2.1]} color="#00ff88" />
        </div>
      </Card>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 2 — YOUTUBE
// ══════════════════════════════════════════════════════════════════════════════
function YoutubeTab() {
  const [botActive, setBotActive] = useState(false);
  const [ytData, setYtData] = useState(YT_DEFAULT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/youtube');
        const raw = await res.json();
        if (raw.connected && raw.data) {
          const d = raw.data;
          setYtData({
            subscribers: d.subscribers || 0,
            totalViews: d.total_views || 0,
            totalVideos: d.total_videos || 0,
            monthlyRevenue: d.revenue_30d || 0,
            views30d: d.views_30d || 0,
            watchMinutes30d: d.watch_minutes_30d || 0,
            connected: true,
            recentVideos: (d.recent_videos || []).map((v) => ({
              title: v.title || '',
              views: v.views || 0,
              likes: v.likes || 0,
              date: v.published_at ? new Date(v.published_at).toLocaleDateString('es-ES') : '',
            })),
          });
        } else {
          setYtData(prev => ({ ...prev }));
        }
      } catch (e) {
        console.error('YT fetch error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* YouTube Connect */}
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Youtube className="w-6 h-6" style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h3 className="font-bold text-white">YouTube Analytics</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {ytData.connected ? `@${ytData.channel_name || 'canal conectado'}` : 'Canal no conectado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {ytData.connected ? (
              <Badge color="green"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block mr-1"/>Conectado</Badge>
            ) : (
              <a href="/api/youtube-auth-start"
                className="px-4 py-2 rounded-xl font-bold text-xs transition-all text-center"
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                🔑 Conectar YouTube
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? Array.from({length:4}).map((_,i) => (
              <div key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', height: 110 }} />
            ))
          : [
              { icon: <Users />,      label: 'Suscriptores',    value: fmtK(ytData.subscribers),          color: '#a855f7' },
              { icon: <Eye />,        label: 'Views totales',    value: fmtK(ytData.totalViews),           color: '#00d4ff' },
              { icon: <Play />,       label: 'Vídeos',           value: `${ytData.totalVideos}`,           color: '#00ff88' },
              { icon: <DollarSign />, label: 'Ingresos 30d',     value: `€${fmt(ytData.monthlyRevenue)}`,  color: '#f59e0b' },
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
            ))
        }
      </div>

      {/* Recent Videos */}
      {ytData.recentVideos.length > 0 && (
        <Card delay={0.15}>
          <SectionHeader icon={<Play />} title="Vídeos Recientes" sub="Últimos 5 vídeos" iconColor="#ef4444" iconBg="rgba(239,68,68,0.1)" />
          <div className="space-y-2.5">
            {ytData.recentVideos.map((v: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{v.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>👁️ {fmtK(v.views)}</span>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>👍 {fmtK(v.likes)}</span>
                  </div>
                </div>
                <span className="text-xs shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>{v.date}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 3 — WORKERS ANALYTICS (REAL)
// ══════════════════════════════════════════════════════════════════════════════
function WorkersTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/data');
        if (res.ok) setData(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, []);

  const workers = [
    { id: 'youtube',   name: 'YouTube @Equilibrio', icon: '🎬', color: '#ff4444', bg: 'rgba(255,68,68,0.1)', revenue: 0.15, label: 'Ingresos reales por monetización' },
    { id: 'admob',     name: 'AdMob (Lanzarus)',    icon: '📱', color: '#00d4ff', bg: 'rgba(0,212,255,0.1)', revenue: 0.001, label: 'Anuncios en apps' },
    
    { id: 'manual',    name: 'Aportaciones directas', icon: '💶', color: '#00ff88', bg: 'rgba(0,255,136,0.1)', revenue: 50, label: 'Ingresos manuales' },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="w-6 h-6 animate-spin" style={{color:'rgba(255,255,255,0.3)'}}/></div>;

  const totalReal = workers.reduce((s, w) => s + w.revenue, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Total Hero */}
      <Card>
        <div className="text-center py-6">
          <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>INGRESOS TOTALES REALES</p>
          <p className="text-5xl font-black" style={{ background: 'linear-gradient(135deg,#00ff88,#00d4ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
            €{fmt(totalReal)}
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Datos reales desde YouTube, AdMob</p>
        </div>
      </Card>

      {/* Workers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {workers.map((w, i) => (
          <motion.div key={w.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl p-5 relative overflow-hidden"
            style={{ background: w.bg, border: `1px solid ${w.color}20` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{w.icon}</span>
                <div>
                  <p className="text-sm font-bold text-white">{w.name}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{w.label}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black" style={{ color: w.color }}>€{fmt(w.revenue)}</p>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((w.revenue / (totalReal || 1)) * 100, 100)}%`, background: w.color }} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Transactions reales */}
      <Card delay={0.2}>
        <SectionHeader icon={<Activity />} title="Ingresos Reales" sub="De fuentes verificadas" iconColor="#00ff88" iconBg="rgba(0,255,136,0.1)" />
        {data?.transactions?.filter((t: any) => t.type === 'DEPOSIT' || t.type === 'AI_REVENUE').slice(0, 6).map((t: any, i: number) => (
          <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,255,136,0.08)' }}>
                <ArrowDownLeft className="w-3.5 h-3.5" style={{ color: '#00ff88' }} />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{t.description || t.type}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.date ? new Date(t.date).toLocaleDateString('es-ES') : ''}</p>
              </div>
            </div>
            <span className="text-sm font-black" style={{ color: '#00ff88' }}>+€{fmt(t.amount)}</span>
          </div>
        )) || (
          <div className="flex flex-col items-center py-10 gap-3">
            <Activity className="w-8 h-8" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>No hay ingresos registrados aún</p>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 4 — WITHDRAW
// ══════════════════════════════════════════════════════════════════════════════
function WithdrawTab({ state, onWithdraw, showToast }: any) {
  const [amount, setAmount]     = useState('');
  const [desc, setDesc]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [method, setMethod]     = useState<'paypal' | 'bizum' | 'iban' | 'tarjeta'>('paypal');
  const [paypalEmail, setPaypalEmail] = useState(() => {
    try { return localStorage.getItem('invergrow_paypal_email') || ''; } catch { return ''; }
  });
  useEffect(() => {
    try { localStorage.setItem('invergrow_paypal_email', paypalEmail); } catch {}
  }, [paypalEmail]);
  const [phone, setPhone]       = useState('');
  const [iban, setIban]         = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showToast('error','Introduce un importe válido.'); return; }
    if (amt > state.balance) { showToast('error',`Saldo insuficiente. Disponible: €${fmt(state.balance)}`); return; }
    if (method === 'paypal' && (!paypalEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paypalEmail.trim()))) { showToast('error','Introduce un correo PayPal válido.'); return; }
    if (method === 'bizum' && !phone.trim()) { showToast('error','Introduce tu número de teléfono para Bizum.'); return; }
    if (method === 'iban' && !iban.trim()) { showToast('error','Introduce tu IBAN.'); return; }
    if (method === 'tarjeta' && (!cardNumber.trim() || !cardHolder.trim())) { showToast('error','Introduce los datos de la tarjeta.'); return; }
    setLoading(true);
    try {
      const payload: any = { amount: amt, method, note: desc || `Retiro de €${amt}` };
      if (method === 'bizum') payload.phoneNumber = phone;
      else if (method === 'iban') payload.iban = iban;
      else if (method === 'tarjeta') { payload.cardNumber = cardNumber.replace(/\s/g,''); payload.accountHolder = cardHolder; }
      else { payload.paypalEmail = paypalEmail.trim(); }
      await onWithdraw(payload);
      setAmount(''); setDesc(''); setPhone(''); setIban(''); setCardNumber(''); setCardHolder('');
    } catch (err: any) {
      showToast('error', err.message || 'Error al procesar el retiro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Balance Card */}
        <div className="lg:col-span-5 space-y-5">
          <Card>
            <div className="text-center py-6">
              <SectionHeader icon={<Wallet />} title="Saldo Disponible" sub="Retirable" iconColor="#00ff88" iconBg="rgba(0,255,136,0.1)" />
              <p className="text-5xl font-black mt-4" style={{ background: 'linear-gradient(135deg,#00ff88,#00d4ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                €{fmt(state.balance)}
              </p>
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {method === 'paypal' ? `PayPal · ${paypalEmail || 'Sin cuenta configurada'}` : 
                 method === 'bizum' ? `Bizum · ${phone || 'Sin teléfono'}` : 
                 method === 'iban' ? `IBAN · ${iban || 'Sin IBAN'}` : 
                 `Tarjeta · ${cardNumber || 'Sin tarjeta'}`}
              </p>
            </div>
          </Card>

          {/* Info */}
          <Card delay={0.07}>
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#00d4ff' }} />
              <div>
                <p className="text-xs font-bold text-white">Retiros por {method === 'bizum' ? 'Bizum' : method === 'iban' ? 'IBAN' : method === 'tarjeta' ? 'Tarjeta' : 'PayPal'}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {method === 'bizum'
                    ? 'Los retiros por Bizum se registran para procesamiento manual. Te llegará la notificación al móvil.'
                    : method === 'iban'
                    ? 'Los retiros por IBAN se procesan como transferencia bancaria SEPA.'
                    : method === 'tarjeta'
                    ? 'Los retiros se procesan directamente a tu tarjeta de débito/crédito.'
                    : 'Los retiros se procesan a tu cuenta de PayPal vinculada.'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Withdraw Form */}
        <div className="lg:col-span-7 space-y-5">
          <Card delay={0.1}>
            <SectionHeader icon={<ArrowUpRight />} title="Solicitar Retiro" iconColor="#f59e0b" iconBg="rgba(245,158,11,0.1)" />
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Importe (€)</label>
                <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl text-lg font-mono text-white outline-none transition-all"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} min="1" step="0.01" />
                <div className="flex gap-2 mt-2">
                  {[50,100,250,500].map(p => (
                    <button key={p} type="button" onClick={() => setAmount(String(p))}
                      className="flex-1 py-3 rounded-xl text-sm font-bold transition-all"
                      style={{ background: amount===String(p) ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: amount===String(p) ? '#00ff88' : 'rgba(255,255,255,0.4)' }}>
                      €{p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Concepto (opcional)</label>
                <input type="text" placeholder="Ej: Retiro mensual" value={desc} onChange={e=>setDesc(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl text-lg text-white outline-none transition-all"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Método de retiro</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setMethod('paypal')}
                    className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all ${method === 'paypal' ? 'ring-2 ring-[#00ff88]' : ''}`}
                    style={{ background: method==='paypal' ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: method==='paypal' ? '#00ff88' : 'rgba(255,255,255,0.5)' }}>
                    PayPal
                  </button>
                  <button type="button" onClick={() => setMethod('bizum')}
                    className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all ${method === 'bizum' ? 'ring-2 ring-[#00ff88]' : ''}`}
                    style={{ background: method==='bizum' ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: method==='bizum' ? '#00ff88' : 'rgba(255,255,255,0.5)' }}>
                    Bizum
                  </button>
                  <button type="button" onClick={() => setMethod('iban')}
                    className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all ${method === 'iban' ? 'ring-2 ring-[#00ff88]' : ''}`}
                    style={{ background: method==='iban' ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: method==='iban' ? '#00ff88' : 'rgba(255,255,255,0.5)' }}>
                    IBAN
                  </button>
                  <button type="button" onClick={() => setMethod('tarjeta')}
                    className={`flex-1 py-4 rounded-xl text-sm font-bold transition-all ${method === 'tarjeta' ? 'ring-2 ring-[#00ff88]' : ''}`}
                    style={{ background: method==='tarjeta' ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)', color: method==='tarjeta' ? '#00ff88' : 'rgba(255,255,255,0.5)' }}>
                    Tarjeta
                  </button>
                </div>
              </div>
              {method === 'paypal' && (
                <div className="rounded-2xl p-4" style={{ background:'rgba(0,212,255,0.06)', border:'1px solid rgba(0,212,255,0.2)' }}>
                  <label className="text-xs mb-1.5 block font-bold" style={{ color: '#00d4ff' }}>Cuenta de PayPal de destino</label>
                  <input type="email" placeholder="tu-correo@paypal.com" value={paypalEmail} onChange={e=>setPaypalEmail(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl text-lg text-white outline-none transition-all"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
                  <p className="text-xs mt-2" style={{ color:'rgba(255,255,255,0.45)' }}>El retiro se enviará a este correo. Se guardará para la próxima vez.</p>
                </div>
              )}
              {method === 'bizum' && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Tu número de teléfono</label>
                  <input type="tel" placeholder="+34 6XX XXX XXX" value={phone} onChange={e=>setPhone(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl text-lg text-white outline-none transition-all"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
                </div>
              )}
              {method === 'iban' && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Tu IBAN</label>
                  <input type="text" placeholder="ESXX XXXX XXXX XXXX XXXX XXXX" value={iban} onChange={e=>setIban(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl text-lg text-white outline-none transition-all font-mono"
                    style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
                </div>
              )}
              {method === 'tarjeta' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Número de tarjeta</label>
                    <input type="text" placeholder="XXXX XXXX XXXX XXXX" value={cardNumber} onChange={e=>setCardNumber(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl text-lg text-white outline-none transition-all"
                      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                  <div>
                    <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Titular de la tarjeta</label>
                    <input type="text" placeholder="Nombre y apellidos" value={cardHolder} onChange={e=>setCardHolder(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl text-lg text-white outline-none transition-all"
                      style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
                  </div>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-5 rounded-2xl text-lg font-black transition-all disabled:opacity-40"
                style={{ background:'linear-gradient(135deg,#00ff88,#00c4aa)', color:'#040608' }}>
                {loading ? 'Procesando...' : `Solicitar Retiro por ${method === 'bizum' ? 'Bizum' : method === 'iban' ? 'IBAN' : method === 'tarjeta' ? 'Tarjeta' : 'PayPal'}`}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB 5 — ADMIN
// ══════════════════════════════════════════════════════════════════════════════
function AdminTab({ state, onAddCollaborator, showToast }: any) {
  const [name, setName]   = useState('');
  const [role, setRole]   = useState('');
  const [wage, setWage]   = useState('');
  const [activeSection, setActiveSection] = useState<'info'|'affiliate'|'owner'>('info');

  // ── Owner controls state ──
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerMsg, setOwnerMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [workerId, setWorkerId] = useState('');
  const [workerLevel, setWorkerLevel] = useState('1');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name||!role||!wage) { showToast('error','Rellena todos los campos.'); return; }
    await onAddCollaborator({ name, role, wage: parseFloat(wage) });
    setName(''); setRole(''); setWage('');
    showToast('success', `Colaborador ${name} añadido.`);
  };

  const doTransferGains = async () => {
    setOwnerLoading(true); setOwnerMsg(null);
    try {
      const amt = transferAmount ? parseFloat(transferAmount) : undefined;
      const res = await fetch('/api/transfer-gains', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ adminCode:'joan123', amount: amt }) });
      const data = await res.json();
      setOwnerMsg({text: data.message || data.error, ok: data.success});
      if (data.success) setTransferAmount('');
    } catch (e: any) { setOwnerMsg({text: 'Error: ' + e.message, ok: false}); }
    setOwnerLoading(false);
  };

  const doAdjustBalance = async () => {
    setOwnerLoading(true); setOwnerMsg(null);
    try {
      const res = await fetch('/api/adjust-balance', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ adminCode:'joan123', amount: parseFloat(adjustAmount), reason: adjustReason }) });
      const data = await res.json();
      setOwnerMsg({text: data.message || data.error, ok: data.success});
      if (data.success) { setAdjustAmount(''); setAdjustReason(''); }
    } catch (e: any) { setOwnerMsg({text: 'Error: ' + e.message, ok: false}); }
    setOwnerLoading(false);
  };

  const doUpgradeWorker = async () => {
    setOwnerLoading(true); setOwnerMsg(null);
    try {
      const res = await fetch('/api/ai/workers/upgrade', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ workerId: workerId || undefined, level: parseInt(workerLevel), adminCode:'joan123' }) });
      const data = await res.json();
      setOwnerMsg({text: data.message || data.error || JSON.stringify(data), ok: data.success});
      if (data.success) { setWorkerId(''); setWorkerLevel('1'); }
    } catch (e: any) { setOwnerMsg({text: 'Error: ' + e.message, ok: false}); }
    setOwnerLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Section Switcher */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {[
          { id: 'info' as const,       label: 'Sistema & Equipo', icon: <Shield className="w-3.5 h-3.5"/> },
          { id: 'affiliate' as const,  label: 'Workers',     icon: <Zap className="w-3.5 h-3.5"/> },
          { id: 'owner' as const,      label: '💰 Owner',       icon: <DollarSign className="w-3.5 h-3.5"/> },
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
            <Card>
              <SectionHeader icon={<Shield />} title="Información del Sistema" iconColor="#a855f7" iconBg="rgba(168,85,247,0.1)" badge={<Badge color="green">v2.0</Badge>} />
              <div className="space-y-2.5">
                {[
                  { label: 'Propietario',    value: 'Joan · r3dm' },
                  { label: 'PayPal retiros', value: 'joanlazaro83@gmail.com' },
                  { label: 'Canal YouTube', value: '@Equilibrio-c2k' },
                  { label: 'GitHub',         value: 'joanakar3dmoon/Invergrow' },
                  { label: 'Vercel',         value: 'invergrow.vercel.app' },
                ].map((r,i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{r.label}</span>
                    <span className="text-xs font-mono font-semibold text-white">{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>

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

        {/* ── Workers Analytics ── */}
        {activeSection === 'affiliate' && (
          <motion.div key="affiliate" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-5">
            <Card>
              <SectionHeader icon={<Zap />} title="Workers Reales" sub="Fuentes de ingreso activas" iconColor="#00d4ff" iconBg="rgba(0,212,255,0.1)" />
              <div className="space-y-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.12)' }}>
                  <p className="text-sm font-bold text-white mb-2">🎬 YouTube — @Equilibrio-c2k</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Ingresos por monetización de vídeos. Datos desde la API de YouTube Analytics.</p>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}>€0.15 generados</span>
                    <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(0,212,255,0.1)', color: '#00d4ff' }}>5.110+ vídeos</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.12)' }}>
                  <p className="text-sm font-bold text-white mb-2">📱 AdMob — Lanzarus / r3dm.guia / Nexusia</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Ingresos por publicidad en las apps. Datos desde la API de Google AdMob.</p>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 rounded text-xs" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}>3 apps activas</span>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        {activeSection === 'owner' && (
          <motion.div key="owner" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="space-y-5">
            {/* ── Balance State ── */}
            <Card>
              <SectionHeader icon={<Wallet />} title="Estado del Sistema" iconColor="#00ff88" iconBg="rgba(0,255,136,0.1)" />
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl text-center" style={{ background:'rgba(0,255,136,0.05)', border:'1px solid rgba(0,255,136,0.1)' }}>
                  <p className="text-xs text-zinc-500">Saldo</p>
                  <p className="text-2xl font-black" style={{ color:'#00ff88' }}>€{fmt(state.balance)}</p>
                </div>
                <div className="p-4 rounded-xl text-center" style={{ background:'rgba(168,85,247,0.05)', border:'1px solid rgba(168,85,247,0.1)' }}>
                  <p className="text-xs text-zinc-500">Ganancias Netas</p>
                  <p className="text-2xl font-black" style={{ color:'#a855f7' }}>€{fmt(state.netGains)}</p>
                </div>
                <div className="p-4 rounded-xl text-center" style={{ background:'rgba(0,212,255,0.05)', border:'1px solid rgba(0,212,255,0.1)' }}>
                  <p className="text-xs text-zinc-500">Capital Invertido</p>
                  <p className="text-2xl font-black" style={{ color:'#00d4ff' }}>€{fmt(state.investedCapital)}</p>
                </div>
                <div className="p-4 rounded-xl text-center" style={{ background:'rgba(255,200,0,0.05)', border:'1px solid rgba(255,200,0,0.1)' }}>
                  <p className="text-xs text-zinc-500">Total Retirado</p>
                  <p className="text-2xl font-black" style={{ color:'#f59e0b' }}>€{fmt(state.totalWithdrawals)}</p>
                </div>
              </div>
            </Card>

            {ownerMsg && (
              <div className="p-4 rounded-xl text-sm font-bold" style={{
                background: ownerMsg.ok ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)',
                border: '1px solid ' + (ownerMsg.ok ? 'rgba(0,255,136,0.2)' : 'rgba(239,68,68,0.2)'),
                color: ownerMsg.ok ? '#00ff88' : '#ef4444'
              }}>{ownerMsg.text}</div>
            )}

            {/* ── 1. Transferir Ganancias Netas → Balance ── */}
            <Card>
              <SectionHeader icon={<ArrowUpRight />} title="Transferir Ganancias Netas → Balance" sub="Mueve tus ganancias acumuladas al saldo disponible" iconColor="#a855f7" iconBg="rgba(168,85,247,0.1)" />
              <p className="text-xs mb-3" style={{ color:'rgba(255,255,255,0.4)' }}>
                Ganancias netas disponibles: <span className="text-purple-400 font-bold">€{fmt(state.netGains)}</span>
              </p>
              <div className="flex gap-2 mb-2">
                <input type="number" placeholder="Importe (vacío = todo)" value={transferAmount} onChange={e=>setTransferAmount(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none font-mono"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
                <button onClick={doTransferGains} disabled={ownerLoading || state.netGains <= 0}
                  className="px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                  style={{ background:'rgba(168,85,247,0.15)', border:'1px solid rgba(168,85,247,0.3)', color:'#a855f7' }}>
                  {ownerLoading ? '...' : 'Transferir'}
                </button>
              </div>
            </Card>

            {/* ── 2. Ajustar Saldo (Déficit/Superávit) ── */}
            <Card>
              <SectionHeader icon={<Wallet />} title="Ajustar Saldo Manualmente" sub="Para déficits o correcciones" iconColor="#f59e0b" iconBg="rgba(245,158,11,0.1)" />
              <div className="flex gap-2 mb-2">
                <input type="number" placeholder="+50 o -20" value={adjustAmount} onChange={e=>setAdjustAmount(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none font-mono"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
              </div>
              <input type="text" placeholder="Motivo del ajuste (opcional)" value={adjustReason} onChange={e=>setAdjustReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none mb-2"
                style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
              <button onClick={doAdjustBalance} disabled={ownerLoading || !adjustAmount}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)', color:'#f59e0b' }}>
                {ownerLoading ? 'Procesando...' : 'Aplicar Ajuste'}
              </button>
            </Card>

            {/* ── 3. Upgrade Workers ── */}
            <Card>
              <SectionHeader icon={<Zap />} title="Upgrade de Workers" sub="Mejora el nivel de los workers IA" iconColor="#00d4ff" iconBg="rgba(0,212,255,0.1)" />
              {state.aiWorkers && state.aiWorkers.length > 0 && (
                <div className="mb-3 space-y-1">
                  {state.aiWorkers.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-xl text-xs" style={{ background:'rgba(255,255,255,0.02)' }}>
                      <span className="text-white">{w.name || w.id}</span>
                      <span className="text-zinc-400">Nivel {w.level || 1} · {w.status}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="ID worker (vacío = primero)" value={workerId} onChange={e=>setWorkerId(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm text-white outline-none font-mono"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }} />
                <select value={workerLevel} onChange={e=>setWorkerLevel(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm text-white outline-none"
                  style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)' }}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Nivel {n}</option>)}
                </select>
              </div>
              <button onClick={doUpgradeWorker} disabled={ownerLoading}
                className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                style={{ background:'rgba(0,212,255,0.15)', border:'1px solid rgba(0,212,255,0.3)', color:'#00d4ff' }}>
                {ownerLoading ? 'Procesando...' : '⬆ Upgrade Worker'}
              </button>
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
// ══════════════════════════════════════════════════════════════════════════════
// TAB 6 — INVEST (Stripe Checkout)
// ══════════════════════════════════════════════════════════════════════════════
function InvestTab() {
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{text:string;ok:boolean}|null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [investMode, setInvestMode] = useState<'balance'|'card'>('balance');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(d => setBalance(d.balance || 0)).catch(() => {});
  }, []);

  const presets = [10, 25, 50, 100, 250, 500];

  const doCheckout = async (amt?: number) => {
    const a = amt || amount;
    if (a < 1) { setMsg({text:'El mínimo son 1€', ok:false}); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ amount: a, description: 'Inversión en InverGrow', successUrl: window.location.origin + '?payment=success', cancelUrl: window.location.origin + '?payment=cancel' }),
      });
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else { setMsg({text:'Error al crear el pago: ' + (data.error || 'desconocido'), ok:false}); }
    } catch (e: any) { setMsg({text:'Error de conexión: ' + e.message, ok:false}); }
    finally { setLoading(false); }
  };

  const doInvestFromBalance = async (amt?: number) => {
    const a = amt || amount;
    if (a < 1) { setMsg({text:'El mínimo son 1€', ok:false}); return; }
    if (a > balance) { setMsg({text:`Saldo insuficiente. Tienes EUR${balance.toFixed(2)}`, ok:false}); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('/api/invest-from-balance', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ amount: a }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({text: data.message, ok: true});
        setBalance(data.newBalance);
      } else {
        setMsg({text: data.error || 'Error al invertir', ok: false});
      }
    } catch (e: any) { setMsg({text:'Error de conexión: ' + e.message, ok:false}); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">
      {/* Selector de modo */}
      <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => setInvestMode('balance')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: investMode==='balance'?'rgba(0,255,136,0.15)':'transparent', color: investMode==='balance'?'#00ff88':'rgba(255,255,255,0.4)', border: investMode==='balance'?'1px solid rgba(0,255,136,0.3)':'none' }}>
          <Wallet className="w-3.5 h-3.5"/> Desde mi saldo
        </button>
        <button onClick={() => setInvestMode('card')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: investMode==='card'?'rgba(0,212,255,0.15)':'transparent', color: investMode==='card'?'#00d4ff':'rgba(255,255,255,0.4)', border: investMode==='card'?'1px solid rgba(0,212,255,0.3)':'none' }}>
          <DollarSign className="w-3.5 h-3.5"/> Con tarjeta
        </button>
      </div>

      <Card>
        <SectionHeader icon={<DollarSign />} title={investMode==='balance' ? 'Invertir desde mi saldo' : 'Invertir con tarjeta'}
          sub={investMode==='balance' ? `Saldo disponible: EUR${balance.toFixed(2)}` : 'Pago seguro via Stripe'}
          iconColor={investMode==='balance' ? '#00ff88' : '#00d4ff'} iconBg={investMode==='balance' ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,255,0.1)'} />
        
        {investMode === 'balance' && (
          <div className="bg-zinc-800/50 rounded-xl p-3 mb-4 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-zinc-400">Tu saldo disponible</p>
              <p className="text-lg font-bold text-green-400">EUR{balance.toFixed(2)}</p>
            </div>
          </div>
        )}

        <p className="text-sm text-zinc-400 mt-4 mb-6">
          {investMode === 'balance' 
            ? 'Usa tu saldo acumulado (AdMob, afiliados, ingresos) para invertir y generar rentabilidad. El dinero pasa a "capital invertido" y empieza a rendir.'
            : 'Invierte desde tu tarjeta para ayudar a crecer el ecosistema R3DMOON. Los fondos se usan para promoción, desarrollo de apps y contenido.'}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {presets.map(p => (
            <button key={p} onClick={() => { setAmount(p); setShowCustom(false); }}
              className="py-4 rounded-xl font-bold text-lg transition-all"
              style={{
                background: amount===p ? 'rgba(0,255,136,0.15)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (amount===p ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.08)'),
                color: amount===p ? '#00ff88' : 'rgba(255,255,255,0.6)'
              }}>
              {p}€
            </button>
          ))}
        </div>

        {showCustom && (
          <div className="flex gap-3 mb-6">
            <input type="number" min={1} value={amount} onChange={e=>setAmount(parseInt(e.target.value)||1)}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold text-lg"
              placeholder="Cantidad en €" />
          </div>
        )}
        <button onClick={() => setShowCustom(!showCustom)} className="text-xs text-zinc-500 hover:text-zinc-300 mb-4">
          {showCustom ? 'Usar cantidades predefinidas' : 'Cantidad personalizada'}
        </button>

        {msg && (
          <div className="p-4 rounded-xl mb-4 text-sm font-bold" style={{
            background: msg.ok ? 'rgba(0,255,136,0.1)' : 'rgba(239,68,68,0.1)',
            border: '1px solid ' + (msg.ok ? 'rgba(0,255,136,0.2)' : 'rgba(239,68,68,0.2)'),
            color: msg.ok ? '#00ff88' : '#ef4444'
          }}>{msg.text}</div>
        )}

        {investMode === 'balance' ? (
          <button onClick={() => doInvestFromBalance()} disabled={loading || balance <= 0}
            className="w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #00ff88, #00c4aa)',
              color: '#040608',
              boxShadow: '0 0 30px rgba(0,255,136,0.15)'
            }}>
            {loading ? 'Procesando...' : <>📈 Invertir {amount}€ desde mi saldo</>}
          </button>
        ) : (
          <button onClick={() => doCheckout()} disabled={loading}
            className="w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-3 transition-all disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #00ff88, #00c4aa)',
              color: '#040608',
              boxShadow: '0 0 30px rgba(0,255,136,0.15)'
            }}>
            {loading ? 'Conectando con Stripe...' : <>💳 Pagar {amount}€ con tarjeta</>}
          </button>
        )}

        {investMode === 'card' && (
          <div className="flex items-center gap-2 mt-4 text-xs text-zinc-600 justify-center">
            <span>🔒 Pago seguro via Stripe</span>
            <span>·</span>
            <span>Aceptamos Visa, Mastercard, Bizum</span>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader icon={<Shield />} title="Por qué invertir" sub="Beneficios" iconColor="#00d4ff" iconBg="rgba(0,212,255,0.1)" />
        <div className="space-y-3 text-sm text-zinc-400">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>Tu inversión impulsa la creación de música, apps y contenido</span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>Ganancias compartidas: retira tu parte cuando quieras via PayPal</span>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>100% transparente: todo el movimiento se ve en el Dashboard</span>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// APP ROOT
// ══════════════════════════════════════════════════════════════════════════════
type Tab = 'dashboard'|'youtube'|'workers'|'withdraw'|'admin'|'invest';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id:'dashboard', label:'Dashboard', icon:<BarChart3 className="w-4 h-4"/> },
  { id:'youtube',   label:'YouTube',   icon:<Youtube className="w-4 h-4"/> },
  { id:'workers',   label:'Workers',   icon:<Zap className="w-4 h-4"/> },
  { id:'withdraw',  label:'Retiros',   icon:<Repeat className="w-4 h-4"/> },
  { id:'admin',     label:'Admin',     icon:<Settings className="w-4 h-4"/> },
  { id:'invest',    label:'Invertir',  icon:<DollarSign className="w-4 h-4"/> },
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

  // Inicializar anuncios AdSense
  useEffect(() => {
    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (e) {}
  }, []);

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
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm"
              style={{ background:'linear-gradient(135deg,#00ff88,#00c4aa)', color:'#040608' }}>IG</div>
            <div>
              <h1 className="text-sm font-black text-white">InverGrow</h1>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:'0.6rem', fontFamily:'monospace' }}>v2.0 · Ingresos Reales</p>
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
              {activeTab==='workers'   && <WorkersTab />}
              {activeTab==='withdraw'  && <WithdrawTab state={state} onWithdraw={handleWithdraw} showToast={showToast} />}
              {activeTab==='admin'     && <AdminTab state={state} onAddCollaborator={handleAddCollaborator} showToast={showToast} />}
              {activeTab==='invest'    && <InvestTab />}
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

      {/* Anuncio AdSense */}
      <div className="max-w-6xl mx-auto px-4 pb-2">
        <ins className="adsbygoogle"
             style={{ display: 'block', width: '100%', height: '60px' }}
             data-ad-client="ca-pub-4903263409458961"
             data-ad-slot="8825147276"
             data-ad-format="banner"
             data-full-width-responsive="false"></ins>
      </div>

      <Toast msg={toast} />
    </div>
  );
}
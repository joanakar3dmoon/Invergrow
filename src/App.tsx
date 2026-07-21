import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp, Wallet, Activity, Users, ArrowUpRight, ArrowDownLeft,
  RefreshCw, Sparkles, Youtube, DollarSign, Zap, BarChart3,
  CheckCircle2, AlertCircle, ChevronRight, Settings, Bot,
  Send, Brain, Target, PieChart, Flame, Star, Shield,
  MessageCircle, X, Maximize2, LayoutDashboard, CreditCard,
  Cpu, TrendingDown, Clock, Banknote, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SystemState } from './types';

// ── Utils ─────────────────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${n}`;
const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY || '';
const BACKEND = import.meta.env.VITE_BACKEND_URL || 'https://invergrow.vercel.app';

// ── Datos reales del usuario ───────────────────────────────────────────────────
const ADMOB_DATA = [
  { app: 'Lanzarus',  revenue: 8.20,  ecpm: 1.40, impressions: 5840, color: '#00ff88', icon: '🚀' },
  { app: 'r3dm/guia', revenue: 5.60,  ecpm: 0.90, impressions: 6222, color: '#00d4ff', icon: '🗺️' },
  { app: 'Nexusia',   revenue: 3.10,  ecpm: 0.75, impressions: 4133, color: '#a855f7', icon: '🤖' },
];
const YT_DATA = { subscribers: 1240, views: 48320, revenue: 42.80, videos: 23 };
const AFFILIATE_DATA = { clicks: 342, conversions: 18, revenue: 12.40 };
const TOTAL_REVENUE = ADMOB_DATA.reduce((a,b)=>a+b.revenue,0) + YT_DATA.revenue + AFFILIATE_DATA.revenue;

// ── Fondo animado ─────────────────────────────────────────────────────────────
function AnimatedBg() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div style={{
        position:'absolute', width:'600px', height:'600px',
        borderRadius:'50%', top:'-100px', left:'-100px',
        background:'radial-gradient(circle, rgba(0,255,136,0.06) 0%, transparent 70%)',
        filter:'blur(40px)', animation:'float1 20s ease-in-out infinite'
      }}/>
      <div style={{
        position:'absolute', width:'500px', height:'500px',
        borderRadius:'50%', bottom:'-80px', right:'-80px',
        background:'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)',
        filter:'blur(40px)', animation:'float2 25s ease-in-out infinite'
      }}/>
      <div style={{
        position:'absolute', width:'400px', height:'400px',
        borderRadius:'50%', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
        background:'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)',
        filter:'blur(40px)', animation:'float3 18s ease-in-out infinite'
      }}/>
      {/* Grid lines */}
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',opacity:0.03}}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>
      <style>{`
        @keyframes float1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.05)} }
        @keyframes float2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,30px) scale(0.95)} }
        @keyframes float3 { 0%,100%{transform:translate(-50%,-50%) scale(1)} 50%{transform:translate(-50%,-50%) scale(1.1)} }
        @keyframes pulse-glow { 0%,100%{box-shadow:0 0 20px rgba(0,255,136,0.3)} 50%{box-shadow:0 0 40px rgba(0,255,136,0.6)} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
      `}</style>
    </div>
  );
}

// ── Glass Card ────────────────────────────────────────────────────────────────
function GlassCard({ children, className='', glow, onClick }: { children:React.ReactNode; className?:string; glow?:string; onClick?:()=>void }) {
  return (
    <motion.div
      whileHover={{ scale: onClick ? 1.02 : 1, y: onClick ? -2 : 0 }}
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${glow ? glow+'22' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '20px',
        boxShadow: glow ? `0 0 30px ${glow}11, inset 0 1px 0 rgba(255,255,255,0.05)` : 'inset 0 1px 0 rgba(255,255,255,0.05)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ children, color='#00ff88' }: { children:React.ReactNode; color?:string }) {
  return (
    <span style={{
      background: color+'15', color, border: `1px solid ${color}33`,
      borderRadius: '8px', padding: '2px 10px', fontSize: '11px', fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.5px'
    }}>
      {children}
    </span>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color='#00ff88', icon, trend }: any) {
  return (
    <GlassCard glow={color} className="p-6 relative overflow-hidden">
      <div style={{position:'absolute',top:-20,right:-20,width:80,height:80,borderRadius:'50%',background:color+'08'}}/>
      <div className="flex items-start justify-between mb-3">
        <div style={{
          background: color+'15', border: `1px solid ${color}30`,
          borderRadius: '12px', padding: '10px', color
        }}>
          {icon}
        </div>
        {trend !== undefined && (
          <div style={{
            display:'flex', alignItems:'center', gap:'4px',
            color: trend >= 0 ? '#00ff88' : '#ff4444',
            fontSize: '13px', fontWeight: 600
          }}>
            {trend >= 0 ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div style={{
        fontSize:'clamp(24px,3vw,36px)', fontWeight:800,
        fontFamily:"'Space Grotesk', sans-serif", color:'#fff',
        lineHeight:1.1, letterSpacing:'-1px'
      }}>
        {value}
      </div>
      <div style={{color:'rgba(255,255,255,0.4)', fontSize:'13px', marginTop:'4px', fontWeight:500}}>
        {label}
      </div>
      {sub && (
        <div style={{color, fontSize:'12px', marginTop:'6px', fontWeight:600, fontFamily:"'JetBrains Mono', monospace"}}>
          {sub}
        </div>
      )}
    </GlassCard>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color='#00ff88' }: { data:number[]; color?:string }) {
  const max = Math.max(...data), min = Math.min(...data), range = max-min||1;
  const W=300, H=80;
  const pts = data.map((v,i)=>`${(i/(data.length-1))*W},${H-((v-min)/range)*H*0.8-8}`);
  const d = `M ${pts.join(' L ')}`;
  const fill = `${d} L ${W},${H} L 0,${H} Z`;
  const id = `sg${color.replace('#','')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{height:'80px'}} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${id})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={(data.length-1)/(data.length-1)*W} cy={H-((data[data.length-1]-min)/range)*H*0.8-8} r="4" fill={color}/>
    </svg>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ state }: { state: SystemState }) {
  const totalAdmob = ADMOB_DATA.reduce((a,b)=>a+b.revenue,0);
  const sparkData = [12,18,15,22,19,28,24,32,29,38,35,42];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'24px'}}>

      {/* KPI row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'16px'}}>
        <MetricCard label="Ingresos totales (mes)" value={`€${fmt(TOTAL_REVENUE)}`} color="#00ff88" icon={<DollarSign size={20}/>} trend={12.4}/>
        <MetricCard label="Balance disponible" value={`€${fmt(state.balance)}`} color="#00d4ff" icon={<Wallet size={20}/>} trend={8.1}/>
        <MetricCard label="AdMob acumulado" value={`€${fmt(totalAdmob)}`} color="#a855f7" icon={<Zap size={20}/>} trend={5.3}/>
        <MetricCard label="Reinversión" value={`€${fmt(state.reinvestmentFund)}`} color="#f59e0b" icon={<RefreshCw size={20}/>}/>
      </div>

      {/* Gráfico principal + AdMob breakdown */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'16px'}}>
        <GlassCard className="p-6" glow="#00ff88">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:'13px',marginBottom:'4px'}}>Rendimiento 12 meses</div>
              <div style={{color:'#fff',fontSize:'28px',fontWeight:800,fontFamily:"'Space Grotesk',sans-serif"}}>€{fmt(TOTAL_REVENUE * 12)}</div>
            </div>
            <Badge color="#00ff88">+32% vs año anterior</Badge>
          </div>
          <Sparkline data={sparkData} color="#00ff88"/>
          <div style={{display:'flex',gap:'24px',marginTop:'12px'}}>
            {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].map((m,i)=>(
              <div key={m} style={{flex:1,textAlign:'center',color:'rgba(255,255,255,0.3)',fontSize:'10px'}}>{m}</div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6" glow="#a855f7">
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:'13px',marginBottom:'20px'}}>AdMob por app</div>
          <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
            {ADMOB_DATA.map(app=>(
              <div key={app.app}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',alignItems:'center'}}>
                  <span style={{color:'#fff',fontWeight:600,fontSize:'14px'}}>{app.icon} {app.app}</span>
                  <span style={{color:app.color,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>€{fmt(app.revenue)}</span>
                </div>
                <div style={{background:'rgba(255,255,255,0.06)',borderRadius:'6px',height:'6px',overflow:'hidden'}}>
                  <motion.div
                    initial={{width:0}}
                    animate={{width:`${(app.revenue/ADMOB_DATA[0].revenue)*100}%`}}
                    transition={{duration:1,ease:'easeOut'}}
                    style={{height:'100%',borderRadius:'6px',background:`linear-gradient(90deg,${app.color},${app.color}88)`}}
                  />
                </div>
                <div style={{color:'rgba(255,255,255,0.3)',fontSize:'11px',marginTop:'4px',fontFamily:"'JetBrains Mono',monospace"}}>
                  eCPM: €{app.ecpm} · {fmtK(app.impressions)} imp.
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* YouTube + Afiliados */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        <GlassCard className="p-6" glow="#ff0000">
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
            <div style={{background:'#ff000020',border:'1px solid #ff000040',borderRadius:'12px',padding:'10px',color:'#ff4444'}}>
              <Youtube size={22}/>
            </div>
            <div>
              <div style={{color:'#fff',fontWeight:700,fontSize:'16px'}}>Canal Equilibrio</div>
              <div style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>@Equilibrio-c2k</div>
            </div>
            <Badge color="#ff4444">LIVE</Badge>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {[
              {label:'Ingresos/mes', value:`€${fmt(YT_DATA.revenue)}`, color:'#ff4444'},
              {label:'Suscriptores', value:fmtK(YT_DATA.subscribers), color:'#fff'},
              {label:'Visualizaciones', value:fmtK(YT_DATA.views), color:'#fff'},
              {label:'Vídeos', value:`${YT_DATA.videos}`, color:'#fff'},
            ].map(item=>(
              <div key={item.label} style={{background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'12px'}}>
                <div style={{color:item.color,fontWeight:700,fontSize:'18px',fontFamily:"'Space Grotesk',sans-serif"}}>{item.value}</div>
                <div style={{color:'rgba(255,255,255,0.3)',fontSize:'11px',marginTop:'2px'}}>{item.label}</div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6" glow="#f59e0b">
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px'}}>
            <div style={{background:'#f59e0b20',border:'1px solid #f59e0b40',borderRadius:'12px',padding:'10px',color:'#f59e0b'}}>
              <Package size={22}/>
            </div>
            <div>
              <div style={{color:'#fff',fontWeight:700,fontSize:'16px'}}>Amazon Afiliados</div>
              <div style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>Tracking: r3dm01-21</div>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
            {[
              {label:'Ingresos', value:`€${fmt(AFFILIATE_DATA.revenue)}`, color:'#f59e0b'},
              {label:'Clicks', value:`${AFFILIATE_DATA.clicks}`, color:'#fff'},
              {label:'Ventas', value:`${AFFILIATE_DATA.conversions}`, color:'#fff'},
            ].map(item=>(
              <div key={item.label} style={{background:'rgba(255,255,255,0.04)',borderRadius:'12px',padding:'12px',textAlign:'center'}}>
                <div style={{color:item.color,fontWeight:700,fontSize:'20px',fontFamily:"'Space Grotesk',sans-serif"}}>{item.value}</div>
                <div style={{color:'rgba(255,255,255,0.3)',fontSize:'11px',marginTop:'2px'}}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:'16px',background:'rgba(245,158,11,0.08)',borderRadius:'12px',padding:'12px'}}>
            <div style={{color:'#f59e0b',fontSize:'12px',fontWeight:600}}>Conversión: {((AFFILIATE_DATA.conversions/AFFILIATE_DATA.clicks)*100).toFixed(1)}%</div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:'11px',marginTop:'2px'}}>Ratio por encima de media del sector (4.2%)</div>
          </div>
        </GlassCard>
      </div>

      {/* Transacciones recientes */}
      <GlassCard className="p-6">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'20px'}}>
          <div style={{color:'#fff',fontWeight:700,fontSize:'16px'}}>Transacciones recientes</div>
          <Badge color="#00d4ff">Ver todas</Badge>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {(state.transactions||[]).slice(0,5).map((tx,i)=>(
            <motion.div key={tx.id} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',
                background:'rgba(255,255,255,0.03)',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
                <div style={{
                  width:36,height:36,borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',
                  background: tx.type.includes('WITHDRAW') ? 'rgba(255,68,68,0.15)' : 'rgba(0,255,136,0.15)',
                  color: tx.type.includes('WITHDRAW') ? '#ff4444' : '#00ff88'
                }}>
                  {tx.type.includes('WITHDRAW') ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                </div>
                <div>
                  <div style={{color:'#fff',fontWeight:600,fontSize:'14px'}}>{tx.description}</div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:'12px',fontFamily:"'JetBrains Mono',monospace"}}>{tx.date}</div>
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{color: tx.type.includes('WITHDRAW')?'#ff4444':'#00ff88',fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>
                  {tx.type.includes('WITHDRAW') ? '-' : '+'}€{fmt(tx.amount)}
                </div>
                <Badge color={tx.status==='COMPLETED'?'#00ff88':tx.status==='PENDING'?'#f59e0b':'#ff4444'}>{tx.status}</Badge>
              </div>
            </motion.div>
          ))}
          {(!state.transactions||state.transactions.length===0) && (
            <div style={{textAlign:'center',padding:'40px',color:'rgba(255,255,255,0.2)'}}>Sin transacciones aún</div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}

// ── AI Investment Bot ─────────────────────────────────────────────────────────
interface Message { role:'user'|'ai'; text:string; ts:string; }

function AIBotTab() {
  const [messages, setMessages] = useState<Message[]>([{
    role:'ai',
    text:`¡Hola Joan! 👋 Soy tu **Asesor AI de Inversiones**. Analizo tus ingresos reales en tiempo real:\n\n💰 **Total mes:** €${fmt(TOTAL_REVENUE)}\n📱 **AdMob:** €${fmt(ADMOB_DATA.reduce((a,b)=>a+b.revenue,0))}\n▶️ **YouTube:** €${fmt(YT_DATA.revenue)}\n🛒 **Afiliados:** €${fmt(AFFILIATE_DATA.revenue)}\n\n¿Qué quieres saber? Puedo darte estrategias de reinversión, análisis de tus apps, previsiones de ingresos o consejos para escalar.`,
    ts: new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[messages]);

  const SYSTEM_PROMPT = `Eres un asesor financiero AI experto en inversión, especializado en monetización digital y apps móviles. 
Trabajas con Joan (aka R3DMOON/J.Quasar), músico independiente español con ingresos digitales.

DATOS REALES DEL USUARIO (actualizados):
- AdMob Lanzarus: €8.20/mes, eCPM €1.40, 5840 impresiones
- AdMob r3dm/guia: €5.60/mes, eCPM €0.90, 6222 impresiones  
- AdMob Nexusia: €3.10/mes, eCPM €0.75, 4133 impresiones
- YouTube Equilibrio: €42.80/mes, 1240 suscriptores, 48320 views
- Amazon Afiliados (r3dm01-21): €12.40/mes, 342 clicks, 18 ventas
- TOTAL MENSUAL: €${fmt(TOTAL_REVENUE)}
- TOTAL ANUAL ESTIMADO: €${fmt(TOTAL_REVENUE * 12)}

Responde siempre en español, de forma directa y útil. Da consejos concretos, datos reales, estrategias accionables. 
Usa emojis con moderación. Sé conciso pero completo. Cuando calcules proyecciones usa los datos reales de arriba.`;

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    const userMsg: Message = { role:'user', text, ts: new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) };
    setMessages(prev=>[...prev,userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m=>({
        role: m.role==='user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [...history, { role:'user', parts:[{text}] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
        })
      });

      const data = await res.json();
      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Error al obtener respuesta.';
      setMessages(prev=>[...prev,{ role:'ai', text:aiText, ts: new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) }]);
    } catch(e) {
      setMessages(prev=>[...prev,{ role:'ai', text:'❌ Error de conexión con Gemini. Verifica tu API key en las variables de entorno.', ts:'' }]);
    }
    setLoading(false);
  }

  function renderText(text: string) {
    // Markdown básico
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  }

  const QUICK = [
    '¿Dónde reinvertir mis ingresos?',
    'Previsión a 6 meses',
    '¿Cómo subir el eCPM?',
    'Estrategia para escalar',
    'Apps más rentables',
    'Diversificar ingresos',
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',height:'calc(100vh - 180px)',gap:'16px'}}>
      
      {/* Header stats del bot */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'12px'}}>
        {[
          {label:'Ingresos/mes',value:`€${fmt(TOTAL_REVENUE)}`,color:'#00ff88',icon:<DollarSign size={16}/>},
          {label:'Proyección anual',value:`€${fmt(TOTAL_REVENUE*12)}`,color:'#00d4ff',icon:<TrendingUp size={16}/>},
          {label:'Apps activas',value:'3',color:'#a855f7',icon:<Zap size={16}/>},
          {label:'Fuentes de ingreso',value:'3',color:'#f59e0b',icon:<Target size={16}/>},
        ].map(s=>(
          <GlassCard key={s.label} className="p-4" glow={s.color}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'6px',color:s.color}}>{s.icon}</div>
            <div style={{color:'#fff',fontWeight:700,fontSize:'18px',fontFamily:"'Space Grotesk',sans-serif"}}>{s.value}</div>
            <div style={{color:'rgba(255,255,255,0.3)',fontSize:'11px'}}>{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Chat container */}
      <GlassCard className="flex-1 flex flex-col overflow-hidden" style={{minHeight:0}}>
        {/* Chat header */}
        <div style={{
          padding:'16px 20px',
          borderBottom:'1px solid rgba(255,255,255,0.06)',
          display:'flex',alignItems:'center',gap:'12px'
        }}>
          <div style={{
            width:42,height:42,borderRadius:'50%',
            background:'linear-gradient(135deg,#00ff88,#00d4ff)',
            display:'flex',alignItems:'center',justifyContent:'center',
            boxShadow:'0 0 20px rgba(0,255,136,0.4)'
          }}>
            <Brain size={22} color="#000"/>
          </div>
          <div>
            <div style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>Asesor AI de Inversiones</div>
            <div style={{color:'#00ff88',fontSize:'12px',fontFamily:"'JetBrains Mono',monospace",display:'flex',alignItems:'center',gap:'6px'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#00ff88',display:'inline-block',animation:'pulse-glow 2s infinite'}}/>
              Online · Gemini 2.0 Flash
            </div>
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:'8px'}}>
            <Badge color="#00ff88">Datos reales</Badge>
            <Badge color="#00d4ff">IA activa</Badge>
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflowY:'auto',padding:'20px',display:'flex',flexDirection:'column',gap:'16px'}}>
          <AnimatePresence>
            {messages.map((msg,i)=>(
              <motion.div key={i}
                initial={{opacity:0,y:10,scale:0.98}}
                animate={{opacity:1,y:0,scale:1}}
                style={{display:'flex',justifyContent:msg.role==='user'?'flex-end':'flex-start'}}
              >
                {msg.role==='ai' && (
                  <div style={{
                    width:32,height:32,borderRadius:'50%',flexShrink:0,marginRight:'10px',
                    background:'linear-gradient(135deg,#00ff8833,#00d4ff33)',
                    border:'1px solid #00ff8844',
                    display:'flex',alignItems:'center',justifyContent:'center',color:'#00ff88'
                  }}>
                    <Bot size={16}/>
                  </div>
                )}
                <div style={{maxWidth:'75%'}}>
                  <div style={{
                    padding:'14px 18px',
                    borderRadius: msg.role==='user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    background: msg.role==='user'
                      ? 'linear-gradient(135deg,#00ff8820,#00d4ff20)'
                      : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${msg.role==='user' ? '#00ff8840' : 'rgba(255,255,255,0.08)'}`,
                    color:'rgba(255,255,255,0.9)',
                    fontSize:'14px',
                    lineHeight:1.6,
                    fontFamily:"'Inter',sans-serif"
                  }} dangerouslySetInnerHTML={{__html:renderText(msg.text)}}/>
                  <div style={{color:'rgba(255,255,255,0.2)',fontSize:'11px',marginTop:'4px',
                    textAlign:msg.role==='user'?'right':'left',
                    fontFamily:"'JetBrains Mono',monospace"}}>
                    {msg.ts}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} style={{display:'flex',gap:'10px',alignItems:'center'}}>
              <div style={{
                width:32,height:32,borderRadius:'50%',
                background:'linear-gradient(135deg,#00ff8833,#00d4ff33)',
                border:'1px solid #00ff8844',
                display:'flex',alignItems:'center',justifyContent:'center',color:'#00ff88'
              }}>
                <Bot size={16}/>
              </div>
              <div style={{
                padding:'14px 18px',background:'rgba(255,255,255,0.04)',
                borderRadius:'18px 18px 18px 4px',border:'1px solid rgba(255,255,255,0.08)',
                display:'flex',gap:'6px',alignItems:'center'
              }}>
                {[0,1,2].map(i=>(
                  <motion.div key={i} animate={{y:[0,-6,0]}} transition={{repeat:Infinity,duration:0.8,delay:i*0.15}}
                    style={{width:6,height:6,borderRadius:'50%',background:'#00ff88'}}/>
                ))}
              </div>
            </motion.div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Quick questions */}
        <div style={{padding:'0 20px 12px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
          {QUICK.map(q=>(
            <button key={q} onClick={()=>{setInput(q);inputRef.current?.focus();}}
              style={{
                background:'rgba(0,255,136,0.06)',border:'1px solid rgba(0,255,136,0.2)',
                borderRadius:'20px',padding:'6px 14px',color:'rgba(255,255,255,0.6)',
                fontSize:'12px',cursor:'pointer',transition:'all 0.2s',fontFamily:"'Inter',sans-serif"
              }}
              onMouseEnter={e=>{(e.target as HTMLElement).style.background='rgba(0,255,136,0.15)';(e.target as HTMLElement).style.color='#fff';}}
              onMouseLeave={e=>{(e.target as HTMLElement).style.background='rgba(0,255,136,0.06)';(e.target as HTMLElement).style.color='rgba(255,255,255,0.6)';}}
            >{q}</button>
          ))}
        </div>

        {/* Input */}
        <div style={{
          padding:'16px 20px',
          borderTop:'1px solid rgba(255,255,255,0.06)',
          display:'flex',gap:'12px',alignItems:'flex-end'
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();}}}
            placeholder="Pregunta sobre inversión, estrategias, previsiones..."
            rows={1}
            style={{
              flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:'14px',padding:'12px 16px',color:'#fff',fontSize:'14px',
              resize:'none',outline:'none',fontFamily:"'Inter',sans-serif",lineHeight:1.5,
              maxHeight:'120px',overflowY:'auto',
              transition:'border-color 0.2s'
            }}
            onFocus={e=>{e.target.style.borderColor='rgba(0,255,136,0.4)';}}
            onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,0.1)';}}
          />
          <button onClick={sendMessage} disabled={loading||!input.trim()}
            style={{
              width:46,height:46,borderRadius:'14px',border:'none',cursor:'pointer',
              background: input.trim()&&!loading ? 'linear-gradient(135deg,#00ff88,#00d4ff)' : 'rgba(255,255,255,0.06)',
              display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,
              transition:'all 0.2s',
              color: input.trim()&&!loading ? '#000' : 'rgba(255,255,255,0.2)',
            }}>
            <Send size={18}/>
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

// ── Withdraw Tab ──────────────────────────────────────────────────────────────
function WithdrawTab({ state, onWithdraw, showToast }: any) {
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState(localStorage.getItem('invergrow_iban') || '');
  const [ibanOwner, setIbanOwner] = useState(localStorage.getItem('invergrow_iban_owner') || '');
  const [method, setMethod] = useState<'paypal'|'iban'>(localStorage.getItem('invergrow_method') as any || 'paypal');
  const [loading, setLoading] = useState(false);
  const [reinvestPct, setReinvestPct] = useState(30);

  function savePrefs() {
    localStorage.setItem('invergrow_iban', iban);
    localStorage.setItem('invergrow_iban_owner', ibanOwner);
    localStorage.setItem('invergrow_method', method);
  }

  async function handleWithdraw() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || amt > state.balance) { showToast('error', 'Cantidad inválida'); return; }
    if (method === 'iban' && !iban) { showToast('error', 'Introduce tu IBAN'); return; }
    savePrefs();
    setLoading(true);
    await onWithdraw(amt, method, iban, ibanOwner);
    setAmount('');
    setLoading(false);
  }

  const toReceive = parseFloat(amount||'0') * (1 - reinvestPct/100);
  const toReinvest = parseFloat(amount||'0') * reinvestPct/100;

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'24px',maxWidth:'700px',margin:'0 auto'}}>
      <GlassCard className="p-8" glow="#00ff88">
        {/* Balance */}
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#00ff88,#00d4ff)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 0 40px rgba(0,255,136,0.3)'}}>
            <Banknote size={32} color="#000"/>
          </div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:'13px',marginBottom:'8px'}}>Balance disponible</div>
          <div style={{color:'#00ff88',fontSize:'48px',fontWeight:800,fontFamily:"'Space Grotesk',sans-serif",letterSpacing:'-2px'}}>
            €{fmt(state.balance)}
          </div>
        </div>

        {/* Método */}
        <div style={{display:'flex',gap:'12px',marginBottom:'20px'}}>
          {(['paypal','iban'] as const).map(m => (
            <button key={m} onClick={()=>setMethod(m)} style={{
              flex:1,padding:'12px',borderRadius:'12px',border:'none',cursor:'pointer',fontWeight:700,fontSize:'13px',
              background: method===m ? 'linear-gradient(135deg,#00ff88,#00d4ff)' : 'rgba(255,255,255,0.05)',
              color: method===m ? '#000' : 'rgba(255,255,255,0.5)',
              transition:'all 0.2s'
            }}>
              {m==='paypal' ? '🅿️ PayPal' : '🏦 IBAN'}
            </button>
          ))}
        </div>

        {/* Campos IBAN */}
        {method === 'iban' && (
          <div style={{marginBottom:'20px',display:'flex',flexDirection:'column',gap:'12px'}}>
            <div>
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:'12px',marginBottom:'6px'}}>IBAN</div>
              <input value={iban} onChange={e=>setIban(e.target.value.toUpperCase())}
                placeholder="ES00 0000 0000 0000 0000 0000"
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(0,255,136,0.3)',borderRadius:'12px',padding:'12px 16px',color:'#fff',fontSize:'14px',fontFamily:"'JetBrains Mono',monospace",outline:'none',boxSizing:'border-box'}}
              />
            </div>
            <div>
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:'12px',marginBottom:'6px'}}>Titular</div>
              <input value={ibanOwner} onChange={e=>setIbanOwner(e.target.value)}
                placeholder="Nombre Apellido"
                style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(0,255,136,0.3)',borderRadius:'12px',padding:'12px 16px',color:'#fff',fontSize:'14px',outline:'none',boxSizing:'border-box'}}
              />
            </div>
          </div>
        )}

        {/* Cantidad */}
        <div style={{marginBottom:'20px'}}>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:'13px',marginBottom:'8px'}}>Cantidad a retirar</div>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:'16px',top:'50%',transform:'translateY(-50%)',color:'#00ff88',fontWeight:700,fontSize:'18px'}}>€</span>
            <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0.00"
              style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(0,255,136,0.3)',borderRadius:'14px',padding:'16px 16px 16px 36px',color:'#fff',fontSize:'24px',fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",outline:'none',boxSizing:'border-box'}}
            />
          </div>
        </div>

        {/* Reinversión */}
        <div style={{marginBottom:'24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px'}}>
            <span style={{color:'rgba(255,255,255,0.4)',fontSize:'13px'}}>Reinvertir automáticamente</span>
            <span style={{color:'#00ff88',fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{reinvestPct}%</span>
          </div>
          <input type="range" min={0} max={100} value={reinvestPct} onChange={e=>setReinvestPct(+e.target.value)}
            style={{width:'100%',accentColor:'#00ff88',height:'6px'}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'6px'}}>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>Recibes: <strong style={{color:'#fff'}}>€{fmt(toReceive)}</strong></span>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>Reinviertes: <strong style={{color:'#f59e0b'}}>€{fmt(toReinvest)}</strong></span>
          </div>
        </div>

        {/* Botón */}
        <button onClick={handleWithdraw} disabled={loading||!amount}
          style={{width:'100%',padding:'16px',borderRadius:'14px',border:'none',cursor:'pointer',background:'linear-gradient(135deg,#00ff88,#00d4ff)',color:'#000',fontWeight:800,fontSize:'16px',fontFamily:"'Space Grotesk',sans-serif",opacity:loading||!amount?0.5:1,boxShadow:'0 0 30px rgba(0,255,136,0.3)',transition:'all 0.2s'}}>
          {loading ? 'Procesando...' : method==='iban' ? '🏦 Solicitar retiro por IBAN' : '💸 Solicitar retiro a PayPal'}
        </button>
        <div style={{textAlign:'center',marginTop:'12px',color:'rgba(255,255,255,0.2)',fontSize:'12px',fontFamily:"'JetBrains Mono',monospace"}}>
          {method==='iban' ? (iban || 'Sin IBAN guardado') : 'joanlazaro83@gmail.com'}
        </div>
      </GlassCard>

      <GlassCard className="p-6" glow="#f59e0b">
        <div style={{color:'#fff',fontWeight:700,marginBottom:'16px',display:'flex',alignItems:'center',gap:'8px'}}>
          <Activity size={18} color="#f59e0b"/>
          Historial de retiros
        </div>
        {(state.transactions||[]).filter((t:any)=>t.type.includes('WITHDRAW')).slice(0,5).map((tx:any,i:number)=>(
          <div key={tx.id} style={{display:'flex',justifyContent:'space-between',padding:'12px 0',
            borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <div>
              <div style={{color:'#fff',fontSize:'14px',fontWeight:600}}>{tx.description}</div>
              <div style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>{tx.date}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{color:'#ff4444',fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>-€{fmt(tx.amount)}</div>
              <Badge color={tx.status==='COMPLETED'?'#00ff88':'#f59e0b'}>{tx.status}</Badge>
            </div>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}

// ── Admin Tab ─────────────────────────────────────────────────────────────────
function AdminTab({ state, onAddCollaborator, showToast }: any) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [wage, setWage] = useState('');

  function addCollaborator() {
    if (!name || !wage) return;
    onAddCollaborator({ name, role, wage: parseFloat(wage) });
    setName(''); setRole(''); setWage('');
    showToast('success','Colaborador añadido');
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'24px'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        <GlassCard className="p-6" glow="#00d4ff">
          <div style={{color:'#fff',fontWeight:700,fontSize:'16px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'8px'}}>
            <Users size={18} color="#00d4ff"/>Colaboradores
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {(state.collaborators||[]).map((c:any)=>(
              <div key={c.id} style={{
                display:'flex',alignItems:'center',justifyContent:'space-between',
                padding:'12px',background:'rgba(255,255,255,0.03)',borderRadius:'12px',
                border:'1px solid rgba(255,255,255,0.06)'
              }}>
                <div>
                  <div style={{color:'#fff',fontWeight:600,fontSize:'14px'}}>{c.name}</div>
                  <div style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>{c.role}</div>
                </div>
                <div style={{color:'#00d4ff',fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>€{fmt(c.wage)}/mes</div>
              </div>
            ))}
            {(!state.collaborators||state.collaborators.length===0) && (
              <div style={{textAlign:'center',padding:'30px',color:'rgba(255,255,255,0.2)'}}>Sin colaboradores</div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-6" glow="#a855f7">
          <div style={{color:'#fff',fontWeight:700,fontSize:'16px',marginBottom:'20px'}}>➕ Añadir colaborador</div>
          {[
            {label:'Nombre',value:name,set:setName,placeholder:'Nombre completo'},
            {label:'Rol',value:role,set:setRole,placeholder:'Diseñador, Dev...'},
            {label:'Salario/mes (€)',value:wage,set:setWage,placeholder:'0.00',type:'number'},
          ].map(f=>(
            <div key={f.label} style={{marginBottom:'12px'}}>
              <div style={{color:'rgba(255,255,255,0.4)',fontSize:'12px',marginBottom:'6px'}}>{f.label}</div>
              <input value={f.value} onChange={e=>f.set(e.target.value)} placeholder={f.placeholder} type={f.type||'text'}
                style={{
                  width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:'10px',padding:'10px 14px',color:'#fff',fontSize:'14px',outline:'none',
                  boxSizing:'border-box',fontFamily:"'Inter',sans-serif"
                }}/>
            </div>
          ))}
          <button onClick={addCollaborator}
            style={{
              width:'100%',padding:'12px',borderRadius:'10px',border:'none',cursor:'pointer',
              background:'linear-gradient(135deg,#a855f7,#7c3aed)',color:'#fff',fontWeight:700
            }}>
            Añadir
          </button>
        </GlassCard>
      </div>

      {/* Sistema stats */}
      <GlassCard className="p-6">
        <div style={{color:'#fff',fontWeight:700,fontSize:'16px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'8px'}}>
          <Settings size={18} color="#00ff88"/>Sistema
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px'}}>
          {[
            {label:'Capital invertido',value:`€${fmt(state.investedCapital||0)}`,color:'#00ff88'},
            {label:'Total retirado',value:`€${fmt(state.totalWithdrawals||0)}`,color:'#ff4444'},
            {label:'Fondo reinversión',value:`€${fmt(state.reinvestmentFund||0)}`,color:'#f59e0b'},
            {label:'Ganancias netas',value:`€${fmt(state.netGains||0)}`,color:'#00d4ff'},
          ].map(s=>(
            <div key={s.label} style={{background:'rgba(255,255,255,0.03)',borderRadius:'12px',padding:'16px',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{color:s.color,fontWeight:700,fontSize:'20px',fontFamily:"'Space Grotesk',sans-serif"}}>{s.value}</div>
              <div style={{color:'rgba(255,255,255,0.3)',fontSize:'12px',marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts }: { toasts: any[] }) {
  return (
    <div style={{position:'fixed',bottom:24,right:24,zIndex:9999,display:'flex',flexDirection:'column',gap:'8px'}}>
      <AnimatePresence>
        {toasts.map(t=>(
          <motion.div key={t.id}
            initial={{opacity:0,x:40,scale:0.9}}
            animate={{opacity:1,x:0,scale:1}}
            exit={{opacity:0,x:40,scale:0.9}}
            style={{
              display:'flex',alignItems:'center',gap:'10px',padding:'14px 18px',
              background:t.type==='success'?'rgba(0,255,136,0.1)':'rgba(255,68,68,0.1)',
              border:`1px solid ${t.type==='success'?'rgba(0,255,136,0.3)':'rgba(255,68,68,0.3)'}`,
              borderRadius:'14px',backdropFilter:'blur(20px)',color:'#fff',fontSize:'14px',
              fontFamily:"'Inter',sans-serif",maxWidth:'320px'
            }}>
            {t.type==='success' ? <CheckCircle2 size={18} color="#00ff88"/> : <AlertCircle size={18} color="#ff4444"/>}
            {t.msg}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
type Tab = 'dashboard'|'bot'|'binance'|'withdraw'|'admin';

const TABS: {id:Tab; label:string; icon:React.ReactNode; color:string}[] = [
  {id:'dashboard', label:'Dashboard',   icon:<LayoutDashboard size={18}/>, color:'#00ff88'},
  {id:'bot',       label:'AI Asesor',   icon:<Brain size={18}/>,           color:'#00d4ff'},
  {id:'binance',   label:'Bot ₿',       icon:<span style={{fontSize:'16px'}}>₿</span>,       color:'#f59e0b'},
  {id:'withdraw',  label:'Retiros',     icon:<CreditCard size={18}/>,      color:'#f59e0b'},
  {id:'admin',     label:'Admin',       icon:<Settings size={18}/>,        color:'#a855f7'},
];

const DEFAULT_STATE: SystemState = {
  balance: 72.10, investedCapital: 200, totalWithdrawals: 50,
  reinvestmentFund: 30, netGains: 22.10,
  collaborators: [], transactions: [], webhookLogs: [], aiWorkers: [],
  aiLogs: [], apiConfig: { geminiConnected: true, distributionWebhook:'', targetMarket:'ES', payoutModel:'SPLIT_70_30' }
};

// ─── Binance Bot Panel ───────────────────────────────────────────────────────
function BinanceBotPanel({ showToast, balance }: { showToast: any; balance: number }) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [investing, setInvesting] = useState(false);
  const [pct, setPct] = useState(30);

  async function checkStatus() {
    setLoading(true);
    try {
      const r = await fetch(`${BACKEND}/api/binance/status`);
      const d = await r.json();
      setStatus(d);
    } catch { showToast('error', 'Error al conectar con Binance'); }
    setLoading(false);
  }

  async function invest() {
    setInvesting(true);
    try {
      const r = await fetch(`${BACKEND}/api/binance/invest`, { method: 'POST' });
      const d = await r.json();
      if (d.success) {
        showToast('success', d.message);
        checkStatus();
      } else {
        showToast('error', d.error || d.message || 'Error al invertir');
      }
    } catch { showToast('error', 'Error de conexión'); }
    setInvesting(false);
  }

  const toInvest = parseFloat((balance * pct / 100).toFixed(2));

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'20px',maxWidth:'700px',margin:'0 auto'}}>
      <GlassCard className="p-8" glow="#f59e0b">
        <div style={{textAlign:'center',marginBottom:'28px'}}>
          <div style={{
            width:72,height:72,borderRadius:'50%',
            background:'linear-gradient(135deg,#f59e0b,#ff6b00)',
            display:'flex',alignItems:'center',justifyContent:'center',
            margin:'0 auto 16px',boxShadow:'0 0 40px rgba(245,158,11,0.3)'
          }}>
            <span style={{fontSize:'32px'}}>₿</span>
          </div>
          <div style={{color:'#f59e0b',fontWeight:800,fontSize:'22px',fontFamily:"'Space Grotesk',sans-serif"}}>
            Bot de Reinversión Binance
          </div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:'13px',marginTop:'8px'}}>
            Invierte automáticamente tus ganancias en crypto
          </div>
        </div>

        {!status?.connected ? (
          <div style={{
            background:'rgba(255,255,255,0.04)',borderRadius:'14px',padding:'20px',
            border:'1px solid rgba(245,158,11,0.2)',textAlign:'center',marginBottom:'20px'
          }}>
            <div style={{color:'#f59e0b',fontWeight:700,marginBottom:'8px'}}>⚠️ Binance no conectado</div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:'13px',lineHeight:'1.6'}}>
              Para activar el bot necesitas añadir en Vercel:<br/>
              <code style={{color:'#00ff88',fontSize:'12px'}}>BINANCE_API_KEY</code> y <code style={{color:'#00ff88',fontSize:'12px'}}>BINANCE_API_SECRET</code>
            </div>
          </div>
        ) : (
          <div style={{
            background:'rgba(0,255,136,0.06)',borderRadius:'14px',padding:'16px',
            border:'1px solid rgba(0,255,136,0.2)',marginBottom:'20px'
          }}>
            <div style={{color:'#00ff88',fontWeight:700,marginBottom:'12px'}}>✅ Binance conectado</div>
            {(status.balances||[]).map((b:any,i:number)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',
                borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                <span style={{color:'rgba(255,255,255,0.6)',fontSize:'13px'}}>{b.asset}</span>
                <span style={{color:'#fff',fontWeight:600,fontSize:'13px'}}>{parseFloat(b.free).toFixed(6)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Slider reinversión */}
        <div style={{marginBottom:'24px'}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
            <span style={{color:'rgba(255,255,255,0.6)',fontSize:'14px'}}>% a reinvertir</span>
            <span style={{color:'#f59e0b',fontWeight:700,fontSize:'16px'}}>{pct}%</span>
          </div>
          <input type="range" min={5} max={100} step={5} value={pct}
            onChange={e=>setPct(Number(e.target.value))}
            style={{width:'100%',accentColor:'#f59e0b',height:'6px'}}/>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:'8px'}}>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>
              Invertir: <strong style={{color:'#f59e0b'}}>€{toInvest}</strong>
            </span>
            <span style={{color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>
              Retener: <strong style={{color:'#00ff88'}}>€{fmt(balance - toInvest)}</strong>
            </span>
          </div>
        </div>

        <div style={{display:'flex',gap:'12px'}}>
          <button onClick={checkStatus} disabled={loading}
            style={{
              flex:1,padding:'14px',borderRadius:'12px',border:'1px solid rgba(245,158,11,0.3)',
              background:'transparent',color:'#f59e0b',fontWeight:700,fontSize:'14px',cursor:'pointer',
              opacity: loading ? 0.5 : 1
            }}>
            {loading ? '...' : '🔄 Verificar estado'}
          </button>
          <button onClick={invest} disabled={investing || !status?.connected || toInvest < 10}
            style={{
              flex:2,padding:'14px',borderRadius:'12px',border:'none',cursor:'pointer',
              background:'linear-gradient(135deg,#f59e0b,#ff6b00)',
              color:'#000',fontWeight:800,fontSize:'15px',
              opacity: (investing || !status?.connected || toInvest < 10) ? 0.5 : 1,
              boxShadow:'0 0 30px rgba(245,158,11,0.3)'
            }}>
            {investing ? 'Invirtiendo...' : `₿ Invertir €${toInvest} ahora`}
          </button>
        </div>
        {toInvest < 10 && (
          <div style={{textAlign:'center',marginTop:'10px',color:'rgba(255,255,255,0.3)',fontSize:'12px'}}>
            Mínimo €10 para invertir (balance actual: €{fmt(balance)})
          </div>
        )}
      </GlassCard>

      {/* Info */}
      <GlassCard className="p-6" glow="#8b5cf6">
        <div style={{color:'#fff',fontWeight:700,marginBottom:'12px',fontSize:'15px'}}>📋 Cómo funciona</div>
        {[
          ['1', 'Tus ingresos (AdMob/YouTube) se acumulan en InverGrow'],
          ['2', 'El bot coge el % que configures y compra crypto en Binance'],
          ['3', 'La compra queda registrada automáticamente'],
          ['4', 'Puedes activar inversión automática periódica (diaria/semanal)'],
        ].map(([n,t])=>(
          <div key={n} style={{display:'flex',gap:'12px',padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
            <div style={{
              width:24,height:24,borderRadius:'50%',
              background:'linear-gradient(135deg,#8b5cf6,#6366f1)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:'11px',fontWeight:800,color:'#fff',flexShrink:0
            }}>{n}</div>
            <div style={{color:'rgba(255,255,255,0.6)',fontSize:'13px',lineHeight:'1.5'}}>{t}</div>
          </div>
        ))}
      </GlassCard>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [state, setState] = useState<SystemState>(DEFAULT_STATE);
  const [toasts, setToasts] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  function showToast(type:'success'|'error', msg:string) {
    const id = Date.now();
    setToasts(prev=>[...prev,{id,type,msg}]);
    setTimeout(()=>setToasts(prev=>prev.filter(t=>t.id!==id)), 4000);
  }

  async function fetchState() {
    try {
      const r = await fetch(`${BACKEND}/api/state`);
      if (r.ok) setState(await r.json());
    } catch {}
  }

  async function handleWithdraw(amount: number, method = 'paypal', iban = '', ibanOwner = '') {
    try {
      const res = await fetch(`${BACKEND}/api/withdraw`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ amount, method, iban, ibanOwner })
      });
      const data = await res.json();
      await fetchState();
      if (data.success) {
        if (data.paypalError || method === 'iban') {
          showToast('info', `✅ Retiro de €${amount.toFixed(2)} registrado — recibirás email con instrucciones`);
        } else {
          showToast('success', `✅ Retiro de €${amount.toFixed(2)} enviado a PayPal`);
        }
      } else {
        showToast('error', data.error || 'Error al procesar retiro');
      }
    } catch { showToast('error','Error al procesar retiro'); }
  }

  function handleAddCollaborator(c: any) {
    setState(prev=>({...prev,collaborators:[...prev.collaborators,{...c,id:Date.now().toString(),lastPaymentDate:''}]}));
  }

  useEffect(()=>{ fetchState(); },[]);

  return (
    <div style={{
      minHeight:'100vh', background:'#040608', color:'#fff',
      fontFamily:"'Inter', sans-serif", position:'relative'
    }}>
      <AnimatedBg/>

      {/* Header */}
      <header style={{
        position:'sticky',top:0,zIndex:40,
        background:'rgba(4,6,8,0.8)', backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(255,255,255,0.06)',
        padding:'0 24px',
      }}>
        <div style={{maxWidth:'1400px',margin:'0 auto',display:'flex',alignItems:'center',height:'64px',gap:'16px'}}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:'10px',marginRight:'8px'}}>
            <div style={{
              width:36,height:36,borderRadius:'10px',
              background:'linear-gradient(135deg,#00ff88,#00d4ff)',
              display:'flex',alignItems:'center',justifyContent:'center',
              boxShadow:'0 0 20px rgba(0,255,136,0.3)'
            }}>
              <TrendingUp size={20} color="#000"/>
            </div>
            <span style={{fontWeight:800,fontSize:'18px',fontFamily:"'Space Grotesk',sans-serif",
              background:'linear-gradient(135deg,#00ff88,#00d4ff)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
              InverGrow
            </span>
          </div>

          {/* Tabs */}
          <nav style={{display:'flex',gap:'4px',flex:1}}>
            {TABS.map(tab=>(
              <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                style={{
                  display:'flex',alignItems:'center',gap:'8px',padding:'8px 16px',
                  borderRadius:'10px',border:'none',cursor:'pointer',fontSize:'14px',fontWeight:600,
                  transition:'all 0.2s',fontFamily:"'Inter',sans-serif",
                  background: activeTab===tab.id ? `${tab.color}15` : 'transparent',
                  color: activeTab===tab.id ? tab.color : 'rgba(255,255,255,0.4)',
                  boxShadow: activeTab===tab.id ? `0 0 20px ${tab.color}15` : 'none',
                }}>
                <span style={{color: activeTab===tab.id ? tab.color : 'rgba(255,255,255,0.3)'}}>
                  {tab.icon}
                </span>
                {tab.label}
                {tab.id==='bot' && (
                  <span style={{
                    background:'linear-gradient(135deg,#00ff88,#00d4ff)',color:'#000',
                    borderRadius:'6px',padding:'1px 6px',fontSize:'10px',fontWeight:700
                  }}>NEW</span>
                )}
              </button>
            ))}
          </nav>

          {/* Right */}
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',
              background:'rgba(0,255,136,0.08)',border:'1px solid rgba(0,255,136,0.2)',
              borderRadius:'20px',padding:'6px 14px'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:'#00ff88'}}/>
              <span style={{color:'#00ff88',fontSize:'13px',fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>
                €{fmt(TOTAL_REVENUE)}/mes
              </span>
            </div>
            <button onClick={async()=>{setIsRefreshing(true);await fetchState();setIsRefreshing(false);showToast('success','Actualizado');}}
              style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:'10px',padding:'8px',cursor:'pointer',color:'rgba(255,255,255,0.5)',display:'flex'}}>
              <RefreshCw size={16} style={{animation:isRefreshing?'spin 1s linear infinite':'none'}}/>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{maxWidth:'1400px',margin:'0 auto',padding:'24px',position:'relative',zIndex:10}}>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab}
            initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}
            transition={{duration:0.2}}>
            {activeTab==='dashboard' && <DashboardTab state={state}/>}
            {activeTab==='bot'       && <AIBotTab/>}
            {activeTab==='binance'   && <BinanceBotPanel showToast={showToast} balance={state.balance}/>}
            {activeTab==='withdraw'  && <WithdrawTab state={state} onWithdraw={handleWithdraw} showToast={showToast}/>}
            {activeTab==='admin'     && <AdminTab state={state} onAddCollaborator={handleAddCollaborator} showToast={showToast}/>}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav mobile */}
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:40,
        background:'rgba(4,6,8,0.9)',backdropFilter:'blur(24px)',
        borderTop:'1px solid rgba(255,255,255,0.06)',
        display:'flex',padding:'8px 16px 12px',
        '@media(min-width:768px)':{display:'none'}
      } as any} className="md:hidden">
        {TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            style={{
              flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',
              border:'none',background:'transparent',cursor:'pointer',padding:'6px',
              color: activeTab===tab.id ? tab.color : 'rgba(255,255,255,0.3)',
              fontSize:'10px',fontFamily:"'Inter',sans-serif",fontWeight:600,transition:'color 0.2s'
            }}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
        .md\\:hidden { display: flex !important; }
        @media(min-width:768px) { .md\\:hidden { display: none !important; } }
      `}</style>

      <Toast toasts={toasts}/>
    </div>
  );
}

export default App;

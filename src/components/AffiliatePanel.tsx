import React, { useState } from 'react';
import {
  ShoppingCart, TrendingUp, ExternalLink, Star, Tag,
  Megaphone, BarChart3, Globe, Zap, Music, BookOpen,
  Cpu, Monitor, DollarSign, RefreshCw, Copy, Check
} from 'lucide-react';

// Tracking ID de Amazon España de Joan
const TRACKING_ID = 'r3dm01-21';

// Google AdSense Publisher ID de Joan (cuenta AdMob/AdSense compartida)
const ADSENSE_PUB_ID = 'ca-pub-4903263409458961';

interface AffiliateProduct {
  id: string;
  title: string;
  category: string;
  price: string;
  rating: number;
  asin: string;
  description: string;
  commissionRate: string;
  estimatedCommission: string;
  badge?: string;
  badgeColor?: string;
}

const PRODUCTS: AffiliateProduct[] = [
  {
    id: '1',
    title: 'Curso de Inversión en Bolsa para Principiantes',
    category: 'Finanzas',
    price: '24.99',
    rating: 4.5,
    asin: 'B09XXXXXX1',
    description: 'El libro de referencia para aprender a invertir en ETFs, acciones y fondos indexados desde cero.',
    commissionRate: '4,5%',
    estimatedCommission: '1.12',
    badge: 'Más vendido',
    badgeColor: 'orange'
  },
  {
    id: '2',
    title: 'Teclado MIDI USB 25 Teclas Arturia MiniLab MkII',
    category: 'Música',
    price: '89.99',
    rating: 4.7,
    asin: 'B07XXXXXX2',
    description: 'Controlador MIDI compacto, perfecto para producción musical electrónica y síntesis acid.',
    commissionRate: '4,0%',
    estimatedCommission: '3.60',
    badge: 'Para músicos',
    badgeColor: 'blue'
  },
  {
    id: '3',
    title: 'SSD Externo Samsung T7 1TB USB 3.2',
    category: 'Electrónica',
    price: '99.90',
    rating: 4.8,
    asin: 'MU-PC1T0T',
    description: 'Almacenamiento ultrarrápido para proyectos musicales y backups. Ideal para producción.',
    commissionRate: '3,0%',
    estimatedCommission: '3.00',
    badge: 'Alta velocidad',
    badgeColor: 'emerald'
  },
  {
    id: '4',
    title: 'Auriculares Monitor Sony MDR-7506',
    category: 'Audio',
    price: '109.00',
    rating: 4.6,
    asin: 'B000AJIF4E',
    description: 'Auriculares profesionales de referencia, estándar de la industria para mezcla y mastering.',
    commissionRate: '4,0%',
    estimatedCommission: '4.36',
    badge: 'Pro',
    badgeColor: 'purple'
  },
  {
    id: '5',
    title: 'Padre Rico Padre Pobre — Robert Kiyosaki',
    category: 'Finanzas',
    price: '14.99',
    rating: 4.6,
    asin: '8466329730',
    description: 'El libro de finanzas personales más vendido del mundo. Imprescindible para la independencia financiera.',
    commissionRate: '4,5%',
    estimatedCommission: '0.67',
    badge: 'Clásico',
    badgeColor: 'amber'
  },
  {
    id: '6',
    title: 'Interfaz de Audio Focusrite Scarlett Solo 4th Gen',
    category: 'Audio',
    price: '129.99',
    rating: 4.7,
    asin: 'B09XXXXXX6',
    description: 'La interfaz de audio más popular para músicos independientes. Calidad de estudio en casa.',
    commissionRate: '4,0%',
    estimatedCommission: '5.20',
    badge: 'Grabación',
    badgeColor: 'red'
  },
  {
    id: '7',
    title: 'Roland TR-08 Drum Machine',
    category: 'Música',
    price: '399.00',
    rating: 4.8,
    asin: 'B073XXXXXR',
    description: 'La legendaria caja de ritmos TR-808 en formato compacto. Perfecta para acid techno y electrónica.',
    commissionRate: '4,0%',
    estimatedCommission: '15.96',
    badge: 'Top ventas',
    badgeColor: 'emerald'
  },
  {
    id: '8',
    title: 'Monitor de Estudio KRK Rokit 5 G4',
    category: 'Audio',
    price: '199.00',
    rating: 4.5,
    asin: 'B07XXXXXKR',
    description: 'Monitores de referencia activos de campo cercano, ideales para producción electrónica.',
    commissionRate: '4,0%',
    estimatedCommission: '7.96',
    badge: 'Estudio',
    badgeColor: 'yellow'
  },
  {
    id: '9',
    title: 'El Inversor Inteligente — Benjamin Graham',
    category: 'Finanzas',
    price: '19.99',
    rating: 4.7,
    asin: '8423427390',
    description: 'La biblia del value investing. El libro que Warren Buffett recomienda a todo inversor.',
    commissionRate: '4,5%',
    estimatedCommission: '0.90',
    badge: 'Inversión',
    badgeColor: 'blue'
  }
];

const BADGE_COLORS: Record<string, string> = {
  orange: 'bg-orange-950/60 text-orange-400 border-orange-800/30',
  blue: 'bg-blue-950/60 text-blue-400 border-blue-800/30',
  emerald: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/30',
  purple: 'bg-purple-950/60 text-purple-400 border-purple-800/30',
  amber: 'bg-amber-950/60 text-amber-400 border-amber-800/30',
  red: 'bg-red-950/60 text-red-400 border-red-800/30',
  yellow: 'bg-yellow-950/60 text-yellow-400 border-yellow-800/30',
};

// Snippets de AdSense
const ADSENSE_SNIPPETS = [
  {
    id: 'banner',
    label: 'Banner horizontal (728×90)',
    description: 'Ideal para cabecera o pie de página',
    slot: '1234567890',
    code: `<!-- InverGrow AdSense Banner -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}" crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:inline-block;width:728px;height:90px"
     data-ad-client="${ADSENSE_PUB_ID}"
     data-ad-slot="1234567890"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`
  },
  {
    id: 'responsive',
    label: 'Anuncio Responsivo (Auto)',
    description: 'Se adapta a cualquier pantalla automáticamente',
    slot: '0987654321',
    code: `<!-- InverGrow AdSense Responsivo -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}" crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="${ADSENSE_PUB_ID}"
     data-ad-slot="0987654321"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`
  },
  {
    id: 'rectangle',
    label: 'Rectángulo (300×250)',
    description: 'Formato más rentable en sidebar o contenido',
    slot: '1122334455',
    code: `<!-- InverGrow AdSense Rectangle -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}" crossorigin="anonymous"></script>
<ins class="adsbygoogle"
     style="display:inline-block;width:300px;height:250px"
     data-ad-client="${ADSENSE_PUB_ID}"
     data-ad-slot="1122334455"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`
  }
];

function buildAffiliateUrl(asin: string): string {
  return `https://www.amazon.es/dp/${asin}?tag=${TRACKING_ID}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`}
        />
      ))}
      <span className="text-xs text-zinc-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 border border-zinc-600'
      }`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

export default function AffiliatePanel() {
  const [activeTab, setActiveTab] = useState<'amazon' | 'adsense'>('amazon');
  const [filter, setFilter] = useState<string>('Todos');
  const categories = ['Todos', ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
  const filtered = filter === 'Todos' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
  const totalEstimated = PRODUCTS.reduce((sum, p) => sum + parseFloat(p.estimatedCommission), 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Monetización Pasiva</h2>
              <p className="text-zinc-400 text-xs">Afiliados Amazon ES + Google AdSense</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Comisión estimada/venta</div>
            <div className="text-emerald-400 font-bold text-xl">€{totalEstimated.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-orange-950/20 border border-orange-800/20 rounded-xl p-3 text-center">
            <div className="text-white font-bold text-lg">{PRODUCTS.length}</div>
            <div className="text-zinc-500 text-[10px]">Productos afiliados</div>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3 text-center">
            <div className="text-orange-400 font-bold text-lg">3–4,5%</div>
            <div className="text-zinc-500 text-[10px]">Comisión Amazon</div>
          </div>
          <div className="bg-blue-950/20 border border-blue-800/20 rounded-xl p-3 text-center">
            <div className="text-blue-400 font-bold text-lg">3</div>
            <div className="text-zinc-500 text-[10px]">Snippets AdSense</div>
          </div>
          <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-3 text-center">
            <div className="text-emerald-400 font-bold text-lg">ES</div>
            <div className="text-zinc-500 text-[10px]">Amazon España</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('amazon')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'amazon' ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />Afiliados Amazon
        </button>
        <button
          onClick={() => setActiveTab('adsense')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'adsense' ? 'bg-blue-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />Google AdSense
        </button>
      </div>

      {activeTab === 'amazon' ? (
        <>
          {/* Filtros categoría */}
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === cat
                    ? 'bg-orange-500 text-white shadow shadow-orange-500/20'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 border border-zinc-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid de productos */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(product => (
              <div
                key={product.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 hover:border-orange-500/40 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md font-medium">{product.category}</span>
                  {product.badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${BADGE_COLORS[product.badgeColor || 'orange']}`}>
                      {product.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-white font-semibold text-sm leading-tight group-hover:text-orange-300 transition-colors">
                  {product.title}
                </h3>
                <p className="text-zinc-500 text-xs leading-relaxed flex-1">{product.description}</p>
                <StarRating rating={product.rating} />
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                  <div>
                    <div className="text-white font-bold text-base">€{product.price}</div>
                    <div className="text-[10px] text-zinc-500">
                      Comisión <span className="text-emerald-400 font-bold">{product.commissionRate}</span>
                      <span className="text-zinc-600"> · ~€{product.estimatedCommission}</span>
                    </div>
                  </div>
                  <a
                    href={buildAffiliateUrl(product.asin)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all shadow shadow-orange-500/20"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Amazon
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-xs text-zinc-700 py-2 font-mono">
            Comisiones vía Amazon Associates ES · Tracking ID: <span className="text-orange-800">{TRACKING_ID}</span>
          </div>
        </>
      ) : (
        /* AdSense */
        <div className="space-y-5">
          {/* Info AdSense */}
          <div className="bg-blue-950/20 border border-blue-800/30 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Megaphone className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Google AdSense — Ingresos por Anuncios Web</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  AdSense funciona en sitios web/blog. Copia el snippet que quieras y pégalo en el HTML de tu web o CMS (WordPress, etc.).
                  Los anuncios aparecen automáticamente y Google te paga por clics e impresiones.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span className="bg-blue-950 text-blue-400 border border-blue-800/30 px-2 py-1 rounded font-mono">Publisher: {ADSENSE_PUB_ID}</span>
                  <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-1 rounded">Pago mínimo: €70</span>
                  <span className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-1 rounded">Pago mensual automático</span>
                </div>
              </div>
            </div>
          </div>

          {/* Snippets */}
          <div className="space-y-4">
            {ADSENSE_SNIPPETS.map(snippet => (
              <div key={snippet.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
                  <div>
                    <h4 className="text-white font-semibold text-sm">{snippet.label}</h4>
                    <p className="text-zinc-500 text-xs">{snippet.description}</p>
                  </div>
                  <CopyButton text={snippet.code} />
                </div>
                <div className="p-4">
                  <pre className="text-xs text-zinc-400 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-4">
                    {snippet.code}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Guía rápida */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
            <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />Guía rápida de integración
            </h4>
            <div className="space-y-3">
              {[
                { num: '1', text: 'Activa tu cuenta AdSense en google.com/adsense (usa joanlazaro83@gmail.com)' },
                { num: '2', text: 'Verifica tu web/blog añadiendo el snippet de verificación en el <head>' },
                { num: '3', text: 'Copia uno de los snippets de arriba y pégalo en tu HTML donde quieras el anuncio' },
                { num: '4', text: 'Google revisa tu sitio (24-48h) y empieza a mostrar anuncios automáticamente' },
                { num: '5', text: 'Los ingresos se acumulan en tu cuenta y se pagan cuando superas €70' }
              ].map(step => (
                <div key={step.num} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-blue-400">{step.num}</span>
                  </div>
                  <p className="text-zinc-400 text-xs leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-xs text-zinc-700 py-1 font-mono">
            Google AdSense · Publisher ID: {ADSENSE_PUB_ID}
          </div>
        </div>
      )}
    </div>
  );
}

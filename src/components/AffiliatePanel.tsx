import React, { useState } from 'react';
import { ShoppingCart, ExternalLink, Star, TrendingUp, Tag, Copy, CheckCircle2, Info } from 'lucide-react';

const TRACKING_ID = 'r3dm01-21';

const products = [
  {
    id: '1',
    title: 'Padre Rico, Padre Pobre — Robert Kiyosaki',
    category: 'Finanzas',
    price: '14.80',
    rating: 4.7,
    asin: '846633212X',
    description: 'El libro de finanzas personales nº 1 en el mundo. Imprescindible para entender la independencia financiera.',
    commissionRate: '4,5%',
    estimatedCommission: '0.67',
    badge: 'Bestseller',
    badgeColor: 'amber',
    image: 'https://m.media-amazon.com/images/I/81BE7eeKzAL._AC_UY218_.jpg'
  },
  {
    id: '2',
    title: 'El inversor inteligente — Benjamin Graham',
    category: 'Finanzas',
    price: '19.90',
    rating: 4.8,
    asin: '8423420973',
    description: 'La biblia de los inversores. Warren Buffett lo llama el mejor libro sobre inversión jamás escrito.',
    commissionRate: '4,5%',
    estimatedCommission: '0.90',
    badge: 'Clásico',
    badgeColor: 'purple',
    image: 'https://m.media-amazon.com/images/I/71Nkl5bJQaL._AC_UY218_.jpg'
  },
  {
    id: '3',
    title: 'Sony MDR-7506 — Auriculares Monitor Profesionales',
    category: 'Audio',
    price: '109.00',
    rating: 4.7,
    asin: 'B000AJIF4E',
    description: 'El estándar de la industria para mezcla y mastering. Usado en estudios de todo el mundo.',
    commissionRate: '4,0%',
    estimatedCommission: '4.36',
    badge: 'Pro',
    badgeColor: 'blue',
    image: 'https://m.media-amazon.com/images/I/61AoMvKmr5L._AC_UY218_.jpg'
  },
  {
    id: '4',
    title: 'Focusrite Scarlett Solo 4ª Gen — Interfaz Audio USB',
    category: 'Audio',
    price: '154.99',
    rating: 4.6,
    asin: 'B0C5JSHP7M',
    description: 'La interfaz de audio más popular para músicos independientes. Calidad de estudio en casa.',
    commissionRate: '4,0%',
    estimatedCommission: '6.20',
    badge: 'Top ventas',
    badgeColor: 'red',
    image: 'https://m.media-amazon.com/images/I/61f7HCNqprL._AC_UY218_.jpg'
  },
  {
    id: '5',
    title: 'Arturia MiniLab 3 — Controlador MIDI Universal',
    category: 'Música',
    price: '89.00',
    rating: 4.5,
    asin: 'B0BGMNKCNT',
    description: 'Controlador MIDI compacto con 25 teclas y 8 pads. Incluye software de producción musical.',
    commissionRate: '3,5%',
    estimatedCommission: '3.12',
    badge: 'Incluye software',
    badgeColor: 'emerald',
    image: 'https://m.media-amazon.com/images/I/71tOe7CXERL._AC_UY218_.jpg'
  },
  {
    id: '6',
    title: 'Samsung T7 Portable SSD 1TB — USB 3.2',
    category: 'Electrónica',
    price: '89.99',
    rating: 4.8,
    asin: 'B087DFLF9S',
    description: 'SSD externo ultrarrápido (1050 MB/s). Perfecto para proyectos musicales y backups profesionales.',
    commissionRate: '3,0%',
    estimatedCommission: '2.70',
    badge: 'Alta velocidad',
    badgeColor: 'cyan',
    image: 'https://m.media-amazon.com/images/I/71r-QEcHMeL._AC_UY218_.jpg'
  },
  {
    id: '7',
    title: 'Korg Volca Bass — Sintetizador analógico',
    category: 'Música',
    price: '149.00',
    rating: 4.4,
    asin: 'B00BXDVPK2',
    description: 'Sintetizador de bajo analógico con secuenciador de 16 pasos. Ideal para acid techno y electrónica.',
    commissionRate: '3,5%',
    estimatedCommission: '5.22',
    badge: 'Acid/Techno',
    badgeColor: 'orange',
    image: 'https://m.media-amazon.com/images/I/71N2gAI6PXL._AC_UY218_.jpg'
  },
  {
    id: '8',
    title: 'Raspberry Pi 5 (8GB) — Mini computador',
    category: 'Electrónica',
    price: '89.00',
    rating: 4.6,
    asin: 'B0CPWH8FL9',
    description: 'El nuevo Raspberry Pi 5 con 8GB RAM. Para proyectos de automatización, servidores y IA doméstica.',
    commissionRate: '3,0%',
    estimatedCommission: '2.67',
    badge: 'Nuevo 2024',
    badgeColor: 'green',
    image: 'https://m.media-amazon.com/images/I/7525o7V4bzL._AC_UY218_.jpg'
  },
  {
    id: '9',
    title: 'Behringer U-Phoria UM2 — Interfaz audio USB',
    category: 'Audio',
    price: '31.90',
    rating: 4.3,
    asin: 'B00EK1OTZC',
    description: 'Interfaz de audio USB de entrada de gama. Perfecta para empezar a grabar sin gastar mucho.',
    commissionRate: '4,0%',
    estimatedCommission: '1.28',
    badge: 'Económico',
    badgeColor: 'slate',
    image: 'https://m.media-amazon.com/images/I/71vGbrxXbhL._AC_UY218_.jpg'
  }
];

const badgeClasses: Record<string, string> = {
  amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  red: 'bg-red-500/20 text-red-300 border-red-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  orange: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  green: 'bg-green-500/20 text-green-300 border-green-500/30',
  slate: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

function buildAmazonUrl(asin: string) {
  return `https://www.amazon.es/dp/${asin}?tag=${TRACKING_ID}`;
}

export default function AffiliatePanel() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category)))];

  const filtered = selectedCategory === 'Todos'
    ? products
    : products.filter(p => p.category === selectedCategory);

  function copyLink(asin: string, id: string) {
    navigator.clipboard.writeText(buildAmazonUrl(asin));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const totalEstimated = products.reduce((s, p) => s + parseFloat(p.estimatedCommission), 0);

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">{products.length}</div>
          <div className="text-xs text-slate-400 mt-1">Productos activos</div>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">~€{totalEstimated.toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-1">Comisión estimada/venta</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">r3dm01-21</div>
          <div className="text-xs text-slate-400 mt-1">Tracking ID activo</div>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-300">
          Cada enlace incluye tu tracking ID <span className="text-blue-400 font-mono font-semibold">r3dm01-21</span>. 
          Las comisiones se acreditan automáticamente en tu cuenta Amazon Associates ES cuando alguien compra.
        </p>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(product => {
          const url = buildAmazonUrl(product.asin);
          return (
            <div
              key={product.id}
              className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-3 hover:border-slate-600 transition-all"
            >
              {/* Badge + Category */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{product.category}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${badgeClasses[product.badgeColor] || badgeClasses.slate}`}>
                  {product.badge}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-white leading-snug">{product.title}</h3>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed flex-1">{product.description}</p>

              {/* Price + Rating */}
              <div className="flex items-center justify-between">
                <div className="text-lg font-bold text-white">€{product.price}</div>
                <div className="flex items-center gap-1 text-amber-400 text-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{product.rating}</span>
                </div>
              </div>

              {/* Commission info */}
              <div className="flex items-center justify-between bg-emerald-500/10 rounded-lg px-3 py-2">
                <span className="text-xs text-slate-400">Comisión</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-400 font-mono">{product.commissionRate}</span>
                  <span className="text-xs text-emerald-300 font-semibold">≈ €{product.estimatedCommission}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Ver en Amazon
                </a>
                <button
                  onClick={() => copyLink(product.asin, product.id)}
                  className="flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
                  title="Copiar enlace de afiliado"
                >
                  {copiedId === product.id
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    : <Copy className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* AdSense section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-semibold text-white">Google AdSense</h3>
          <span className="ml-auto text-xs text-slate-500">Ingresos por impresiones</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Añade este snippet en el <code className="text-purple-400 bg-purple-500/10 px-1 rounded">&lt;head&gt;</code> de cualquier web tuya para monetizar con anuncios de Google:
        </p>
        <div className="bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-x-auto select-all">
          {`<!-- Google AdSense -->\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"\n  crossorigin="anonymous"></script>`}
        </div>
        <p className="text-xs text-slate-500 mt-3">
          💡 AdSense requiere aprobación previa de Google. Mientras tanto, Amazon Afiliados no tiene requisitos de tráfico mínimo.
        </p>
      </div>
    </div>
  );
}

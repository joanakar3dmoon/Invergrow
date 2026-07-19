import React, { useState } from 'react';
import { ShoppingCart, TrendingUp, ExternalLink, Star, Tag, RefreshCw } from 'lucide-react';

// Tracking ID de Amazon España de Joan
const TRACKING_ID = 'r3dm01-21';

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
}

const PRODUCTS: AffiliateProduct[] = [
  {
    id: '1',
    title: 'Curso de Inversion en Bolsa',
    category: 'Libros de Finanzas',
    price: '24.99',
    rating: 4.5,
    asin: 'B09XXXXXX1',
    description: 'El libro de referencia para aprender a invertir en ETFs, acciones y fondos indexados.',
    commissionRate: '4,5%',
    estimatedCommission: '1.12',
    badge: 'Mas vendido'
  },
  {
    id: '2',
    title: 'Teclado MIDI USB 25 Teclas Arturia MiniLab',
    category: 'Instrumentos Musicales',
    price: '89.99',
    rating: 4.7,
    asin: 'B07XXXXXX2',
    description: 'Controlador MIDI compacto, perfecto para produccion musical electronica.',
    commissionRate: '4,0%',
    estimatedCommission: '3.60',
    badge: 'Para musicos'
  },
  {
    id: '3',
    title: 'SSD Externo Samsung T7 1TB USB 3.2',
    category: 'Electronica',
    price: '99.90',
    rating: 4.8,
    asin: 'B08XXXXXX3',
    description: 'Almacenamiento ultrarapido para proyectos musicales y backups.',
    commissionRate: '3,0%',
    estimatedCommission: '3.00',
    badge: 'Alta velocidad'
  },
  {
    id: '4',
    title: 'Auriculares Monitor Sony MDR-7506',
    category: 'Audio Profesional',
    price: '109.00',
    rating: 4.6,
    asin: 'B000AJIF4E',
    description: 'Auriculares profesionales de referencia, estandar de la industria para mezcla.',
    commissionRate: '4,0%',
    estimatedCommission: '4.36',
    badge: 'Pro'
  },
  {
    id: '5',
    title: 'Padre Rico Padre Pobre Robert Kiyosaki',
    category: 'Libros de Finanzas',
    price: '14.99',
    rating: 4.6,
    asin: '8466329730',
    description: 'El libro de finanzas personales mas vendido del mundo.',
    commissionRate: '4,5%',
    estimatedCommission: '0.67',
    badge: 'Clasico'
  },
  {
    id: '6',
    title: 'Interfaz de Audio Focusrite Scarlett Solo',
    category: 'Audio Profesional',
    price: '129.99',
    rating: 4.7,
    asin: 'B09XXXXXX6',
    description: 'La interfaz de audio mas popular para musicos independientes.',
    commissionRate: '4,0%',
    estimatedCommission: '5.20',
    badge: 'Grabacion'
  }
];

function buildAffiliateUrl(asin: string): string {
  return `https://www.amazon.es/dp/${asin}?tag=${TRACKING_ID}`;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-3 h-3 ${i <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-600'}`} />
      ))}
      <span className="text-xs text-zinc-400 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

export default function AffiliatePanel() {
  const [filter, setFilter] = useState<string>('Todos');
  const categories = ['Todos', ...Array.from(new Set(PRODUCTS.map(p => p.category)))];
  const filtered = filter === 'Todos' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
  const totalEstimated = PRODUCTS.reduce((sum, p) => sum + parseFloat(p.estimatedCommission), 0);

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Afiliados Amazon España</h2>
              <p className="text-zinc-400 text-xs">ID: <span className="text-orange-400 font-mono">{TRACKING_ID}</span></p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Comision estimada/venta</div>
            <div className="text-emerald-400 font-bold text-lg">€{totalEstimated.toFixed(2)}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
            <div className="text-white font-bold text-xl">{PRODUCTS.length}</div>
            <div className="text-zinc-500 text-xs">Productos activos</div>
          </div>
          <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
            <div className="text-orange-400 font-bold text-xl">3-4,5%</div>
            <div className="text-zinc-500 text-xs">Comision media</div>
          </div>
          <div className="bg-zinc-800/60 rounded-xl p-3 text-center">
            <div className="text-emerald-400 font-bold text-xl">ES</div>
            <div className="text-zinc-500 text-xs">Amazon España</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === cat ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(product => (
          <div key={product.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3 hover:border-orange-500/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-md">{product.category}</span>
              {product.badge && <span className="text-xs font-medium text-orange-300">{product.badge}</span>}
            </div>
            <h3 className="text-white font-semibold text-sm leading-tight">{product.title}</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">{product.description}</p>
            <StarRating rating={product.rating} />
            <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800">
              <div>
                <div className="text-white font-bold">€{product.price}</div>
                <div className="text-xs text-zinc-500">Comision <span className="text-emerald-400">{product.commissionRate}</span></div>
              </div>
              <a href={buildAffiliateUrl(product.asin)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all">
                <ShoppingCart className="w-3.5 h-3.5" />
                Ver en Amazon
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>
      <div className="text-center text-xs text-zinc-600 py-2">
        Comisiones automaticas via Amazon Associates ES · ID: {TRACKING_ID}
      </div>
    </div>
  );
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

const TAG = 'r3dm01-21';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
];

function extractBetween(text: string, start: string, end: string): string | null {
  const si = text.indexOf(start);
  if (si === -1) return null;
  const ei = text.indexOf(end, si + start.length);
  if (ei === -1) return null;
  return text.slice(si + start.length, ei);
}

function extractAttr(text: string, attr: string): string | null {
  const match = text.match(new RegExp(`${attr}=["']([^"']+)["']`));
  return match ? match[1] : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
  }

  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  try {
    const url = `https://www.amazon.es/s?k=${encodeURIComponent(q.trim())}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      }
    });

    const html = await response.text();
    const products: any[] = [];

    // Try multiple parsing strategies
    // Strategy 1: data-component-type
    let sections = html.split('data-component-type="s-search-result"');
    
    // Strategy 2: Fallback to data-asin elements
    if (sections.length <= 1) {
      sections = html.split('data-asin="').slice(1).map(s => 'data-asin="' + s);
    }

    for (let i = 0; i < Math.min(sections.length, 25); i++) {
      const section = sections[i];

      // ASIN
      const asinMatch = section.match(/data-asin="([A-Z0-9]{10})"/);
      if (!asinMatch) continue;
      const asin = asinMatch[1];

      // Title - try multiple approaches
      let title = '';
      const titlePatterns = [
        /<span[^>]*class="a-text-normal"[^>]*>([^<]+)<\/span>/,
        /<h2[^>]*aria-label="([^"]+)"/,
        /<img[^>]*alt="([^"]+)"[^>]*>/,
        /"title":"([^"]+)"/
      ];
      for (const pat of titlePatterns) {
        const m = section.match(pat);
        if (m) { title = m[1].trim(); break; }
      }
      if (!title || title.length < 3) title = 'Producto Amazon';

      // Price - try multiple patterns
      let price: number | null = null;
      
      // Pattern 1: a-price-whole + a-price-fraction (standard)
      const priceWhole = section.match(/<span[^>]*class="a-price-whole"[^>]*>([^<]+)<\/span>/);
      const priceFrac = section.match(/<span[^>]*class="a-price-fraction"[^>]*>([^<]+)<\/span>/);
      if (priceWhole) {
        const whole = priceWhole[1].replace(/[.,\s]/g, '');
        const frac = priceFrac ? priceFrac[1].trim() : '00';
        price = parseFloat(`${whole}.${frac}`);
      }
      
      // Pattern 2: a-offscreen
      if (price === null) {
        const offscreen = section.match(/<span[^>]*class="a-offscreen"[^>]*>([^<]+)<\/span>/);
        if (offscreen) {
          const cleaned = offscreen[1].replace(/[^0-9.,]/g, '').replace(',', '.');
          price = parseFloat(cleaned);
        }
      }

      // Pattern 3: JSON data in script tags
      if (price === null) {
        const priceMatch = section.match(/"price":\s*([\d.]+)/);
        if (priceMatch) price = parseFloat(priceMatch[1]);
      }

      // Image
      let image: string | null = null;
      const imgMatch = section.match(/<img[^>]*src="(https:[^"]+\.jpg[^"]*?)"[^>]*>/);
      if (imgMatch && imgMatch[1].startsWith('http')) {
        image = imgMatch[1];
      }

      // Rating
      let rating: number | null = null;
      const ratingMatch = section.match(/"rating":\s*([\d.]+)/);
      if (ratingMatch) rating = parseFloat(ratingMatch[1]);
      if (!rating) {
        const ratingText = section.match(/<span[^>]*class="a-icon-alt"[^>]*>([^<]+)<\/span>/);
        if (ratingText) {
          const r = ratingText[1].match(/([\d.]+)/);
          if (r) rating = parseFloat(r[1]);
        }
      }

      // Reviews count
      let reviews = 0;
      const reviewsMatch = section.match(/"reviewsCount":\s*(\d+)/);
      if (reviewsMatch) reviews = parseInt(reviewsMatch[1]);
      if (!reviews) {
        const revText = section.match(/(\d[\d.]*)\s*valoraciones?/i);
        if (revText) reviews = parseInt(revText[1].replace(/\./g, ''));
      }

      // Only include if we have at least a title and preferably a price
      if (title && title !== 'Producto Amazon') {
        products.push({
          asin,
          title: title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'"),
          price,
          image,
          rating,
          reviews,
          url: `https://www.amazon.es/dp/${asin}?tag=${TAG}`,
        });
      } else if (price !== null && image) {
        products.push({
          asin,
          title: title.replace(/&amp;/g, '&'),
          price,
          image,
          rating,
          reviews,
          url: `https://www.amazon.es/dp/${asin}?tag=${TAG}`,
        });
      }

      if (products.length >= 20) break;
    }

    // If no products found via scraping, provide search URL
    if (products.length === 0) {
      return res.status(200).json({
        success: true,
        query: q,
        tag: TAG,
        products: [],
        count: 0,
        searchUrl: `https://www.amazon.es/s?k=${encodeURIComponent(q.trim())}&tag=${TAG}`,
        note: 'No se pudieron extraer productos. Usa el enlace de búsqueda directa.',
      });
    }

    return res.status(200).json({
      success: true,
      query: q,
      tag: TAG,
      products,
      count: products.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, success: false });
  }
}
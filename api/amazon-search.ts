import type { VercelRequest, VercelResponse } from '@vercel/node';

const TAG = 'r3dm01-21';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { q } = req.query;
  if (!q || typeof q !== 'string' || q.trim().length === 0) {
    return res.status(400).json({ error: 'Parámetro de búsqueda requerido' });
  }

  try {
    const url = `https://www.amazon.es/s?k=${encodeURIComponent(q.trim())}&__mk_es_ES=%C3%85M%C3%85%C5%BD%C3%95%C3%91`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cache-Control': 'no-cache',
      }
    });

    const html = await response.text();
    const products: any[] = [];
    const sections = html.split('data-component-type="s-search-result"');

    for (let i = 1; i < sections.length; i++) {
      const section = sections[i];
      const asinMatch = section.match(/data-asin="([A-Z0-9]{10})"/);
      if (!asinMatch) continue;
      const asin = asinMatch[1];

      const titleMatch = section.match(/<span[^>]*class="a-text-normal"[^>]*>([^<]+)<\/span>/);
      const title = titleMatch ? titleMatch[1].trim() : 'Producto';

      const priceWholeMatch = section.match(/<span[^>]*class="a-price-whole"[^>]*>([^<]+)<\/span>/);
      const priceFractionMatch = section.match(/<span[^>]*class="a-price-fraction"[^>]*>([^<]+)<\/span>/);
      const price = priceWholeMatch ? `${priceWholeMatch[1].replace(/[.,\s]/g, '')}.${priceFractionMatch ? priceFractionMatch[1].trim() : '00'}` : null;

      const imgMatch = section.match(/<img[^>]*src="([^"]+)"[^>]*>/);
      const image = imgMatch ? (imgMatch[1].startsWith('http') ? imgMatch[1] : null) : null;

      const ratingMatch = section.match(/<span[^>]*class="a-icon-alt"[^>]*>([^<]+)<\/span>/);
      const rating = ratingMatch ? ratingMatch[1].match(/([\d.]+)/)?.[1] : null;

      const reviewsMatch = section.match(/(\d[\d.]*)\s*valoraciones?/i);
      const reviews = reviewsMatch ? parseInt(reviewsMatch[1].replace(/\./g, '')) : 0;

      products.push({
        asin,
        title,
        price: price ? parseFloat(price) : null,
        image,
        rating: rating ? parseFloat(rating) : null,
        reviews,
        url: `https://www.amazon.es/dp/${asin}?tag=${TAG}`,
      });

      if (products.length >= 20) break;
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
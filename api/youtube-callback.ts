import type { VercelRequest, VercelResponse } from '@vercel/node';

const YT_CLIENT_ID = process.env.YT_CLIENT_ID!;
const YT_CLIENT_SECRET = process.env.YT_CLIENT_SECRET!;
const REDIRECT_URI = 'https://invergrow.vercel.app/api/youtube-callback';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY!;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`<h2>Error OAuth: ${error}</h2>`);
  }

  if (!code) {
    return res.status(400).send('<h2>No se recibió código de autorización.</h2>');
  }

  try {
    // Intercambiar code por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: YT_CLIENT_ID,
        client_secret: YT_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json() as any;

    if (!tokens.refresh_token) {
      return res.status(400).send(`<h2>No se obtuvo refresh_token. Respuesta: ${JSON.stringify(tokens)}</h2>`);
    }

    // Guardar refresh_token en Supabase (tabla invergrow_state)
    await fetch(`${SUPABASE_URL}/rest/v1/invergrow_state?id=eq.main`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ yt_refresh_token: tokens.refresh_token }),
    });

    return res.status(200).send(`
      <html>
        <body style="font-family:sans-serif;text-align:center;padding:40px;background:#040608;color:#fff">
          <h1 style="color:#00ff88">✅ YouTube conectado</h1>
          <p>Refresh token guardado correctamente.</p>
          <p style="color:rgba(255,255,255,0.4);font-size:12px">Puedes cerrar esta ventana y volver a InverGrow.</p>
          <a href="https://invergrow.vercel.app" style="color:#00ff88">← Volver a InverGrow</a>
        </body>
      </html>
    `);
  } catch (err: any) {
    return res.status(500).send(`<h2>Error: ${err.message}</h2>`);
  }
}

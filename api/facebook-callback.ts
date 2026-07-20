import type { VercelRequest, VercelResponse } from "@vercel/node";

const APP_ID = "2094777071471172";
const APP_SECRET = "4a1327d49846c93d127e368bcd9c9611";
const REDIRECT_URI = "https://invergrow.vercel.app/api/facebook-callback";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error, state } = req.query;

  if (error) {
    return res.status(400).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px">
        <h2>❌ Autorización cancelada</h2>
        <p>${error}</p>
      </body></html>
    `);
  }

  if (!code) {
    return res.status(400).send("No code received");
  }

  try {
    // Intercambiar code por access_token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json() as any;

    if (tokenData.error) {
      return res.status(400).send(`Error: ${tokenData.error.message}`);
    }

    const shortToken = tokenData.access_token;

    // Cambiar por token de larga duración
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${APP_ID}` +
      `&client_secret=${APP_SECRET}&fb_exchange_token=${shortToken}`
    );
    const longData = await longRes.json() as any;
    const longToken = longData.access_token || shortToken;

    // Obtener páginas
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`
    );
    const pagesData = await pagesRes.json() as any;
    const pages = pagesData.data || [];

    const pagesList = pages.map((p: any) => `<li>${p.name} (${p.id})</li>`).join("");

    return res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0a0a;color:#00ff88">
        <h2>✅ Facebook autorizado correctamente</h2>
        <p>Token obtenido. Páginas encontradas:</p>
        <ul style="text-align:left;display:inline-block">${pagesList || "<li>Ninguna</li>"}</ul>
        <br><br>
        <p style="color:#888">Puedes cerrar esta ventana.</p>
        <p style="font-size:11px;color:#555;word-break:break-all">Token: ${longToken.substring(0,40)}...</p>
      </body></html>
    `);

  } catch (err: any) {
    return res.status(500).send(`Error interno: ${err.message}`);
  }
}

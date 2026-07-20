import type { VercelRequest, VercelResponse } from "@vercel/node";

const APP_ID = "2094777071471172";
const APP_SECRET = "4a1327d49846c93d127e368bcd9c9611";
const REDIRECT_URI = "https://invergrow.vercel.app/api/facebook-callback";
const SUPABASE_URL = "https://tolzqxflecqbjdefohom.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || "";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0a0a;color:#ff4444"><h2>❌ Autorización cancelada</h2><p>${error}</p></body></html>`);
  }

  if (!code) {
    return res.status(400).send("No code received");
  }

  try {
    // Intercambiar code por short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json() as any;
    if (tokenData.error) throw new Error(tokenData.error.message);

    // Cambiar por long-lived token
    const longRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${APP_ID}` +
      `&client_secret=${APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const longData = await longRes.json() as any;
    const longToken = longData.access_token || tokenData.access_token;

    // Obtener páginas con sus tokens
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}&fields=id,name,access_token`
    );
    const pagesData = await pagesRes.json() as any;
    const pages = pagesData.data || [];

    // Guardar en Supabase - añadir columnas si no existen aún
    await fetch(`${SUPABASE_URL}/rest/v1/invergrow_state?id=eq.main`, {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        facebook_user_token: longToken,
        facebook_pages: JSON.stringify(pages)
      })
    });

    const pagesList = pages.map((p: any) => `<li><b>${p.name}</b> (${p.id})</li>`).join("");

    return res.status(200).send(`
      <html><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0a0a;color:#00ff88">
        <h2>✅ Facebook autorizado correctamente</h2>
        <p>Token guardado. Páginas encontradas:</p>
        <ul style="text-align:left;display:inline-block;color:#fff">${pagesList || "<li>Ninguna — revisa permisos</li>"}</ul>
        <br><p style="color:#888">Puedes cerrar esta ventana.</p>
      </body></html>
    `);
  } catch (err: any) {
    return res.status(500).send(`<html><body style="color:red;padding:40px">Error: ${err.message}</body></html>`);
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLIENT_ID = process.env.YT_CLIENT_ID!;
const REDIRECT_URI = 'https://invergrow.vercel.app/api/admob-callback';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/admob.readonly');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  // Forzar cuenta joanlazaro83@gmail.com que tiene las apps AdMob
  url.searchParams.set('login_hint', 'joanlazaro83@gmail.com');
  return res.redirect(url.toString());
}

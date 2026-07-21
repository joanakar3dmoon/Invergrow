import type { VercelRequest, VercelResponse } from '@vercel/node';

const YT_CLIENT_ID = process.env.YT_CLIENT_ID!;
const REDIRECT_URI = 'https://invergrow.vercel.app/api/youtube-callback';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
  'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
].join(' ');

export default function handler(req: VercelRequest, res: VercelResponse) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', YT_CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return res.redirect(url.toString());
}

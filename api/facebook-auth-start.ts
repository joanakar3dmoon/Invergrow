import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const APP_ID = "2094777071471172";
  const REDIRECT_URI = encodeURIComponent("https://invergrow.vercel.app/api/facebook-callback");
  const SCOPE = "pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,pages_show_list";

  const url = `https://www.facebook.com/dialog/oauth?client_id=${APP_ID}&redirect_uri=${REDIRECT_URI}&scope=${SCOPE}&response_type=code&state=r3dm_publish`;

  res.writeHead(302, { Location: url });
  res.end();
}

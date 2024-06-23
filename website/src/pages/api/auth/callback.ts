import { NextApiRequest, NextApiResponse } from "next";

const clientId = process.env.GITHUB_CLIENT_ID;
const clientSecret = process.env.GITHUB_CLIENT_SECRET;
const redirectUri = process.env.GITHUB_REDIRECT_URI;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: "Authorization code not provided" });
  }

  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    },
  );

  const tokenData = await tokenResponse.json();
  const { access_token } = tokenData;

  if (!access_token) {
    return res.status(400).json({ error: "Failed to retrieve access token" });
  }

  res.redirect(`/create?token=${access_token}`);
}

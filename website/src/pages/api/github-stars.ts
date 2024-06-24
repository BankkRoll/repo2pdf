// /src/pages/api/github-stars.ts

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;

  try {
    const response = await fetch(
      `https://api.github.com/repos/BankkRoll/shad-next`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${GITHUB_CLIENT_ID}:${GITHUB_CLIENT_SECRET}`,
          ).toString("base64")}`,
        },
      },
    );

    if (response.ok) {
      const data = await response.json();
      res.status(200).json({ stars: data.stargazers_count });
    } else {
      res.status(response.status).json({ error: response.statusText });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch GitHub stars" });
  }
}

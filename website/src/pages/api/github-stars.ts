// /src/pages/api/github-stars.ts

import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;

  try {
    const repoResponse = await fetch(
      `https://api.github.com/repos/BankkRoll/repo2pdf`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${GITHUB_CLIENT_ID}:${GITHUB_CLIENT_SECRET}`,
          ).toString("base64")}`,
        },
      },
    );

    if (!repoResponse.ok) {
      return res
        .status(repoResponse.status)
        .json({ error: repoResponse.statusText });
    }

    const repoData = await repoResponse.json();
    const stars = repoData.stargazers_count;

    const stargazersResponse = await fetch(
      `https://api.github.com/repos/BankkRoll/repo2pdf/stargazers`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(
            `${GITHUB_CLIENT_ID}:${GITHUB_CLIENT_SECRET}`,
          ).toString("base64")}`,
          Accept: "application/vnd.github.v3.star+json",
        },
      },
    );

    if (!stargazersResponse.ok) {
      return res
        .status(stargazersResponse.status)
        .json({ error: stargazersResponse.statusText });
    }

    const stargazersData = await stargazersResponse.json();
    const stargazers = stargazersData.map((stargazer: any) => ({
      login: stargazer.user.login,
      avatar_url: stargazer.user.avatar_url,
      html_url: stargazer.user.html_url,
    }));

    res.status(200).json({ stars, stargazers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch GitHub data" });
  }
}

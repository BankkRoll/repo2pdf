// pages/api/clone-repo.ts
import { NextApiRequest, NextApiResponse } from "next";

async function fetchRepoContents(owner: string, repo: string, token?: string) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch repository contents");
  }
  return await response.json();
}

async function fetchFileContent(url: string, token?: string) {
  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch file content");
  }
  return await response.text();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { repoUrl } = req.body;
  const { authorization } = req.headers;
  const token = authorization?.split(" ")[1];
  const [owner, repo] = repoUrl.replace("https://github.com/", "").split("/");

  try {
    let repoContents;
    try {
      repoContents = await fetchRepoContents(owner, repo, token);
    } catch (error) {
      if (!token) {
        return res.status(401).json({
          error:
            "Unauthorized. Please sign in to GitHub for higher rate limits.",
        });
      }
      return res
        .status(500)
        .json({ error: "Failed to fetch repository contents" });
    }

    const repoFiles = await Promise.all(
      repoContents.map(async (file: any) => {
        if (file.type === "file") {
          const content = await fetchFileContent(file.download_url, token);
          return { name: file.name, content };
        }
        return null;
      }),
    );

    res.status(200).json({ repoFiles: repoFiles.filter(Boolean) });
  } catch (error) {
    console.error("Error fetching repository contents:", error);
    res.status(500).json({ error: "Failed to fetch repository contents" });
  }
}

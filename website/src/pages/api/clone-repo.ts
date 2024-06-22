// pages/api/clone-repo.ts
import { NextApiRequest, NextApiResponse } from "next";

async function fetchRepoContents(
  owner: string,
  repo: string,
  path = "",
  token?: string,
) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents${path ? `/${path}` : ""}`;
  const headers: HeadersInit = {};

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error("Failed to fetch repository contents");
  }
  const contents = await response.json();

  const files: any[] = [];
  for (const item of contents) {
    if (item.type === "file") {
      files.push(item);
    } else if (item.type === "dir") {
      const subFiles = await fetchRepoContents(owner, repo, item.path, token);
      files.push(...subFiles);
    }
  }
  return files;
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
    const repoContents = await fetchRepoContents(owner, repo, "", token);

    const repoFiles = await Promise.all(
      repoContents.map(async (file) => {
        const content = await fetchFileContent(file.download_url, token);
        return { name: file.name, path: file.path, content };
      }),
    );

    res.status(200).json({ repoFiles });
  } catch (error) {
    console.error("Error fetching repository contents:", error);
    res.status(500).json({ error: "Failed to fetch repository contents" });
  }
}

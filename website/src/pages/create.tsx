// src/pages/create.tsx
import { SetStateAction, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import FileSelectionDialog from "@/components/create/file-selector";
import GitHubAuth from "@/components/create/github-auth";
import { Input } from "@/components/ui/input";
import PDFPreview from "@/components/create/pdf-preview";
import { convertToPDF } from "@/utils/pdf-converter";
import { toast } from "sonner";
import { useRouter } from "next/router";

export default function Create() {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [repoFiles, setRepoFiles] = useState<any[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    const { token } = router.query;
    if (token) {
      setToken(token as string);
      fetchGitHubUser(token as string);
    }
  }, [router.query]);

  const fetchGitHubUser = async (token: string) => {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      const data = await response.json();
      setUsername(data.login);
      toast.success(`Signed in as ${data.login}`);
    } catch (error) {
      console.error("Error fetching GitHub user:", error);
      toast.error("Error fetching GitHub user");
    }
  };

  const isValidGitHubUrl = (url: string) => {
    const regex =
      /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9._%+-]+\/[A-Za-z0-9._%+-]+\/?$/;
    return regex.test(url);
  };

  const handleCloneRepo = async () => {
    if (!isValidGitHubUrl(repoUrl)) {
      toast.error("Please enter a valid GitHub repository URL.");
      return;
    }

    setIsLoading(true);
    toast.promise(
      fetch("/api/clone-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ repoUrl }),
      })
        .then(async (response) => {
          const { repoFiles, error } = await response.json();
          if (error) {
            throw new Error(error);
          }
          setRepoFiles(repoFiles);
          setSelectedFiles(
            new Set(repoFiles.map((file: { path: any }) => file.path)),
          );
          setDialogOpen(true);
          return { repoUrl };
        })
        .finally(() => {
          setIsLoading(false);
        }),
      {
        loading: "Fetching repository files...",
        success: ({ repoUrl }) => `Successfully fetched files from ${repoUrl}`,
        error: "Error fetching repository files",
      },
    );
  };

  const handleConvertToPDF = async () => {
    setIsLoading(true);
    const selectedRepoFiles = repoFiles.filter((file) =>
      selectedFiles.has(file.path),
    );
    const pdfBytes = await convertToPDF(selectedRepoFiles);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(blob);
    setPdfUrl(pdfUrl);
    setIsLoading(false);
  };

  const handleFileSelection = (filePath: string) => {
    setSelectedFiles((prevSelectedFiles) => {
      const newSelectedFiles = new Set(prevSelectedFiles);
      if (newSelectedFiles.has(filePath)) {
        newSelectedFiles.delete(filePath);
      } else {
        newSelectedFiles.add(filePath);
      }
      return newSelectedFiles;
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(repoFiles.map((file) => file.path)));
    }
    setSelectAll(!selectAll);
  };

  const handleSignInWithGitHub = async () => {
    try {
      const response = await fetch("/api/auth/github");
      const { githubAuthUrl } = await response.json();
      window.location.href = githubAuthUrl;
    } catch (error) {
      console.error("Error signing in with GitHub:", error);
      toast.error("Error signing in with GitHub");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    setRepoFiles([]);
    setSelectedFiles(new Set());
    setSelectAll(false);
    setDialogOpen(false);
    toast.success("Logged out successfully");
  };

  return (
    <main className="flex flex-col md:flex-row justify-between p-4">
      <div className="flex flex-col w-full md:w-1/3 p-4">
        <h1 className="text-4xl font-bold mb-6">Create</h1>
        <Input
          placeholder="Enter GitHub Repo URL"
          value={repoUrl}
          onChange={(e: { target: { value: SetStateAction<string> } }) =>
            setRepoUrl(e.target.value)
          }
          className="mb-4"
        />
        <GitHubAuth
          token={token}
          username={username}
          onSignIn={handleSignInWithGitHub}
          onCloneRepo={handleCloneRepo}
          onLogout={handleLogout}
          isLoading={isLoading}
          repoUrl={repoUrl}
        />
        {repoFiles.length > 0 && (
          <>
            <FileSelectionDialog
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
              repoFiles={repoFiles}
              selectedFiles={selectedFiles}
              handleFileSelection={handleFileSelection}
            />
            <Button onClick={handleConvertToPDF} disabled={isLoading}>
              Convert ({selectedFiles.size}) Files to PDF
            </Button>
          </>
        )}
      </div>
      <PDFPreview pdfUrl={pdfUrl} isLoading={isLoading} />
    </main>
  );
}

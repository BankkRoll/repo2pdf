import { useState, useEffect } from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { convertToPDF } from "../utils/pdf-converter";
import { useRouter } from "next/router";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { AnimatedBeamer } from "@/components/ui/beams/animated-beamer";

export default function Create() {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
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

          const pdfBytes = await convertToPDF(repoFiles);
          const blob = new Blob([pdfBytes], { type: "application/pdf" });
          const pdfUrl = URL.createObjectURL(blob);
          setPdfUrl(pdfUrl);
          return { repoUrl };
        })
        .finally(() => {
          setIsLoading(false);
        }),
      {
        loading: "Cloning repository...",
        success: ({ repoUrl }) =>
          `Successfully cloned and converted ${repoUrl} to PDF`,
        error: "Error cloning repository",
      },
    );
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

  return (
    <main className="flex flex-col md:flex-row justify-between p-4">
      <div className="flex flex-col w-full md:w-1/3 p-4">
        <h1 className="text-4xl font-bold mb-6">Create</h1>
        <Input
          placeholder="Enter GitHub Repo URL"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="mb-4"
        />
        <div className="flex flex-col pb-6 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox disabled id="lineNumbers" />
            <label
              htmlFor="lineNumbers"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Add Line Numbers
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox disabled id="pageNumbers" />
            <label
              htmlFor="pageNumbers"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Add Page Numbers
            </label>
          </div>
        </div>
        {!token ? (
          <div className="flex flex-col">
            <Button variant="secondary" onClick={handleSignInWithGitHub}>
              Connect
              <GitHubLogoIcon className="ml-2 w-5 h-5" />
            </Button>
            <p className="text-sm text-center text-muted-foreground italic">
              Your github token is NEVER STORED and used only in auth callback
              to clone and convert the repository.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <Button
              onClick={handleCloneRepo}
              disabled={!repoUrl || isLoading}
              className="mb-4"
            >
              Clone and Convert
            </Button>
            <Button
              variant="secondary"
              className="hover:bg-secondary cursor-default hover:cursor-default"
            >
              {username ? `${username}` : "Loading..."}
              <GitHubLogoIcon className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col w-full md:w-2/3 p-4 items-center">
        {!pdfUrl ? (
          <iframe
            src={"/repo2pdf-web.pdf"}
            title="PDF Preview"
            className="min-h-[400px] md:min-h-[80svh] w-full h-full border rounded-lg"
          />
        ) : isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <AnimatedBeamer />
          </div>
        ) : (
          <iframe
            src={pdfUrl}
            title="PDF Preview"
            className="min-h-[400px] md:min-h-[80svh] w-full h-full border rounded-lg"
          />
        )}
      </div>
    </main>
  );
}

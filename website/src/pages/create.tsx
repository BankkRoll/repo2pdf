import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";

import { AnimatedBeamer } from "@/components/ui/beams/animated-beamer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
          ); // Default to select all
          setSelectAll(true);
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
              Fetch Files
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
        {repoFiles.length > 0 && (
          <>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger>
                <Button className="w-full my-4">
                  Select Files ({selectedFiles.size})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <ScrollArea className="max-h-[60svh]">
                  <DialogHeader>
                    <DialogTitle>Select Files</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="selectAll"
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="selectAll" className="text-sm">
                        Select All
                      </label>
                    </div>
                    {repoFiles.map((file) => (
                      <div key={file.path} className="flex items-center gap-2">
                        <Checkbox
                          id={file.path}
                          checked={selectedFiles.has(file.path)}
                          onCheckedChange={() => handleFileSelection(file.path)}
                        />
                        <label htmlFor={file.path} className="text-sm">
                          {file.path}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Button onClick={handleConvertToPDF} disabled={isLoading}>
              Convert ({selectedFiles.size}) Files to PDF
            </Button>
          </>
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

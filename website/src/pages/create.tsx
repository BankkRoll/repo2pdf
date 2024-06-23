// /src/pages/create.tsx

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ExitIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useEffect, useState } from "react";

import { AnimatedBeamer } from "@/components/ui/beams/animated-beamer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PiCaretUpDownFill } from "react-icons/pi";
import { ScrollArea } from "@/components/ui/scroll-area";
import { convertToPDF } from "@/utils/pdf-converter";
import { toast } from "sonner";
import { useRouter } from "next/router";

interface RepoFile {
  id: number;
  name: string;
  parentId: number;
  path: string;
  content: string;
}

const Create: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [repoFiles, setRepoFiles] = useState<RepoFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState<boolean>(false);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [addLineNumbers, setAddLineNumbers] = useState<boolean>(false);
  const [addPageNumbers, setAddPageNumbers] = useState<boolean>(false);
  const [addTOC, setAddTOC] = useState<boolean>(false);
  const [boldTitles, setBoldTitles] = useState<boolean>(false);
  const [customHeader, setCustomHeader] = useState<string>("");
  const [customFooter, setCustomFooter] = useState<string>("");
  const [includeDateInHeader, setIncludeDateInHeader] =
    useState<boolean>(false);
  const [includeDateInFooter, setIncludeDateInFooter] =
    useState<boolean>(false);
  const [fontType, setFontType] = useState<string>("Courier");
  const [fontSize, setFontSize] = useState<number>(12);
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
    try {
      const response = await fetch("/api/clone-repo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ repoUrl }),
      });
      const { repoFiles, error } = await response.json();
      if (error) {
        throw new Error(error);
      }
      setRepoFiles(repoFiles);
      setSelectedFiles(new Set(repoFiles.map((file: RepoFile) => file.path)));
      setDialogOpen(true);
    } catch (error) {
      toast.error("Error fetching repository files");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertToPDF = async () => {
    setIsLoading(true);
    const selectedRepoFiles = repoFiles.filter((file) =>
      selectedFiles.has(file.path),
    );

    const pdfBytes = await convertToPDF(
      selectedRepoFiles,
      addLineNumbers,
      addPageNumbers || addTOC,
      addTOC,
      boldTitles,
      customHeader,
      customFooter,
      includeDateInHeader,
      includeDateInFooter,
      fontType,
      fontSize,
    );

    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const pdfUrl = URL.createObjectURL(blob);
    setPdfUrl(pdfUrl);
    setIsLoading(false);
  };

  const handleFileSelection = useCallback((filePath: string) => {
    setSelectedFiles((prevSelectedFiles) => {
      const newSelectedFiles = new Set(prevSelectedFiles);
      if (newSelectedFiles.has(filePath)) {
        newSelectedFiles.delete(filePath);
      } else {
        newSelectedFiles.add(filePath);
      }
      return newSelectedFiles;
    });
  }, []);

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
    router.push("/create");
    toast.success("Logged out successfully");
  };

  return (
    <main className="flex flex-col md:flex-row justify-between p-4">
      <div className="relative flex flex-col w-full md:w-1/3 p-4">
        <h1 className="text-4xl font-bold mb-6">Create</h1>
        {!token ? (
          <div className="flex flex-col">
            <Button
              variant="ringHover"
              onClick={() => {
                handleSignInWithGitHub();
              }}
              track="SignInWithGitHub"
            >
              Connect
              <GitHubLogoIcon className="ml-2 w-5 h-5" />
            </Button>
            <p className="pt-4 text-sm text-center text-muted-foreground italic">
              Your GitHub token is NEVER STORED and used only in auth callback
              to clone and convert the repository.
            </p>
          </div>
        ) : (
          <>
            <Input
              placeholder="Enter GitHub Repo URL"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="mb-4"
            />
            {repoFiles.length > 0 ? (
              <>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <div className="w-full">
                      <Button variant="outline" className="w-full mb-2">
                        Select Files ({selectedFiles.size})
                        <PiCaretUpDownFill className="ml-2 w-5 h-5" />
                      </Button>
                    </div>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Files</DialogTitle>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60svh]">
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
                          <div
                            key={file.path}
                            className="flex items-center gap-2"
                          >
                            <Checkbox
                              id={file.path}
                              checked={selectedFiles.has(file.path)}
                              onCheckedChange={() =>
                                handleFileSelection(file.path)
                              }
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
                <div className="flex flex-col pt-4 pb-6 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="lineNumbers"
                      checked={addLineNumbers}
                      onCheckedChange={() => setAddLineNumbers(!addLineNumbers)}
                    />
                    <label
                      htmlFor="lineNumbers"
                      className="text-sm font-medium leading-none"
                    >
                      Add Line Numbers ᴮᴱᵀᴬ
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pageNumbers"
                      checked={addPageNumbers}
                      onCheckedChange={() => setAddPageNumbers(!addPageNumbers)}
                    />
                    <label
                      htmlFor="pageNumbers"
                      className="text-sm font-medium leading-none"
                    >
                      Add Page Numbers ᴮᴱᵀᴬ
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="addTOC"
                      checked={addTOC}
                      onCheckedChange={() => {
                        setAddTOC(!addTOC);
                        if (!addPageNumbers && !addTOC) {
                          setAddPageNumbers(true);
                        }
                      }}
                    />
                    <label
                      htmlFor="addTOC"
                      className="text-sm font-medium leading-none"
                    >
                      Add Table of Contents ᴮᴱᵀᴬ
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="boldTitles"
                      checked={boldTitles}
                      onCheckedChange={() => setBoldTitles(!boldTitles)}
                    />
                    <label
                      htmlFor="boldTitles"
                      className="text-sm font-medium leading-none"
                    >
                      Bold Titles ᴮᴱᵀᴬ
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeDate"
                      checked={includeDateInHeader}
                      onCheckedChange={() =>
                        setIncludeDateInHeader(!includeDateInHeader)
                      }
                    />
                    <label
                      htmlFor="includeDate"
                      className="text-sm font-medium leading-none"
                    >
                      Include Date in Header ᴮᴱᵀᴬ
                    </label>
                  </div>
                  <Input
                    placeholder="Custom Header"
                    value={customHeader}
                    onChange={(e) => setCustomHeader(e.target.value)}
                    className="mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="includeDate"
                      checked={includeDateInFooter}
                      onCheckedChange={() =>
                        setIncludeDateInFooter(!includeDateInFooter)
                      }
                    />
                    <label
                      htmlFor="includeDate"
                      className="text-sm font-medium leading-none"
                    >
                      Include Date in Footer ᴮᴱᵀᴬ
                    </label>
                  </div>
                  <Input
                    placeholder="Custom Footer"
                    value={customFooter}
                    onChange={(e) => setCustomFooter(e.target.value)}
                    className="mb-2"
                  />
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="fontType"
                      className="text-sm font-medium leading-none"
                    >
                      Select Font Type
                    </label>
                    <Select
                      value={fontType}
                      onValueChange={(value) => setFontType(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Font Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={"Courier"}>Courier</SelectItem>
                        <SelectItem value={"Helvetica"}>Helvetica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="fontSize"
                      className="text-sm font-medium leading-none"
                    >
                      Font Size
                    </label>
                    <Input
                      type="number"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                </div>
                <Button
                  variant="ringHover"
                  className="w-full mb-2"
                  disabled={isLoading}
                  onClick={() => {
                    handleConvertToPDF();
                  }}
                  track="ConvertToPDF"
                >
                  Convert ({selectedFiles.size}) Files to PDF
                </Button>
              </>
            ) : (
              <Button
                variant="ringHover"
                onClick={() => {
                  handleCloneRepo();
                }}
                track="CloneRepo"
                disabled={!repoUrl || isLoading}
                className="mb-4"
              >
                Fetch Files
              </Button>
            )}
            <div className="flex-grow min-h-20"></div>
            <div className="flex flex-row gap-2 items-center">
              <a
                href={"https://github.com/" + username}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Button
                  variant="ringHoverOutline"
                  className="flex items-center justify-center w-full"
                >
                  {username ? `${username}` : "Loading..."}
                  <GitHubLogoIcon className="ml-2 w-5 h-5" />
                </Button>
              </a>
              <Button
                variant="ringHoverOutline"
                onClick={handleLogout}
                className="flex items-center justify-center w-full"
              >
                Logout
                <ExitIcon className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col w-full md:w-2/3 p-4 items-center">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <AnimatedBeamer />
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="PDF Preview"
            className="min-h-[800px] md:min-h-[80svh] w-full h-full border rounded-lg"
          />
        ) : (
          <iframe
            src={"/repo2pdf-web.pdf"}
            title="PDF Preview"
            className="min-h-[800px] md:min-h-[80svh] w-full h-full border rounded-lg"
          />
        )}
      </div>
    </main>
  );
};

export default Create;

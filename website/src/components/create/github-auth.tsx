// src/components/create/github-auth.tsx

import { Button } from "@/components/ui/button";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

interface GitHubAuthProps {
  token: string | null;
  username: string | null;
  onSignIn: () => void;
  onCloneRepo: () => void;
  onLogout: () => void;
  isLoading: boolean;
  repoUrl: string;
}

const GitHubAuth: React.FC<GitHubAuthProps> = ({
  token,
  username,
  onSignIn,
  onCloneRepo,
  onLogout,
  isLoading,
  repoUrl,
}) => (
  <div className="flex flex-col">
    {!token ? (
      <>
        <Button variant="secondary" onClick={onSignIn}>
          Connect
          <GitHubLogoIcon className="ml-2 w-5 h-5" />
        </Button>
        <p className="text-sm text-center text-muted-foreground italic">
          Your GitHub token is NEVER STORED and used only in auth callback to
          clone and convert the repository.
        </p>
      </>
    ) : (
      <>
        <Button
          onClick={onCloneRepo}
          disabled={!repoUrl || isLoading}
          className="mb-4"
        >
          Fetch Files
        </Button>
        <Button
          variant="secondary"
          className="hover:bg-secondary cursor-default"
        >
          {username ? `${username}` : "Loading..."}
          <GitHubLogoIcon className="ml-2 w-5 h-5" />
        </Button>
        <Button variant="secondary" onClick={onLogout} className="mt-2">
          Logout
        </Button>
      </>
    )}
  </div>
);

export default GitHubAuth;

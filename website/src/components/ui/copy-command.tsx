// /src/components/ui/copy-command.tsx

"use client";

import * as React from "react";

import { CheckIcon, ClipboardIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

import { Button } from "./button";
import { DropdownMenuTriggerProps } from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

type PackageManager = "npm" | "pnpm" | "bun" | "yarn";

interface NpmCommands {
  __npmCommand__: string;
  __pnpmCommand__: string;
  __bunCommand__: string;
  __yarnCommand__: string;
}

interface CopyNpmCommandButtonProps extends DropdownMenuTriggerProps {
  commands: NpmCommands;
  onSelectCommand: (command: string) => void;
}

export async function copyToClipboardWithMeta(value: string) {
  await navigator.clipboard.writeText(value);
}

export const CopyNpmCommandButton: React.FC<CopyNpmCommandButtonProps> = ({
  commands,
  onSelectCommand,
  className,
  ...props
}) => {
  const [hasCopied, setHasCopied] = React.useState(false);

  React.useEffect(() => {
    if (hasCopied) {
      const timer = setTimeout(() => {
        setHasCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasCopied]);

  const handleCopyCommand = (command: string) => {
    copyToClipboardWithMeta(command);
    setHasCopied(true);
    onSelectCommand(command);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn("relative z-10 h-8 w-8 ", className)}
          {...props}
        >
          {hasCopied ? (
            <CheckIcon className="h-4 w-4" />
          ) : (
            <ClipboardIcon className="h-4 w-4" />
          )}
          <span className="sr-only">Copy</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleCopyCommand(commands.__npmCommand__)}
        >
          npm
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCopyCommand(commands.__yarnCommand__)}
        >
          yarn
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCopyCommand(commands.__pnpmCommand__)}
        >
          pnpm
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleCopyCommand(commands.__bunCommand__)}
        >
          bun
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

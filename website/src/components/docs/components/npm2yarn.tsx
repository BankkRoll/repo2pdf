"use client";

import * as React from "react";

import { CheckIcon, ClipboardIcon } from "lucide-react";
import { CodeBlock, dracula } from "react-code-blocks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { DropdownMenuTriggerProps } from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

type PackageManager = "npm" | "yarn" | "pnpm" | "bun";
type Command = "install";

const commandMap: Record<Command, Record<PackageManager, string>> = {
  install: {
    npm: "npm install",
    yarn: "yarn add",
    pnpm: "pnpm add",
    bun: "bun add",
  },
};

function getCommand(
  command: Command,
  to: PackageManager,
  packageName: string,
): string {
  if (!commandMap[command] || !commandMap[command][to]) {
    throw new Error(
      `Unsupported command or package manager: ${command} to ${to}`,
    );
  }

  return `${commandMap[command][to]} ${packageName}`;
}

interface CopyNpmCommandButtonProps extends DropdownMenuTriggerProps {
  packageName: string;
  onSelectCommand: (command: string) => void;
}

export async function copyToClipboardWithMeta(value: string) {
  await navigator.clipboard.writeText(value);
}

const CopyNpmCommandButton: React.FC<CopyNpmCommandButtonProps> = ({
  packageName,
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

  const commands = {
    __npmCommand__: getCommand("install", "npm", packageName),
    __pnpmCommand__: getCommand("install", "pnpm", packageName),
    __bunCommand__: getCommand("install", "bun", packageName),
    __yarnCommand__: getCommand("install", "yarn", packageName),
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={cn("relative z-10 h-8 w-8", className)}
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

interface InstallCommandProps {
  packageName: string;
}

export const Npm2Yarn: React.FC<InstallCommandProps> = ({ packageName }) => {
  const [selectedCommand, setSelectedCommand] = React.useState(
    getCommand("install", "npm", packageName),
  );

  const handleSelectCommand = (command: string) => {
    setSelectedCommand(command);
  };

  return (
    <div className="my-4">
      <div className="flex items-center mb-4">
        <div className="w-full">
          <CodeBlock
            text={selectedCommand}
            language="bash"
            showLineNumbers={false}
            theme={dracula}
          />
        </div>
        <CopyNpmCommandButton
          packageName={packageName}
          onSelectCommand={handleSelectCommand}
          className="ml-2"
        />
      </div>
    </div>
  );
};

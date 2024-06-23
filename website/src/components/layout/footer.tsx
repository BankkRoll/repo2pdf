import { GitHubLogoIcon, TwitterLogoIcon } from "@radix-ui/react-icons";

import { Button } from "../ui/button";
import React from "react";

export default function Footer() {
  return (
    <footer className="gap-2 flex h-16 items-center justify-center overflow-x-hidden border-t-[1px] w-full bg-white dark:border-b-slate-700 dark:bg-background">
      Built by Bankk
      <a
        rel="noreferrer noopener"
        href="https://github.com/BankkRoll"
        target="_blank"
      >
        <Button size="icon" variant="gooeyLeft">
          <GitHubLogoIcon className="w-5 h-5" />
        </Button>
      </a>
      <a
        rel="noreferrer noopener"
        href="https://x.com/bankkroll_eth"
        target="_blank"
      >
        <Button size="icon" variant="gooeyRight">
          <TwitterLogoIcon className="w-5 h-5" />
        </Button>
      </a>
    </footer>
  );
}

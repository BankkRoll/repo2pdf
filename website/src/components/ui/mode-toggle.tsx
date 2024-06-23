// /src/components/ui/mode-toggle.tsx

"use client";

import * as React from "react";

import { AnimatePresence, motion } from "framer-motion";
import { DesktopIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [currentTheme, setCurrentTheme] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    setCurrentTheme(theme);
  }, [theme]);

  const handleToggle = () => {
    setCurrentTheme((prevTheme) => {
      if (prevTheme === "light") {
        setTheme("dark");
        return "dark";
      } else if (prevTheme === "dark") {
        setTheme("system");
        return "system";
      } else {
        setTheme("light");
        return "light";
      }
    });
  };

  if (currentTheme === undefined) {
    // Prevents mismatched initial render on the server and client
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ringHoverOutline"
            size="icon"
            onClick={handleToggle}
            className="relative flex items-center justify-center"
          >
            <AnimatePresence initial={false} mode="wait">
              {currentTheme === "light" && (
                <motion.div
                  key="light"
                  initial={{ opacity: 0, rotate: -90, scale: 0 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute"
                >
                  <SunIcon className="h-[1.2rem] w-[1.2rem]" />
                </motion.div>
              )}
              {currentTheme === "dark" && (
                <motion.div
                  key="dark"
                  initial={{ opacity: 0, rotate: -90, scale: 0 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute"
                >
                  <MoonIcon className="h-[1.2rem] w-[1.2rem]" />
                </motion.div>
              )}
              {currentTheme === "system" && (
                <motion.div
                  key="system"
                  initial={{ opacity: 0, rotate: -90, scale: 0 }}
                  animate={{ opacity: 1, rotate: 0, scale: 1 }}
                  exit={{ opacity: 0, rotate: 90, scale: 0 }}
                  transition={{ duration: 0.15 }}
                  className="absolute"
                >
                  <DesktopIcon className="h-[1.2rem] w-[1.2rem]" />
                </motion.div>
              )}
            </AnimatePresence>
            <span className="sr-only">Toggle theme</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={10}>
          {currentTheme === "light" && <p>Light Mode</p>}
          {currentTheme === "dark" && <p>Dark Mode</p>}
          {currentTheme === "system" && <p>System Mode</p>}
          <TooltipArrow className="fill-primary" />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

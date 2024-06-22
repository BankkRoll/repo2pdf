"use client";

import * as React from "react";

import { ArrowRightIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

import { Button } from "../ui/button";
import { CopyNpmCommandButton } from "../ui/copy-command";
import { Input } from "../ui/input";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";

export const Hero = () => {
  const FADE_UP_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" } },
  };

  const pullupVariant = {
    initial: { y: 100, opacity: 0 },
    animate: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.05,
      },
    }),
  };

  const commands = {
    __npmCommand__: "npm install repo2pdf",
    __pnpmCommand__: "pnpm add repo2pdf",
    __bunCommand__: "bun add repo2pdf",
    __yarnCommand__: "yarn add repo2pdf",
  };

  const [selectedCommand, setSelectedCommand] = React.useState(
    commands.__npmCommand__,
  );

  const handleSelectCommand = (command: string) => {
    setSelectedCommand(command);
    toast.success(`Copied ${command}`);
  };

  return (
    <section className="max-w-7xl px-2 grid lg:grid-cols-2 justify-start place-items-center py-10 md:py-32 gap-10">
      <div className="lg:text-start space-y-6">
        <motion.div
          initial="hidden"
          animate="show"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.15,
              },
            },
          }}
        >
          <motion.h1
            className="font-display text-5xl md:text-8xl font-bold tracking-[-0.02em] drop-shadow-sm md:leading-[5rem]"
            variants={FADE_UP_ANIMATION_VARIANTS}
          >
            <span className="inline bg-gradient-to-r from-[#43e3ff]  to-[#060af3] text-transparent bg-clip-text">
              repo2pdf
            </span>
          </motion.h1>
          <motion.p
            className="my-6 text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0"
            variants={FADE_UP_ANIMATION_VARIANTS}
          >
            Turn your GitHub repository into a PDF with just a few clicks.
            Whether you need it for your business, AI, or any other purpose you
            can use repo2pdf.
          </motion.p>
          <motion.div
            className="block"
            initial="initial"
            animate="animate"
            variants={pullupVariant}
            custom={1}
          >
            <div className="relative w-[94%] md:w-[60%]">
              <Input
                type="text"
                value={selectedCommand}
                readOnly
                className="w-full pr-20"
              />
              <div className="absolute right-0 top-0 flex items-center h-full">
                <CopyNpmCommandButton
                  commands={commands}
                  onSelectCommand={handleSelectCommand}
                />
              </div>
            </div>
          </motion.div>
          <motion.div
            className="mt-6 flex flex-row gap-4"
            variants={FADE_UP_ANIMATION_VARIANTS}
          >
            <div>
              <Link href="/create" passHref>
                <Button className="w-full group">
                  Create PDF
                  <ArrowRightIcon className="ml-2 w-5 h-5 transition-transform duration-300 transform group-hover:translate-x-2" />
                </Button>
              </Link>
            </div>

            <div>
              <a
                rel="noreferrer noopener"
                href="https://github.com/BankkRoll/repo2pdf"
                target="_blank"
              >
                <Button className="w-full" variant="outline">
                  Github Repository
                  <GitHubLogoIcon className="ml-2 w-5 h-5" />
                </Button>
              </a>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.div
        className="hidden md:block"
        initial="initial"
        animate="animate"
        variants={pullupVariant}
        custom={1}
      >
        <img src="/repo2pdf.png" alt="hero" className="h-[30rem]" />
      </motion.div>
    </section>
  );
};

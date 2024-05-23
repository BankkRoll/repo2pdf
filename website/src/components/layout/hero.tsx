"use client";

import { ArrowRightIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "../ui/button";
import Link from "next/link";
import { motion } from "framer-motion";

export const Hero = () => {
  const FADE_UP_ANIMATION_VARIANTS = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring" } },
  };

  const pullupVariant = {
    initial: { y: 100, opacity: 0 },
    animate: (i: any) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.05,
      },
    }),
  };

  return (
    <section className="container grid lg:grid-cols-2 justify-start place-items-center py-10 md:py-32 gap-10">
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
          <motion.div
            className="md:hidden block"
            initial="initial"
            animate="animate"
            variants={pullupVariant}
            custom={1}
          >
            <img src="/repo2pdf.png" alt="hero" className="h-36" />
          </motion.div>
          <motion.h1
            className="font-display text-5xl md:text-8xl font-bold tracking-[-0.02em] drop-shadow-sm md:leading-[5rem]"
            variants={FADE_UP_ANIMATION_VARIANTS}
          >
            <span className="inline bg-gradient-to-r from-[#43e3ff]  to-[#060af3] text-transparent bg-clip-text">
              repo2pdf
            </span>
          </motion.h1>
          <motion.p
            className="mt-6 text-xl text-muted-foreground md:w-10/12 mx-auto lg:mx-0"
            variants={FADE_UP_ANIMATION_VARIANTS}
          >
            Turn your GitHub repository into a PDF with just a few clicks.
            Whether you need it for your business, AI, or any other purpose you
            can use repo2pdf.
          </motion.p>
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

      <div className="hero-gradient"></div>
    </section>
  );
};

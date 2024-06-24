"use client";

import { motion, useInView } from "framer-motion";

import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "../ui/button";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useRef } from "react";

export function Hero() {
  const fadeInRef = useRef(null);
  const fadeInInView = useInView(fadeInRef, {
    once: true,
  });

  const fadeUpVariants = {
    initial: {
      opacity: 0,
      y: 24,
    },
    animate: {
      opacity: 1,
      y: 0,
    },
  };

  return (
    <section id="hero" className="pb-24">
      <div className="relative h-full overflow-hidden">
        <div className="container z-10 flex flex-col">
          <div className="mt-6 md:mt-20 grid grid-cols-1">
            <div className="flex flex-col items-center gap-6 pb-8 text-center">
              <motion.h1
                ref={fadeInRef}
                className="text-balance bg-gradient-to-br from-black from-30% to-black/60 bg-clip-text py-6 text-5xl font-medium leading-none tracking-tighter text-transparent dark:from-white dark:to-white/40 sm:text-6xl md:text-7xl lg:text-8xl"
                animate={fadeInInView ? "animate" : "initial"}
                variants={fadeUpVariants}
                initial={false}
                transition={{
                  duration: 0.6,
                  delay: 0.1,
                  ease: [0.21, 0.47, 0.32, 0.98],
                  type: "spring",
                }}
              >
                Create a landing page with shad-next
              </motion.h1>

              <motion.p
                className="text-balance text-lg tracking-tight text-gray-400 md:text-xl"
                animate={fadeInInView ? "animate" : "initial"}
                variants={fadeUpVariants}
                initial={false}
                transition={{
                  duration: 0.6,
                  delay: 0.2,
                  ease: [0.21, 0.47, 0.32, 0.98],
                  type: "spring",
                }}
              >
                shad-next is a boilerplate for creating landing pages with ease.
              </motion.p>

              <motion.div
                animate={fadeInInView ? "animate" : "initial"}
                variants={fadeUpVariants}
                className="flex flex-col gap-4 lg:flex-row"
                initial={false}
                transition={{
                  duration: 0.6,
                  delay: 0.3,
                  ease: [0.21, 0.47, 0.32, 0.98],
                  type: "spring",
                }}
              >
                <Link href="/docs" passHref>
                  <Button variant="ringHover" className="w-full group">
                    Get Started
                    <ChevronRight className="ml-2 w-5 h-5 transition-transform duration-300 transform group-hover:translate-x-2" />
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>

          <motion.div
            animate={fadeInInView ? "animate" : "initial"}
            variants={fadeUpVariants}
            initial={false}
            transition={{
              duration: 0.6,
              delay: 0.4,
              ease: [0.21, 0.47, 0.32, 0.98],
              type: "spring",
            }}
            className="relative mx-auto mt-6 h-full w-full max-w-6xl rounded-xl border shadow-2xl"
          >
            <div
              className={cn(
                "absolute inset-0 bottom-1/2 h-full w-full [filter:blur(120px)]",

                // light styles
                "[background-image:linear-gradient(to_bottom,#ffaa40,transparent_30%)]",

                // dark styles
                "dark:[background-image:linear-gradient(to_bottom,#ffffff,transparent_30%)]",
              )}
            />
            <img
              src="/hero-banner.png"
              className="relative block h-full w-full rounded-xl dark:hidden"
            />
            <img
              src="/hero-banner.png"
              className="relative hidden h-full w-full rounded-xl dark:block"
            />
            <BorderBeam />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

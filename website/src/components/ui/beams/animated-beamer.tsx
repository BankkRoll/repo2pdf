// /src/components/ui/beams/animated-beamer.tsx

"use client";

import React, { forwardRef, useRef } from "react";

import { AnimatedBeam } from "./animated-beam";
import { FaRegFilePdf } from "react-icons/fa6";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

// eslint-disable-next-line react/display-name
const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode }
>(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex h-20 w-20 md:h-32 md:w-32 items-center justify-center rounded-full border-2 bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {children}
    </div>
  );
});

export function AnimatedBeamer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const div1Ref = useRef<HTMLDivElement>(null);
  const div2Ref = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative flex w-full px-2 md:px-20 xl:px-40 min-h-[400px] md:min-h-[80svh] items-center justify-center overflow-hidden rounded-lg border bg-background p-10 md:shadow-xl"
      ref={containerRef}
    >
      <div className="flex h-full w-full flex-col items-stretch justify-between gap-10">
        <div className="flex flex-row justify-between">
          <Circle ref={div1Ref}>
            <GitHubLogoIcon className="w-20 h-20 text-black" />
          </Circle>
          <Circle ref={div2Ref}>
            <FaRegFilePdf className="w-20 h-20 text-black" />
          </Circle>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div2Ref}
        startYOffset={10}
        endYOffset={10}
        curvature={-20}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div2Ref}
        reverse
        startYOffset={-10}
        endYOffset={-10}
        curvature={20}
      />
    </div>
  );
}

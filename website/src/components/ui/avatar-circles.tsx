// src/components/ui/avatar-circles.tsx

"use client";

import React, { useEffect, useState } from "react";

import { AnimatedTooltip } from "../ui/animated-tooltip";
import { cn } from "@/lib/utils";

interface Stargazer {
  id: number;
  name: string;
  designation: string;
  image: string;
  html_url: string;
}

interface AvatarCirclesProps {
  className?: string;
}

const AvatarCircles = ({ className }: AvatarCirclesProps) => {
  const [stargazers, setStargazers] = useState<Stargazer[]>([]);
  const [numPeople, setNumPeople] = useState<number>(0);
  const [displayCount, setDisplayCount] = useState<number>(5);

  useEffect(() => {
    const fetchStargazers = async () => {
      try {
        const response = await fetch("/api/github-stars");
        const data = await response.json();
        setStargazers(
          data.stargazers.map((stargazer: any, index: number) => ({
            id: index,
            name: stargazer.login,
            designation: stargazer.login,
            image: stargazer.avatar_url,
            html_url: stargazer.html_url,
          })),
        );
        setNumPeople(data.stars);
      } catch (error) {
        console.error("Failed to fetch stargazers:", error);
      }
    };

    fetchStargazers();

    const handleResize = () => {
      if (window.innerWidth < 640) {
        setDisplayCount(8);
      } else if (window.innerWidth < 768) {
        setDisplayCount(14);
      } else if (window.innerWidth < 1024) {
        setDisplayCount(20);
      } else {
        setDisplayCount(30);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={cn(
        "max-w-screen flex mx-auto -space-x-2 rtl:space-x-reverse",
        className,
      )}
    >
      {stargazers.slice(0, displayCount).map((stargazer) => (
        <a
          key={stargazer.id}
          href={stargazer.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative group"
        >
          <AnimatedTooltip items={[stargazer]} />
        </a>
      ))}
      {numPeople > displayCount && (
        <a
          className="z-[9999] w-14 h-14 flex items-center justify-center rounded-full border-2 border-white bg-black text-center text-xs font-medium text-white hover:bg-gray-600 dark:border-gray-800 dark:bg-white dark:text-black"
          href="https://github.com/BankkRoll/repo2pdf/stargazers"
          target="_blank"
          rel="noopener noreferrer"
        >
          +{numPeople - displayCount}
        </a>
      )}
    </div>
  );
};

export default AvatarCircles;

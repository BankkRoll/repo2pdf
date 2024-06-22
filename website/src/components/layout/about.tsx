"use client";

import { useEffect, useState } from "react";

import NumberTicker from "../ui/ticker";
import { Repo2Pdf } from "../ui/beams/git-pdf-beam";
import { motion } from "framer-motion";

export const About = () => {
  const repo2pdfurl = "https://github.com/BankkRoll/repo2pdf";

  interface StatsProps {
    quantity: number;
    description: string;
  }

  const [stats, setStats] = useState<StatsProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          githubRepo,
          githubPullRequests,
          npmWeeklyDownloads,
          npmMonthlyDownloads,
          npmTotalDownloads,
        ] = await Promise.all([
          fetch("https://api.github.com/repos/BankkRoll/repo2pdf").then((res) =>
            res.json(),
          ),
          fetch(
            "https://api.github.com/repos/BankkRoll/repo2pdf/pulls?state=open",
          ).then((res) => res.json()),
          fetch(
            "https://api.npmjs.org/downloads/point/last-week/repo2pdf",
          ).then((res) => res.json()),
          fetch(
            "https://api.npmjs.org/downloads/point/last-month/repo2pdf",
          ).then((res) => res.json()),
          fetch(
            "https://api.npmjs.org/downloads/point/2023-05-21:2030-05-23/repo2pdf",
          ).then((res) => res.json()),
        ]);

        const totalDownloads = npmTotalDownloads.downloads || 0;
        const openPullRequests = Array.isArray(githubPullRequests)
          ? githubPullRequests.length
          : 0;

        const fetchedStats: StatsProps[] = [
          {
            quantity: npmWeeklyDownloads.downloads || 0,
            description: "Weekly Downloads",
          },
          {
            quantity: npmMonthlyDownloads.downloads || 0,
            description: "Monthly Downloads",
          },
          {
            quantity: totalDownloads,
            description: "Total Downloads",
          },
          {
            quantity: githubRepo.stargazers_count || 0,
            description: "Stars",
          },
          {
            quantity: githubRepo.forks_count || 0,
            description: "Forks",
          },
          {
            quantity: githubRepo.open_issues_count || 0,
            description: "Issues",
          },
          {
            quantity: openPullRequests,
            description: "Pull Requests",
          },
        ];

        setStats(fetchedStats);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const slideUpVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <motion.section
      id="about"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:py-24"
      initial="hidden"
      animate="visible"
      variants={slideUpVariants}
    >
      <div className="bg-muted/50 border rounded-lg py-12">
        <div className="px-6 flex flex-col-reverse md:flex-row gap-8 md:gap-12">
          <div className="bg-green-0 flex flex-col justify-between w-full">
            <div className="pb-6">
              <div className="w-full flex items-center justify-center mx-auto p-4 md:p-10 max-w-2xl">
                <Repo2Pdf />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold">
                <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
                  About{" "}
                </span>
                <span className="inline bg-gradient-to-r from-[#43e3ff]  to-[#060af3] text-transparent bg-clip-text">
                  repo2pdf
                </span>
              </h2>
              <p className="text-md md:text-xl text-muted-foreground mt-4">
                repo2pdf is an innovative and versatile tool designed to
                seamlessly transform GitHub repositories into well-formatted,
                visually engaging, and easy-to-navigate PDF files. Starting as a
                side project for training AI models, but gaining attention from
                the community, repo2pdf has become a powerful tool for many
                different purposes. Now with a user-friendly interface!
              </p>
            </div>

            <section id="statistics">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8">
                {isLoading ? (
                  <p className="text-xl text-muted-foreground">Loading...</p>
                ) : (
                  stats.map(({ quantity, description }) => (
                    <div key={description} className="space-y-2 text-center">
                      <h2 className="text-3xl sm:text-4xl font-bold">
                        {quantity !== 0 ? (
                          <NumberTicker value={quantity} />
                        ) : (
                          quantity
                        )}
                      </h2>
                      <p className="text-xl text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

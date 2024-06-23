"use client";

import * as React from "react";

import { ArrowRightIcon, CheckIcon } from "@radix-ui/react-icons";

import { motion } from "framer-motion";

const steps = [
  {
    title: "Step 1: Install the Package",
    description: "Use your preferred package manager to install repo2pdf.",
    command: "npm install repo2pdf",
  },
  {
    title: "Step 2: Configure the Package",
    description: "Set up the configuration file to specify repository details.",
    command: "repo2pdf config",
  },
  {
    title: "Step 3: Generate PDF",
    description: "Run the command to generate a PDF from your GitHub repository.",
    command: "repo2pdf generate",
  },
];

export const Docs = () => {
  return (
    <motion.section
      id="docs"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:py-24"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: 50 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { type: "spring", stiffness: 100, damping: 20 },
        },
      }}
    >
      <div className="bg-muted/50 border rounded-lg py-12">
        <div className="px-6 flex flex-col gap-8">
          <h2 className="text-3xl md:text-4xl font-bold text-center">
            <span className="bg-gradient-to-b from-primary/60 to-primary text-transparent bg-clip-text">
              Getting Started
            </span>
          </h2>

          <div className="space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-300 dark:border-gray-700"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0, y: 50 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { delay: index * 0.2, type: "spring", stiffness: 100, damping: 20 },
                  },
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckIcon className="w-6 h-6 text-green-500 mr-3" />
                    <h3 className="text-xl font-bold">{step.title}</h3>
                  </div>
                  <ArrowRightIcon className="w-6 h-6 text-primary" />
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-2">{step.description}</p>
                <pre className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-sm border border-gray-300 dark:border-gray-700 mt-2">
                  <code className="block whitespace-pre-wrap">{step.command}</code>
                </pre>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
};

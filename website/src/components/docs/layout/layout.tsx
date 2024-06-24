// src/components/docs/layout/layout.tsx

import { MDXProvider } from "@mdx-js/react";
import React from "react";
import Sidebar from "./sidebar";
import { docsConfig } from "./config";
import { useMDXComponents } from "./components";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const components = useMDXComponents({});

  return (
    <div className="mt-12 flex font-sans">
      <Sidebar />
      <div className="flex-1 p-5 min-h-screen">
        <header className="border-b border-gray-200 pb-2 mb-5">
          <h1 className="text-4xl font-bold">{docsConfig.title}</h1>
        </header>
        <main className="min-h-[72svh]">
          <MDXProvider components={components}>{children}</MDXProvider>
        </main>
        <footer className="border-t border-gray-200 pt-2 mt-5">
          <p className="text-gray-600">{docsConfig.footerText}</p>
        </footer>
      </div>
    </div>
  );
}

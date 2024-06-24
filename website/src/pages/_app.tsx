// /src/pages/_app.tsx

import "@/styles/globals.css";

import { Analytics } from "@vercel/analytics/react";
import type { AppProps } from "next/app";
import Footer from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      attribute="class"
      enableSystem
      defaultTheme="dark"
      disableTransitionOnChange
    >
      <Navbar />
      <Component {...pageProps} />
      <Footer />
      <Toaster />
      <Analytics />
    </ThemeProvider>
  );
}

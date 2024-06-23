import { About } from "@/components/layout/about";
import { Docs } from "@/components/layout/docs";
import { FAQ } from "@/components/layout/faqs";
import { Hero } from "@/components/layout/hero";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between px-2 pb-6 ${inter.className}`}
    >
      <Hero />
      <About />
      <FAQ />
    </main>
  );
}

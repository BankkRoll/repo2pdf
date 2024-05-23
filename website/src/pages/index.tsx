import { Inter } from "next/font/google";
import { Hero } from "@/components/layout/hero";
import { About } from "@/components/layout/about";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between px-2 pb-6 ${inter.className}`}
    >
      <Hero />
      <About />
    </main>
  );
}

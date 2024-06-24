// /src/pages/index.tsx

import { FAQ } from "@/components/layout/faqs";
import { Features } from "@/components/layout/features";
import { Hero } from "@/components/layout/header";
import { Testimonials } from "@/components/layout/testimonials";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <Testimonials />
      <FAQ />
    </main>
  );
}

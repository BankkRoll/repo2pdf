import { HoverEffect } from "@/components/ui/card-hover-effect";

export function Features() {
  return (
    <section id="features" className="max-w-6xl mx-auto py-12">
      <div className="md:py-12 mx-4">
        <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
          Features
        </h2>
        <p className="mt-6 text-xl leading-8 text-black/80 dark:text-white">
          shad-next is a boilerplate for your next project. It includes
          everything you need to build a modern web app. Including Shadcn,
          Tailwind, NextJS, Supabase, and more.
        </p>
        <HoverEffect items={projects} />
      </div>
    </section>
  );
}

export const projects = [
  {
    title: "Shadcn",
    description:
      "Beautifully designed components that you can copy and paste into your apps. Accessible. Customizable. Open Source.",
    link: "https://ui.shadcn.com/",
  },
  {
    title: "NextJS",
    description:
      "A React framework for production with features like hybrid static & server rendering, TypeScript support, smart bundling, and route pre-fetching.",
    link: "https://nextjs.org",
  },
  {
    title: "Supabase",
    description:
      "An open-source Firebase alternative that provides all the backend services you need to build a product.",
    link: "https://supabase.io",
  },
  {
    title: "Tailwind",
    description:
      "A utility-first CSS framework for rapidly building custom designs.",
    link: "https://tailwindcss.com",
  },
  {
    title: "MDX Support",
    description:
      "Ready-to-use MDX support for docs thats easy to use and customize.",
    link: "https://mdxjs.com/",
  },
  {
    title: "Vercel",
    description:
      "A platform for frontend frameworks and static sites, built to integrate with headless content, commerce, or database.",
    link: "https://vercel.com",
  },
];

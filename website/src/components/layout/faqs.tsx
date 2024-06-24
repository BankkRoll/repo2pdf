import * as React from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Input } from "@/components/ui/input";
import ReactDOMServer from "react-dom/server";

const faqs = [
  {
    section: "General Questions",
    qa: [
      {
        question: "What is shad-next?",
        answer:
          "shad-next is a boilerplate for building beautiful websites using the latest technologies.",
      },
      {
        question: "How do I get started with shad-next?",
        answer:
          "To start using shad-next, you can clone the repository and follow the installation instructions.",
      },
    ],
  },
  {
    section: "Customization",
    qa: [
      {
        question: "Can I customize the theme?",
        answer: "Yes, you can customize the theme with any shadcn themes.",
      },
      {
        question: "How do I style Shadcn UI components?",
        answer:
          "You can style Shadcn UI components by extending Tailwind CSS classes or directly modifying their styles.",
      },
    ],
  },
];

const reactElementToString = (element: React.ReactNode | null | undefined) => {
  if (typeof element === "string") return element;
  if (React.isValidElement(element)) {
    return ReactDOMServer.renderToStaticMarkup(element);
  }
  return "";
};

export function FAQ() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filteredFaqs, setFilteredFaqs] = React.useState(faqs);

  React.useEffect(() => {
    const query = searchQuery.toLowerCase();

    const filtered = faqs.map((section) => ({
      ...section,
      qa: section.qa.filter(
        (qa) =>
          qa.question.toLowerCase().includes(query) ||
          reactElementToString(qa.answer).toLowerCase().includes(query),
      ),
    }));

    setFilteredFaqs(filtered);
  }, [searchQuery]);

  return (
    <section id="faqs" className="max-w-6xl mx-auto py-12">
      <div className="container max-w-5xl mx-auto px-4 md:py-12 md:px-8">
        <div className="mx-auto text-center">
          <h4 className="text-xl font-bold tracking-tight text-black dark:text-white">
            FAQs
          </h4>
          <h2 className="text-4xl font-bold tracking-tight text-black dark:text-white sm:text-6xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-6 text-xl leading-8 text-black/80 dark:text-white">
            Need help with something? Here are some of the most common questions
            we get.
          </p>
          <Input
            type="text"
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mt-6 p-3 rounded-lg border border-gray-300 dark:border-gray-700"
          />
        </div>
        <div className="container mx-auto my-12 space-y-12">
          {filteredFaqs.map((section, idx) => (
            <section key={idx} id={`faq-section-${idx}`}>
              <h2 className="my-4 text-base font-semibold tracking-tight text-left text-foreground/60">
                {section.section}
              </h2>
              <Accordion
                type="single"
                collapsible
                className="flex flex-col items-center justify-center w-full"
              >
                {section.qa.map((qa, idx) => (
                  <AccordionItem
                    key={idx}
                    value={qa.question}
                    className="w-full md:max-w-[95%]"
                  >
                    <AccordionTrigger>{qa.question}</AccordionTrigger>
                    <AccordionContent>{qa.answer}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}

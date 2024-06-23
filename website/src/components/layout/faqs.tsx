"use client";

import * as React from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { GitHubLogoIcon, GlobeIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import Link from "next/link";
import ReactDOMServer from "react-dom/server";
import { Separator } from "../ui/separator";

const faqsCLI = [
  {
    section: "Installation and Usage",
    qa: [
      {
        question: "How do I install repo2pdf using NPX?",
        answer: (
          <span>
            Install repo2pdf using NPX by running the following command:
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700 mt-2">
              <code>npx repo2pdf</code>
            </pre>
          </span>
        ),
      },
      {
        question: "How do I install repo2pdf by cloning the repository?",
        answer: (
          <span>
            Follow these steps to install repo2pdf by cloning the repository:
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700 mt-2">
              <code>
                git clone https://github.com/BankkRoll/repo2pdf
                <br />
                cd repo2pdf
                <br />
                npm install
                <br />
                npm run build
                <br />
                npm start
              </code>
            </pre>
          </span>
        ),
      },
    ],
  },
  {
    section: "Configuration",
    qa: [
      {
        question: "How can I customize the files and directories to ignore?",
        answer: (
          <span>
            You can add a <code>repo2pdf.ignore</code> file to the root of your
            repository to customize the files and directories to ignore.
            Example:
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700 mt-2">
              <code>
                {"{"}
                <br />
                &nbsp;&nbsp;&quot;ignoredFiles&quot;:
                [&quot;tsconfig.json&quot;, &quot;dist&quot;,
                &quot;node_modules&quot;],
                <br />
                &nbsp;&nbsp;&quot;ignoredExtensions&quot;: [&quot;.raw&quot;]
                <br />
                {"}"}
              </code>
            </pre>
          </span>
        ),
      },
    ],
  },
  {
    section: "Troubleshooting / FAQ",
    qa: [
      {
        question:
          "I'm getting an error 'Failed to install [package-name]'. What should I do?",
        answer: (
          <span>
            Make sure you have Node.js and npm installed on your system. Try
            running the following command to install the required package
            manually:
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700 mt-2">
              <code>npm install [package-name]</code>
            </pre>
          </span>
        ),
      },
      {
        question: "How can I customize the styling of the generated PDF?",
        answer: (
          <span>
            You can modify the code in <code>clone.ts</code> or{" "}
            <code>syntax.ts</code> to change the font, font size, colors, and
            other styling options for the PDF document. Example:
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700 mt-2">
              <code>doc.fontSize(12);</code>
            </pre>
          </span>
        ),
      },
      {
        question: "What types of files are supported for conversion to PDF?",
        answer: (
          <span>
            Currently, repo2pdf supports all text-based files for conversion to
            PDF. Binary files like images or compiled binaries are ignored.
          </span>
        ),
      },
      {
        question: "How can I modify the ignored files list?",
        answer: (
          <span>
            You can add a <code>repo2pdf.ignore</code> file to the root of your
            repository to customize the list of ignored files. Example:
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-300 dark:border-gray-700 mt-2">
              <code>
                {"{"}
                <br />
                &nbsp;&nbsp;&quot;ignoredFiles&quot;:
                [&quot;tsconfig.json&quot;],
                <br />
                &nbsp;&nbsp;&quot;ignoredExtensions&quot;: [&quot;.md&quot;]
                <br />
                {"}"}
              </code>
            </pre>
          </span>
        ),
      },
      {
        question: "How can I include line numbers in the generated PDF?",
        answer: (
          <span>
            During the execution of the script, you&apos;ll be prompted with the
            question &quot;Include line numbers?&quot;. Answering &apos;Y&apos;
            will include line numbers in the generated PDF.
          </span>
        ),
      },
      {
        question:
          "How can I keep the cloned repository after generating the PDF?",
        answer: (
          <span>
            You&apos;ll be asked &quot;Keep cloned repository?&quot; during the
            script execution. Answer &apos;Y&apos; to keep the cloned repository
            on your system after the PDF is generated.
          </span>
        ),
      },
      {
        question: "How can I generate a PDF for a local repository?",
        answer: (
          <span>
            When running the script, you&apos;ll be asked to either clone a
            repository or use a local one. Choose the latter and provide the
            local repository path.
          </span>
        ),
      },
    ],
  },
];

const faqsWebsite = [
  {
    section: "General Information",
    qa: [
      {
        question: "What does it cost to use repo2pdf?",
        answer: (
          <span>
            The package will always be free, but the website will soon become
            paid per generation. It will be super customizable, and pricing will
            be per page or render. Be sure to use and share it now. A referral
            system will also be integrated in the future.
          </span>
        ),
      },
      {
        question: "What customization options are available on the website?",
        answer: (
          <span>
            Customization options include:
            <ul className="list-disc ml-6 mt-2">
              <li>Select Files to Convert</li>
              <li>Add Line Numbers</li>
              <li>Add Page Numbers</li>
              <li>Add Table of Contents</li>
              <li>Bold Titles</li>
              <li>Include Date in Header</li>
              <li>Custom Header</li>
              <li>Include Date in Footer</li>
              <li>Custom Footer</li>
              <li>Select Font Type</li>
              <li>Courier</li>
              <li>Font Size</li>
            </ul>
          </span>
        ),
      },
    ],
  },
  {
    section: "Usage",
    qa: [
      {
        question: "How can I select files for PDF generation?",
        answer: (
          <span>
            You can choose specific files for PDF generation through the file
            selection interface on the website. This allows you to include only
            the files you need in the final PDF.
          </span>
        ),
      },
      {
        question: "How do I add line numbers to the generated PDF?",
        answer: (
          <span>
            During the customization process, you can select the option to add
            line numbers. This feature is currently in beta and helps to enhance
            the readability of the code in the PDF.
          </span>
        ),
      },
      {
        question: "How can I add page numbers to the generated PDF?",
        answer: (
          <span>
            You can include page numbers in your PDF by selecting the &quot;Add
            Page Numbers&quot; option. This feature is in beta and helps to keep
            your PDF organized.
          </span>
        ),
      },
      {
        question: "Can I add a table of contents to the generated PDF?",
        answer: (
          <span>
            Yes, you can add a table of contents to your PDF. This option is
            available during the customization process and is currently in beta.
          </span>
        ),
      },
      {
        question: "How do I bold titles in the generated PDF?",
        answer: (
          <span>
            You can choose to bold the titles in your PDF by selecting the
            &quot;Bold Titles&quot; option. This feature is in beta and helps to
            emphasize important sections.
          </span>
        ),
      },
      {
        question: "How can I include the date in the header of the PDF?",
        answer: (
          <span>
            To include the date in the header of your PDF, select the
            &quot;Include Date in Header&quot; option during customization. This
            feature is in beta and adds the current date to the header of each
            page.
          </span>
        ),
      },
      {
        question: "How can I customize the header of the PDF?",
        answer: (
          <span>
            You can add a custom header to your PDF by entering the desired text
            in the &quot;Custom Header&quot; field during the customization
            process. This allows for personalized or branded headers.
          </span>
        ),
      },
      {
        question: "How can I include the date in the footer of the PDF?",
        answer: (
          <span>
            To include the date in the footer of your PDF, select the
            &quot;Include Date in Footer&quot; option. This feature is in beta
            and adds the current date to the footer of each page.
          </span>
        ),
      },
      {
        question: "How can I customize the footer of the PDF?",
        answer: (
          <span>
            You can add a custom footer to your PDF by entering the desired text
            in the &quot;Custom Footer&quot; field during customization. This
            allows for personalized or branded footers.
          </span>
        ),
      },
      {
        question: "What font types are available?",
        answer: (
          <span>
            You can select from various font types during customization. The
            default options include standard fonts like Courier. Additional font
            types may be added in the future.
          </span>
        ),
      },
      {
        question: "How can I adjust the font size in the PDF?",
        answer: (
          <span>
            The font size can be adjusted during the customization process. This
            allows you to set the text size according to your preferences or
            requirements.
          </span>
        ),
      },
    ],
  },
];

const reactElementToString = (element: {} | null | undefined) => {
  if (typeof element === "string") return element;
  if (React.isValidElement(element)) {
    return ReactDOMServer.renderToStaticMarkup(element);
  }
  return "";
};

export function FAQ() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFaqsCLI, setFilteredFaqsCLI] = useState(faqsCLI);
  const [filteredFaqsWebsite, setFilteredFaqsWebsite] = useState(faqsWebsite);
  const [isCLISectionOpen, setIsCLISectionOpen] = useState(true);
  const [isWebsiteSectionOpen, setIsWebsiteSectionOpen] = useState(true);

  useEffect(() => {
    const query = searchQuery.toLowerCase();

    const filteredCLI = faqsCLI.map((section) => ({
      ...section,
      qa: section.qa.filter(
        (qa) =>
          qa.question.toLowerCase().includes(query) ||
          reactElementToString(qa.answer).toLowerCase().includes(query)
      ),
    }));

    const filteredWebsite = faqsWebsite.map((section) => ({
      ...section,
      qa: section.qa.filter(
        (qa) =>
          qa.question.toLowerCase().includes(query) ||
          reactElementToString(qa.answer).toLowerCase().includes(query)
      ),
    }));

    setFilteredFaqsCLI(filteredCLI);
    setFilteredFaqsWebsite(filteredWebsite);
  }, [searchQuery]);

  return (
    <section id="faq" className="pt-10">
      <div className="container px-4 py-12 mx-auto md:px-8">
        <div className="max-w-5xl mx-auto text-center">
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
          <Accordion
            type="single"
            collapsible
            value={isCLISectionOpen ? "cli-section" : undefined}
            onValueChange={(value) => setIsCLISectionOpen(!!value)}
          >
            <AccordionItem value="cli-section">
              <AccordionTrigger className="mb-4 text-base font-semibold tracking-tight text-left text-foreground/60">
                CLI FAQs
              </AccordionTrigger>
              <AccordionContent>
                {filteredFaqsCLI.map(
                  (faq, idx) =>
                    faq.qa.length > 0 && (
                      <section key={idx} id={"faq-cli-" + faq.section}>
                        <h2 className="my-4 text-base font-semibold tracking-tight text-left text-foreground/60">
                          {faq.section}
                        </h2>
                        <Accordion
                          type="single"
                          collapsible
                          className="flex flex-col items-center justify-center w-full"
                        >
                          {faq.qa.map((qa, idx) => (
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
                    )
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <Accordion
            type="single"
            collapsible
            value={isWebsiteSectionOpen ? "website-section" : undefined}
            onValueChange={(value) => setIsWebsiteSectionOpen(!!value)}
          >
            <AccordionItem value="website-section">
              <AccordionTrigger className="mb-4 text-base font-semibold tracking-tight text-left text-foreground/60">
                Website FAQs
              </AccordionTrigger>
              <AccordionContent>
                {filteredFaqsWebsite.map(
                  (faq, idx) =>
                    faq.qa.length > 0 && (
                      <section key={idx} id={"faq-website-" + faq.section}>
                        <h2 className="my-4 text-base font-semibold tracking-tight text-left text-foreground/60">
                          {faq.section}
                        </h2>
                        <Accordion
                          type="single"
                          collapsible
                          className="flex flex-col items-center justify-center w-full"
                        >
                          {faq.qa.map((qa, idx) => (
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
                    )
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
        <div className="flex justify-center mt-12 space-x-4">
          <Link href="https://github.com/BankkRoll/repo2pdf" passHref>
            <Button variant="ringHoverOutline" className="group">
              <GitHubLogoIcon className="mr-2 w-5 h-5 transition-transform duration-300 transform group-hover:-translate-x-2" />
              <span className="font-semibold">GitHub Repository</span>
            </Button>
          </Link>
          <Link href="https://repo2pdf.vercel.app/" passHref>
            <Button variant="ringHoverOutline" className="group">
              <GlobeIcon className="mr-2 w-5 h-5 transition-transform duration-300 transform group-hover:-translate-x-2" />
              <span className="font-semibold">Website</span>
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

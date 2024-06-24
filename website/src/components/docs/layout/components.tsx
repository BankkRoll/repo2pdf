// src/components/docs/components.tsx
import { CodeBlock, dracula } from "react-code-blocks";

import { Accordion } from "../components/accordion";
import { Callout } from "../components/callout";
import type { MDXComponents } from "mdx/types";
import { Npm2Yarn } from "../components/npm2yarn";
import { Tabs } from "../components/tabs";
import { toast } from "sonner";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: ({ children }) => (
      <h1 className="text-5xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight mb-4">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-4xl font-bold text-gray-800 dark:text-gray-200 leading-tight mb-3">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-3xl font-semibold text-gray-700 dark:text-gray-300 leading-tight mb-2">
        {children}
      </h3>
    ),
    p: ({ children }) => (
      <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
        {children}
      </p>
    ),
    img: (props) => (
      <img className="w-full h-auto rounded-lg shadow-md" {...props} />
    ),
    a: ({ children, ...props }) => (
      <a
        className="text-blue-500 dark:text-blue-400 hover:underline"
        {...props}
      >
        {children}
      </a>
    ),
    ul: ({ children }) => (
      <ul className="list-disc list-inside mb-4">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-inside mb-4">{children}</ol>
    ),
    li: ({ children }) => <li className="ml-4 mb-1">{children}</li>,
    code: ({ children }) => (
      <code className="bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 p-1 rounded">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="bg-gray-900 dark:bg-gray-700 text-white p-4 rounded overflow-auto mb-4">
        <CodeBlock
          text={String(children).trim()}
          language="javascript"
          showLineNumbers={true}
          theme={dracula}
        />
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 text-gray-600 dark:text-gray-400 italic my-4">
        {children}
      </blockquote>
    ),
    table: ({ children }) => (
      <div className="overflow-auto mb-4">
        <table className="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          {children}
        </table>
      </div>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-left text-gray-700 dark:text-gray-300">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        {children}
      </td>
    ),
    Accordion: ({ items }) => <Accordion items={items} />,
    Tabs: ({ tabs }) => <Tabs tabs={tabs} />,
    Callout: ({ children, type, title }) => (
      <Callout type={type} title={title}>
        {children}
      </Callout>
    ),
    npm2yarn: ({ packageName }) => <Npm2Yarn packageName={packageName} />,
    toast: ({ message }) => toast(message),
    ...components,
  };
}

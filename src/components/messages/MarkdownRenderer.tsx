/**
 * MarkdownRenderer - Render markdown content with syntax highlighting
 *
 * Features:
 * - GitHub Flavored Markdown (tables, strikethrough, etc.)
 * - Syntax highlighted code blocks via CodeBlock component
 * - Styled inline code, links, lists, headings
 * - Safe HTML handling
 */

import { memo, useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Custom components for markdown rendering
const components: Components = {
  // Code blocks with syntax highlighting
  code({ node, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match && !className;
    const code = String(children).replace(/\n$/, "");

    if (isInline) {
      return (
        <code
          className="px-1.5 py-0.5 mx-0.5 rounded bg-tertiary text-accent-primary font-mono text-sm"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <CodeBlock
        code={code}
        language={match?.[1] || "text"}
        showLineNumbers={code.split("\n").length > 3}
      />
    );
  },

  // Pre blocks (usually wraps code)
  pre({ children }) {
    return <div className="my-3">{children}</div>;
  },

  // Paragraphs
  p({ children }) {
    return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
  },

  // Headings
  h1({ children }) {
    return (
      <h1 className="text-2xl font-bold text-primary mt-6 mb-4 first:mt-0">
        {children}
      </h1>
    );
  },
  h2({ children }) {
    return (
      <h2 className="text-xl font-semibold text-primary mt-5 mb-3 first:mt-0">
        {children}
      </h2>
    );
  },
  h3({ children }) {
    return (
      <h3 className="text-lg font-semibold text-primary mt-4 mb-2 first:mt-0">
        {children}
      </h3>
    );
  },
  h4({ children }) {
    return (
      <h4 className="text-base font-semibold text-primary mt-3 mb-2 first:mt-0">
        {children}
      </h4>
    );
  },
  h5({ children }) {
    return (
      <h5 className="text-sm font-semibold text-primary mt-3 mb-1 first:mt-0">
        {children}
      </h5>
    );
  },
  h6({ children }) {
    return (
      <h6 className="text-sm font-medium text-secondary mt-3 mb-1 first:mt-0">
        {children}
      </h6>
    );
  },

  // Links
  a({ href, children }) {
    const isExternal = href?.startsWith("http");
    return (
      <a
        href={href}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className="text-accent-primary hover:underline"
      >
        {children}
        {isExternal && (
          <svg
            className="inline-block w-3 h-3 ml-0.5 -mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        )}
      </a>
    );
  },

  // Lists
  ul({ children }) {
    return (
      <ul className="list-disc list-inside mb-3 space-y-1 pl-2">{children}</ul>
    );
  },
  ol({ children }) {
    return (
      <ol className="list-decimal list-inside mb-3 space-y-1 pl-2">
        {children}
      </ol>
    );
  },
  li({ children }) {
    return <li className="text-primary">{children}</li>;
  },

  // Blockquotes
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-accent-primary/50 pl-4 py-1 my-3 text-secondary italic">
        {children}
      </blockquote>
    );
  },

  // Horizontal rule
  hr() {
    return <hr className="my-6 border-t border-default" />;
  },

  // Tables (GFM)
  table({ children }) {
    return (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse border border-default text-sm">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-tertiary">{children}</thead>;
  },
  tbody({ children }) {
    return <tbody className="divide-y divide-default">{children}</tbody>;
  },
  tr({ children }) {
    return <tr className="hover:bg-secondary/20">{children}</tr>;
  },
  th({ children }) {
    return (
      <th className="px-3 py-2 text-left font-semibold text-primary border-b border-default">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="px-3 py-2 text-primary">{children}</td>;
  },

  // Strikethrough (GFM)
  del({ children }) {
    return <del className="text-muted line-through">{children}</del>;
  },

  // Strong/Bold
  strong({ children }) {
    return <strong className="font-semibold text-primary">{children}</strong>;
  },

  // Emphasis/Italic
  em({ children }) {
    return <em className="italic">{children}</em>;
  },

  // Images
  img({ src, alt }) {
    return (
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto rounded-lg my-4 border border-default"
        loading="lazy"
      />
    );
  },
};

function MarkdownRendererComponent({
  content,
  className = "",
}: MarkdownRendererProps) {
  // Memoize the remarkPlugins array to prevent unnecessary re-renders
  const remarkPlugins = useMemo(() => [remarkGfm], []);

  return (
    <div
      className={`markdown-content text-primary text-sm leading-relaxed ${className}`}
    >
      <ReactMarkdown remarkPlugins={remarkPlugins} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererComponent);

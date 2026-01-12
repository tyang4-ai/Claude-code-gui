/**
 * CodeBlock - Syntax highlighted code display using Shiki
 *
 * Features:
 * - Automatic language detection from filename or explicit lang
 * - Line numbers (optional)
 * - Line highlighting
 * - Copy to clipboard
 * - Theme matching dark mode
 */

import { useEffect, useState, useCallback, memo } from "react";
import { codeToHtml } from "shiki";

// Language mapping from file extensions
const EXTENSION_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  rs: "rust",
  py: "python",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "xml",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  mdx: "mdx",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  fish: "fish",
  ps1: "powershell",
  dockerfile: "dockerfile",
  docker: "dockerfile",
  makefile: "makefile",
  cmake: "cmake",
  vue: "vue",
  svelte: "svelte",
  astro: "astro",
  graphql: "graphql",
  gql: "graphql",
  prisma: "prisma",
  proto: "protobuf",
  lua: "lua",
  r: "r",
  tex: "latex",
  diff: "diff",
  patch: "diff",
  ini: "ini",
  cfg: "ini",
  conf: "nginx",
  nginx: "nginx",
};

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  maxHeight?: number;
}

function CodeBlockComponent({
  code,
  language,
  filename,
  showLineNumbers = true,
  highlightLines = [],
  maxHeight = 400,
}: CodeBlockProps) {
  const [html, setHtml] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Detect language from filename or use provided language
  const detectedLang = useCallback(() => {
    if (language) return language;
    if (filename) {
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      return EXTENSION_TO_LANG[ext] || "text";
    }
    return "text";
  }, [language, filename]);

  // Highlight code with Shiki
  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        const lang = detectedLang();

        const highlighted = await codeToHtml(code, {
          lang,
          theme: "github-dark",
          transformers: [
            {
              line(node, line) {
                // Add line number data attribute
                this.addClassToHast(node, "code-line");
                node.properties = node.properties || {};
                node.properties["data-line"] = line;

                // Highlight specific lines
                if (highlightLines.includes(line)) {
                  this.addClassToHast(node, "highlighted");
                }
              },
            },
          ],
        });

        if (!cancelled) {
          setHtml(highlighted);
          setIsLoading(false);
        }
      } catch (e) {
        console.warn("Shiki highlighting failed, falling back to plain text:", e);
        if (!cancelled) {
          // Fallback to plain text with escaping
          const escaped = code
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          setHtml(`<pre class="shiki"><code>${escaped}</code></pre>`);
          setIsLoading(false);
        }
      }
    }

    setIsLoading(true);
    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, detectedLang, highlightLines]);

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  }, [code]);

  const lineCount = code.split("\n").length;

  return (
    <div className="code-block-container relative group rounded-lg overflow-hidden border border-default">
      {/* Header with filename and copy button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-tertiary border-b border-default">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="text-xs text-secondary font-mono">{filename}</span>
          )}
          {!filename && language && (
            <span className="text-xs text-muted uppercase">{language}</span>
          )}
          <span className="text-xs text-muted">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 text-xs text-secondary hover:text-primary rounded transition-colors hover:bg-primary/20"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div
        className="overflow-auto bg-[#0d1117]"
        style={{ maxHeight }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-secondary">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </div>
        ) : (
          <div
            className={`code-block ${showLineNumbers ? "with-line-numbers" : ""}`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {/* CSS for line numbers and highlighting */}
      <style>{`
        .code-block pre {
          margin: 0;
          padding: 1rem;
          overflow-x: auto;
          font-size: 0.8125rem;
          line-height: 1.5;
        }
        .code-block code {
          display: block;
          font-family: 'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace;
        }
        .code-block .code-line {
          display: block;
          padding: 0 0.5rem;
          margin: 0 -0.5rem;
        }
        .code-block.with-line-numbers .code-line::before {
          content: attr(data-line);
          display: inline-block;
          width: 2.5rem;
          margin-right: 1rem;
          text-align: right;
          color: #6e7681;
          user-select: none;
        }
        .code-block .code-line.highlighted {
          background-color: rgba(56, 139, 253, 0.15);
          border-left: 3px solid #388bfd;
          padding-left: calc(0.5rem - 3px);
        }
      `}</style>
    </div>
  );
}

export const CodeBlock = memo(CodeBlockComponent);

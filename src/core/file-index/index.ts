/**
 * File Index - Fast file search for @ autocomplete
 *
 * Uses a trie-based index for fast prefix matching and
 * caches results to handle large codebases efficiently.
 */

import { invoke } from "@tauri-apps/api/core";

interface FileEntry {
  path: string;
  name: string;
  relativePath: string;
  isDirectory: boolean;
}

interface TrieNode {
  children: Map<string, TrieNode>;
  entries: FileEntry[];
}

// Singleton instance
let fileIndexInstance: FileIndex | null = null;

export class FileIndex {
  private trie: TrieNode = { children: new Map(), entries: [] };
  private allFiles: FileEntry[] = [];
  private workingDir: string = "";
  private lastIndexTime: number = 0;
  private indexing: boolean = false;
  private cacheValidityMs = 30000; // 30 seconds

  static getInstance(): FileIndex {
    if (!fileIndexInstance) {
      fileIndexInstance = new FileIndex();
    }
    return fileIndexInstance;
  }

  /**
   * Build or refresh the file index for a directory
   */
  async buildIndex(workingDir: string, force = false): Promise<void> {
    // Check if cache is still valid
    const now = Date.now();
    if (
      !force &&
      this.workingDir === workingDir &&
      now - this.lastIndexTime < this.cacheValidityMs
    ) {
      return;
    }

    // Prevent concurrent indexing
    if (this.indexing) {
      return;
    }

    this.indexing = true;
    this.workingDir = workingDir;

    try {
      // Get file list from backend using ripgrep-style fast search
      const files = await this.fetchFiles(workingDir);

      // Reset trie
      this.trie = { children: new Map(), entries: [] };
      this.allFiles = [];

      // Build entries and index
      for (const filePath of files) {
        const relativePath = this.getRelativePath(filePath, workingDir);
        const name = this.getFileName(filePath);

        const entry: FileEntry = {
          path: filePath,
          name,
          relativePath,
          isDirectory: false, // We're only indexing files for now
        };

        this.allFiles.push(entry);
        this.indexEntry(entry);
      }

      this.lastIndexTime = now;
    } catch (error) {
      console.error("Failed to build file index:", error);
    } finally {
      this.indexing = false;
    }
  }

  private async fetchFiles(workingDir: string): Promise<string[]> {
    try {
      // Try to use ripgrep-based fast file listing
      const files = await invoke<string[]>("list_files_recursive", {
        path: workingDir,
        maxFiles: 50000,
        ignorePatterns: [
          "node_modules",
          ".git",
          "dist",
          "build",
          ".next",
          "__pycache__",
          "target",
          ".cache",
          "coverage",
        ],
      });
      return files;
    } catch {
      // Fallback to basic glob
      try {
        return await invoke<string[]>("list_files", {
          path: workingDir,
          pattern: "**/*",
        });
      } catch {
        return [];
      }
    }
  }

  private getRelativePath(filePath: string, workingDir: string): string {
    // Normalize path separators
    const normalizedFile = filePath.replace(/\\/g, "/");
    const normalizedDir = workingDir.replace(/\\/g, "/");

    if (normalizedFile.startsWith(normalizedDir)) {
      return normalizedFile.slice(normalizedDir.length + 1);
    }
    return normalizedFile;
  }

  private getFileName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);
    return parts[parts.length - 1] || "";
  }

  /**
   * Index a single entry in the trie
   */
  private indexEntry(entry: FileEntry): void {
    // Index by filename
    this.insertIntoTrie(entry.name.toLowerCase(), entry);

    // Index by path segments
    const segments = entry.relativePath.toLowerCase().split(/[/\\]/);
    for (const segment of segments) {
      if (segment) {
        this.insertIntoTrie(segment, entry);
      }
    }
  }

  private insertIntoTrie(key: string, entry: FileEntry): void {
    let node = this.trie;

    for (const char of key) {
      let child = node.children.get(char);
      if (!child) {
        child = { children: new Map(), entries: [] };
        node.children.set(char, child);
      }
      node = child;
    }

    // Avoid duplicates
    if (!node.entries.find((e) => e.path === entry.path)) {
      node.entries.push(entry);
    }
  }

  /**
   * Search for files matching a query
   */
  search(query: string, limit = 20): FileEntry[] {
    if (!query) {
      // Return most recently modified files if no query
      return this.allFiles.slice(0, limit);
    }

    const normalizedQuery = query.toLowerCase();

    // Find trie node for the query prefix
    let node = this.trie;
    for (const char of normalizedQuery) {
      const child = node.children.get(char);
      if (!child) {
        // No matches for this prefix
        return [];
      }
      node = child;
    }

    // Collect all entries from this node and descendants
    const results = new Set<FileEntry>();
    this.collectEntries(node, results, limit * 2);

    // Score and sort results
    const scored = Array.from(results).map((entry) => ({
      entry,
      score: this.scoreMatch(entry, normalizedQuery),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.entry);
  }

  private collectEntries(
    node: TrieNode,
    results: Set<FileEntry>,
    limit: number
  ): void {
    // Add entries at this node
    for (const entry of node.entries) {
      results.add(entry);
      if (results.size >= limit) return;
    }

    // Recursively collect from children
    for (const child of node.children.values()) {
      this.collectEntries(child, results, limit);
      if (results.size >= limit) return;
    }
  }

  private scoreMatch(entry: FileEntry, query: string): number {
    let score = 0;
    const name = entry.name.toLowerCase();
    const path = entry.relativePath.toLowerCase();

    // Exact filename match
    if (name === query) {
      score += 100;
    }
    // Filename starts with query
    else if (name.startsWith(query)) {
      score += 80;
    }
    // Filename contains query
    else if (name.includes(query)) {
      score += 50;
    }
    // Path contains query
    else if (path.includes(query)) {
      score += 30;
    }

    // Boost for shorter paths (more relevant)
    score += Math.max(0, 20 - path.split("/").length * 2);

    // Boost for common file extensions
    if (
      name.endsWith(".ts") ||
      name.endsWith(".tsx") ||
      name.endsWith(".js") ||
      name.endsWith(".jsx")
    ) {
      score += 5;
    }

    return score;
  }

  /**
   * Get total file count
   */
  getFileCount(): number {
    return this.allFiles.length;
  }

  /**
   * Check if index is ready
   */
  isReady(): boolean {
    return this.allFiles.length > 0 && !this.indexing;
  }

  /**
   * Check if currently indexing
   */
  isIndexing(): boolean {
    return this.indexing;
  }

  /**
   * Clear the index
   */
  clear(): void {
    this.trie = { children: new Map(), entries: [] };
    this.allFiles = [];
    this.workingDir = "";
    this.lastIndexTime = 0;
  }
}

/**
 * Get the FileIndex singleton instance
 */
export function getFileIndex(): FileIndex {
  return FileIndex.getInstance();
}

/**
 * Session Search Module
 *
 * Provides advanced search capabilities for session history including
 * full-text search, filtering, and ranking.
 */

import type { SessionSummary, PersistedSession } from "./types";
import type { ContentBlock } from "../../core/types";

/**
 * Search result with relevance score
 */
export interface SearchResult {
  session: SessionSummary;
  score: number;
  matchedText?: string;
  matchLocation?: "title" | "transcript" | "tags";
}

/**
 * Search options for advanced queries
 */
export interface SearchOptions {
  caseSensitive?: boolean;
  matchWholeWord?: boolean;
  includeCode?: boolean;
  minRelevance?: number;
}

/**
 * Extract searchable text from content blocks
 */
function extractTextFromContentBlocks(blocks: ContentBlock[]): string {
  const texts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "text":
        texts.push(block.text);
        break;
      case "thinking":
        texts.push(block.thinking);
        break;
      case "tool_use":
        // Include tool input as searchable text
        texts.push(JSON.stringify(block.input));
        break;
    }
  }

  return texts.join(" ");
}

/**
 * Extract all searchable text from a session
 */
export function extractSessionText(session: PersistedSession): string {
  const parts: string[] = [session.title, session.workingDir];

  // Add tags
  parts.push(...session.tags);

  // Add transcript content
  for (const entry of session.transcript) {
    if (entry.role === "user") {
      parts.push(entry.content);
    } else if (entry.role === "assistant") {
      parts.push(extractTextFromContentBlocks(entry.content));
    }
  }

  return parts.join(" ");
}

/**
 * Calculate relevance score for a search query
 */
function calculateRelevance(
  text: string,
  query: string,
  options: SearchOptions = {}
): number {
  const searchText = options.caseSensitive ? text : text.toLowerCase();
  const searchQuery = options.caseSensitive ? query : query.toLowerCase();

  let score = 0;

  // Exact phrase match (highest score)
  if (searchText.includes(searchQuery)) {
    score += 100;

    // Bonus for match at start
    if (searchText.startsWith(searchQuery)) {
      score += 50;
    }
  }

  // Word matches
  const queryWords = searchQuery.split(/\s+/).filter((w) => w.length > 0);
  const textWords = searchText.split(/\s+/);

  for (const queryWord of queryWords) {
    let wordMatches = 0;

    for (const textWord of textWords) {
      if (options.matchWholeWord) {
        if (textWord === queryWord) {
          wordMatches++;
        }
      } else {
        if (textWord.includes(queryWord)) {
          wordMatches++;
        }
      }
    }

    // Each word match adds to score
    score += wordMatches * 10;
  }

  // Calculate word coverage percentage
  const matchedWords = queryWords.filter((qw) =>
    textWords.some((tw) =>
      options.matchWholeWord ? tw === qw : tw.includes(qw)
    )
  );
  const coverage = matchedWords.length / queryWords.length;
  score += coverage * 50;

  return score;
}

/**
 * Find the best matching text snippet for display
 */
function findMatchSnippet(
  text: string,
  query: string,
  contextChars: number = 100
): string | undefined {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const index = lowerText.indexOf(lowerQuery);
  if (index === -1) return undefined;

  const start = Math.max(0, index - contextChars);
  const end = Math.min(text.length, index + query.length + contextChars);

  let snippet = text.slice(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Search through sessions with full-text search
 */
export function searchSessions(
  sessions: PersistedSession[],
  query: string,
  options: SearchOptions = {}
): SearchResult[] {
  if (!query.trim()) {
    return sessions.map((s) => ({
      session: toSummary(s),
      score: 0,
    }));
  }

  const results: SearchResult[] = [];
  const minRelevance = options.minRelevance || 10;

  for (const session of sessions) {
    // Search in title
    const titleScore = calculateRelevance(session.title, query, options);

    // Search in tags
    const tagsText = session.tags.join(" ");
    const tagsScore = calculateRelevance(tagsText, query, options);

    // Search in transcript
    const transcriptText = extractSessionText(session);
    const transcriptScore = calculateRelevance(transcriptText, query, options);

    // Calculate total score with weights
    const totalScore = titleScore * 3 + tagsScore * 2 + transcriptScore;

    if (totalScore >= minRelevance) {
      let matchedText: string | undefined;
      let matchLocation: SearchResult["matchLocation"];

      if (titleScore > 0) {
        matchedText = findMatchSnippet(session.title, query, 50);
        matchLocation = "title";
      } else if (tagsScore > 0) {
        matchedText = tagsText;
        matchLocation = "tags";
      } else {
        matchedText = findMatchSnippet(transcriptText, query);
        matchLocation = "transcript";
      }

      results.push({
        session: toSummary(session),
        score: totalScore,
        matchedText,
        matchLocation,
      });
    }
  }

  // Sort by relevance score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Convert PersistedSession to SessionSummary
 */
function toSummary(session: PersistedSession): SessionSummary {
  let previewText: string | undefined;
  const firstAssistant = session.transcript.find((e) => e.role === "assistant");
  if (firstAssistant && firstAssistant.role === "assistant") {
    const text = extractTextFromContentBlocks(firstAssistant.content);
    previewText = text.slice(0, 100);
  }

  return {
    id: session.id,
    claudeSessionId: session.claudeSessionId,
    title: session.title,
    workingDir: session.workingDir,
    model: session.model,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    promptCount: session.promptCount,
    totalCostUsd: session.totalCostUsd,
    isPinned: session.isPinned,
    tags: session.tags,
    previewText,
  };
}

/**
 * Filter sessions by date range
 */
export function filterByDateRange(
  sessions: SessionSummary[],
  startDate?: number,
  endDate?: number
): SessionSummary[] {
  let filtered = sessions;

  if (startDate) {
    filtered = filtered.filter((s) => s.createdAt >= startDate);
  }

  if (endDate) {
    filtered = filtered.filter((s) => s.createdAt <= endDate);
  }

  return filtered;
}

/**
 * Filter sessions by cost range
 */
export function filterByCostRange(
  sessions: SessionSummary[],
  minCost?: number,
  maxCost?: number
): SessionSummary[] {
  let filtered = sessions;

  if (minCost !== undefined) {
    filtered = filtered.filter((s) => s.totalCostUsd >= minCost);
  }

  if (maxCost !== undefined) {
    filtered = filtered.filter((s) => s.totalCostUsd <= maxCost);
  }

  return filtered;
}

/**
 * Filter sessions by prompt count
 */
export function filterByPromptCount(
  sessions: SessionSummary[],
  minPrompts?: number,
  maxPrompts?: number
): SessionSummary[] {
  let filtered = sessions;

  if (minPrompts !== undefined) {
    filtered = filtered.filter((s) => s.promptCount >= minPrompts);
  }

  if (maxPrompts !== undefined) {
    filtered = filtered.filter((s) => s.promptCount <= maxPrompts);
  }

  return filtered;
}

/**
 * Sort sessions by various criteria
 */
export type SortBy = "date" | "cost" | "prompts" | "title";
export type SortOrder = "asc" | "desc";

export function sortSessions(
  sessions: SessionSummary[],
  sortBy: SortBy,
  order: SortOrder = "desc"
): SessionSummary[] {
  const sorted = [...sessions];

  sorted.sort((a, b) => {
    // Pinned sessions always come first
    if (a.isPinned !== b.isPinned) {
      return a.isPinned ? -1 : 1;
    }

    let comparison = 0;

    switch (sortBy) {
      case "date":
        comparison = a.updatedAt - b.updatedAt;
        break;
      case "cost":
        comparison = a.totalCostUsd - b.totalCostUsd;
        break;
      case "prompts":
        comparison = a.promptCount - b.promptCount;
        break;
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return order === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Fuzzy Search Algorithm
 *
 * Implements fuzzy string matching for command palette search.
 * Based on Sublime Text's fuzzy matching algorithm with scoring.
 */

export interface FuzzyMatch {
  /** The matched string */
  target: string;

  /** Match score (0-1, higher is better) */
  score: number;

  /** Indices of matched characters in target */
  matchedIndices: number[];
}

/**
 * Performs fuzzy search on a target string
 *
 * Algorithm:
 * - Exact match: highest score
 * - Sequential character matches: high score
 * - Word boundary matches: medium-high score
 * - Scattered matches: lower score
 * - Case-sensitive bonus
 * - Position bonus (earlier matches score higher)
 *
 * @param query - The search query
 * @param target - The string to match against
 * @returns FuzzyMatch result or null if no match
 */
export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (!query) {
    return {
      target,
      score: 1,
      matchedIndices: [],
    };
  }

  if (!target) {
    return null;
  }

  // Exact match
  if (target === query) {
    return {
      target,
      score: 1,
      matchedIndices: Array.from({ length: query.length }, (_, i) => i),
    };
  }

  // Case-insensitive exact match
  if (target.toLowerCase() === query.toLowerCase()) {
    return {
      target,
      score: 0.95,
      matchedIndices: Array.from({ length: query.length }, (_, i) => i),
    };
  }

  const lowerQuery = query.toLowerCase();
  const lowerTarget = target.toLowerCase();

  // Exact substring match
  const exactIndex = lowerTarget.indexOf(lowerQuery);
  if (exactIndex !== -1) {
    const score = 0.9 - exactIndex * 0.01; // Prefer earlier matches
    return {
      target,
      score: Math.max(0.5, score),
      matchedIndices: Array.from(
        { length: query.length },
        (_, i) => exactIndex + i
      ),
    };
  }

  // Fuzzy sequential match
  const matchedIndices: number[] = [];
  let queryIndex = 0;
  let targetIndex = 0;
  let consecutiveMatches = 0;
  let totalConsecutive = 0;
  let wordBoundaryMatches = 0;

  while (queryIndex < lowerQuery.length && targetIndex < lowerTarget.length) {
    const queryChar = lowerQuery[queryIndex];
    const targetChar = lowerTarget[targetIndex];

    if (queryChar === targetChar) {
      matchedIndices.push(targetIndex);

      // Bonus for consecutive matches
      if (
        queryIndex > 0 &&
        matchedIndices[queryIndex - 1] === targetIndex - 1
      ) {
        consecutiveMatches++;
        totalConsecutive++;
      } else {
        consecutiveMatches = 0;
      }

      // Bonus for word boundary matches (after space, dash, underscore, or uppercase)
      const prevChar = targetIndex > 0 ? target[targetIndex - 1] : "";
      const isWordBoundary =
        targetIndex === 0 ||
        prevChar === " " ||
        prevChar === "-" ||
        prevChar === "_" ||
        prevChar === "/" ||
        (target[targetIndex] === target[targetIndex].toUpperCase() &&
          prevChar === prevChar.toLowerCase());

      if (isWordBoundary) {
        wordBoundaryMatches++;
      }

      queryIndex++;
    }

    targetIndex++;
  }

  // No match if not all query characters found
  if (queryIndex < lowerQuery.length) {
    return null;
  }

  // Calculate score based on various factors
  let score = 0;

  // Base score: how much of the target was matched
  const matchRatio = matchedIndices.length / target.length;
  score += matchRatio * 0.3;

  // Consecutive match bonus
  const consecutiveRatio = totalConsecutive / matchedIndices.length;
  score += consecutiveRatio * 0.3;

  // Word boundary bonus
  const boundaryRatio = wordBoundaryMatches / matchedIndices.length;
  score += boundaryRatio * 0.2;

  // Early match bonus (first match position)
  const earlyMatchBonus = 1 - matchedIndices[0] / target.length;
  score += earlyMatchBonus * 0.1;

  // Length penalty (shorter strings preferred)
  const lengthPenalty = target.length / 100;
  score -= Math.min(0.1, lengthPenalty);

  // Case sensitivity bonus
  let caseSensitiveMatches = 0;
  for (let i = 0; i < matchedIndices.length; i++) {
    if (query[i] === target[matchedIndices[i]]) {
      caseSensitiveMatches++;
    }
  }
  if (caseSensitiveMatches > 0) {
    score += (caseSensitiveMatches / query.length) * 0.1;
  }

  // Normalize score to 0-1 range
  score = Math.max(0, Math.min(1, score));

  return {
    target,
    score,
    matchedIndices,
  };
}

/**
 * Search multiple targets and return sorted results
 *
 * @param query - The search query
 * @param targets - Array of strings to search
 * @param limit - Maximum number of results (default: no limit)
 * @returns Sorted array of matches
 */
export function fuzzySearch(
  query: string,
  targets: string[],
  limit?: number
): FuzzyMatch[] {
  const matches: FuzzyMatch[] = [];

  for (const target of targets) {
    const match = fuzzyMatch(query, target);
    if (match && match.score > 0) {
      matches.push(match);
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  return limit ? matches.slice(0, limit) : matches;
}

/**
 * Search objects by a specific key using fuzzy matching
 *
 * @param query - The search query
 * @param items - Array of objects to search
 * @param keyExtractor - Function to extract searchable string from object
 * @param limit - Maximum number of results
 * @returns Sorted array of items with their match data
 */
export function fuzzySearchObjects<T>(
  query: string,
  items: T[],
  keyExtractor: (item: T) => string,
  limit?: number
): Array<{ item: T; match: FuzzyMatch }> {
  const results: Array<{ item: T; match: FuzzyMatch }> = [];

  for (const item of items) {
    const target = keyExtractor(item);
    const match = fuzzyMatch(query, target);
    if (match && match.score > 0) {
      results.push({ item, match });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.match.score - a.match.score);

  return limit ? results.slice(0, limit) : results;
}

/**
 * Multi-field fuzzy search
 * Searches multiple fields and uses the best match score
 *
 * @param query - The search query
 * @param items - Array of objects to search
 * @param keyExtractors - Array of functions to extract searchable strings
 * @param limit - Maximum number of results
 * @returns Sorted array of items with their best match data
 */
export function fuzzySearchMultiField<T>(
  query: string,
  items: T[],
  keyExtractors: Array<(item: T) => string>,
  limit?: number
): Array<{ item: T; match: FuzzyMatch; fieldIndex: number }> {
  const results: Array<{ item: T; match: FuzzyMatch; fieldIndex: number }> = [];

  for (const item of items) {
    let bestMatch: FuzzyMatch | null = null;
    let bestFieldIndex = -1;

    // Try each field and keep the best match
    for (let i = 0; i < keyExtractors.length; i++) {
      const target = keyExtractors[i](item);
      const match = fuzzyMatch(query, target);

      if (match && (!bestMatch || match.score > bestMatch.score)) {
        bestMatch = match;
        bestFieldIndex = i;
      }
    }

    if (bestMatch && bestMatch.score > 0) {
      results.push({
        item,
        match: bestMatch,
        fieldIndex: bestFieldIndex,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.match.score - a.match.score);

  return limit ? results.slice(0, limit) : results;
}

/**
 * Highlight matched characters in a string
 * Useful for rendering search results with highlighted matches
 *
 * @param text - The text to highlight
 * @param matchedIndices - Indices of matched characters
 * @returns Array of text segments with highlight flags
 */
export function highlightMatches(
  text: string,
  matchedIndices: number[]
): Array<{ text: string; highlighted: boolean }> {
  if (matchedIndices.length === 0) {
    return [{ text, highlighted: false }];
  }

  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let currentIndex = 0;
  const sortedIndices = [...matchedIndices].sort((a, b) => a - b);

  for (let i = 0; i < sortedIndices.length; i++) {
    const matchIndex = sortedIndices[i];

    // Add non-highlighted segment before this match
    if (matchIndex > currentIndex) {
      segments.push({
        text: text.slice(currentIndex, matchIndex),
        highlighted: false,
      });
    }

    // Start highlighted segment
    let highlightEnd = matchIndex + 1;

    // Extend highlight for consecutive matches
    while (
      i + 1 < sortedIndices.length &&
      sortedIndices[i + 1] === highlightEnd
    ) {
      highlightEnd++;
      i++;
    }

    segments.push({
      text: text.slice(matchIndex, highlightEnd),
      highlighted: true,
    });

    currentIndex = highlightEnd;
  }

  // Add remaining non-highlighted text
  if (currentIndex < text.length) {
    segments.push({
      text: text.slice(currentIndex),
      highlighted: false,
    });
  }

  return segments;
}

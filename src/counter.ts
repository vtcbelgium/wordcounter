export interface TextStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTimeMinutes: number;
  speakingTimeMinutes: number;
  ariScore: number;
  readingLevel: string;
}

export interface KeywordEntry {
  word: string;
  count: number;
  densityPct: number;
}

const NO_READING_LEVEL = "N/A";

// Standard ARI chart: the score, rounded up, gives the US grade band
function ariReadingLevel(ariScore: number): string {
  const band = Math.ceil(ariScore);
  if (band <= 1) return "Kindergarten";
  if (band === 2) return "Grades 1-2";
  if (band <= 12) return `Grade ${band}`;
  return band === 13 ? "College" : "Professional";
}

const STOP_WORDS = new Set([
  "the", "and", "for", "that", "with", "this", "from",
  "are", "was", "were", "have", "has", "not", "but",
  "you", "your"
]);

export function analyzeText(text: string): TextStats {
  if (typeof text !== "string") {
    throw new TypeError("Input must be a string");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return {
      words: 0,
      characters: 0,
      charactersNoSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingTimeMinutes: 0,
      speakingTimeMinutes: 0,
      ariScore: 0,
      readingLevel: NO_READING_LEVEL,
    };
  }

  // Unicode words split
  const words = trimmed.split(/\s+/u).filter(Boolean).length;

  // Unicode code points
  const characters = Array.from(text).length;
  const charactersNoSpaces = Array.from(text.replace(/\s+/gu, "")).length;

  // Sentences: chunks ending in punctuation . ! ? followed by space or end
  const sentenceMatches = trimmed.match(/[^.!?]+(?:[.!?]+|$)/gu);
  const sentences = sentenceMatches ? sentenceMatches.filter((s) => s.trim().length > 0).length : 0;

  // Paragraphs: split by one or more blank lines
  const paragraphs = text
    .split(/\n\s*\n/u)
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;

  // Reading time (standard average: 200 words per minute)
  const readingTimeMinutes = words > 0 ? Math.max(1, Math.ceil(words / 200)) : 0;

  // Speaking time (standard average: 130 words per minute)
  const speakingTimeMinutes = words > 0 ? Math.max(1, Math.ceil(words / 130)) : 0;

  // ARI counts letters and digits only; text without any has no meaningful score
  const letters = trimmed.match(/[\p{L}\p{N}]/gu)?.length ?? 0;
  const ari = letters > 0 ? 4.71 * (letters / words) + 0.5 * (words / sentences) - 21.43 : 0;
  const ariScore = Math.round(Math.max(0, ari) * 10) / 10;
  const readingLevel = letters > 0 ? ariReadingLevel(ariScore) : NO_READING_LEVEL;

  return {
    words,
    characters,
    charactersNoSpaces,
    sentences,
    paragraphs: Math.max(1, paragraphs),
    readingTimeMinutes,
    speakingTimeMinutes,
    ariScore,
    readingLevel,
  };
}

export function computeTopKeywords(text: string, limit = 5): KeywordEntry[] {
  if (typeof text !== "string") {
    return [];
  }

  const trimmed = text.trim();
  if (!trimmed || limit <= 0) {
    return [];
  }

  // Tokenize Unicode letters/digits case-insensitively
  const tokens = trimmed.match(/[\p{L}\p{N}]+/gu);
  if (!tokens) {
    return [];
  }

  // Count words, filter short tokens and stop words
  const wordCounts = new Map<string, number>();
  let totalWords = 0;

  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    if (lowerToken.length < 2 || STOP_WORDS.has(lowerToken)) {
      continue;
    }
    totalWords++;
    wordCounts.set(lowerToken, (wordCounts.get(lowerToken) || 0) + 1);
  }

  if (totalWords === 0) {
    return [];
  }

  // Build entries with density percentage
  const entries: KeywordEntry[] = [];
  for (const [word, count] of wordCounts) {
    const densityPct = Math.round((count / totalWords) * 1000) / 10;
    entries.push({ word, count, densityPct });
  }

  // Sort by count descending, then alphabetically by word
  entries.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.word.localeCompare(b.word);
  });

  // Slice to limit
  return entries.slice(0, limit);
}

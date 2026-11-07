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

const NO_READING_LEVEL = "N/A";

// Standard ARI chart: the score, rounded up, gives the US grade band
function ariReadingLevel(ariScore: number): string {
  const band = Math.ceil(ariScore);
  if (band <= 1) return "Kindergarten";
  if (band === 2) return "Grades 1-2";
  if (band <= 12) return `Grade ${band}`;
  return band === 13 ? "College" : "Professional";
}

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

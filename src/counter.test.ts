import { describe, expect, it } from "vitest";
import { analyzeText, computeTopKeywords } from "./counter";

describe("analyzeText", () => {
  it("handles empty text", () => {
    const stats = analyzeText("");
    expect(stats.words).toBe(0);
    expect(stats.characters).toBe(0);
    expect(stats.charactersNoSpaces).toBe(0);
    expect(stats.sentences).toBe(0);
    expect(stats.paragraphs).toBe(0);
    expect(stats.readingTimeMinutes).toBe(0);
  });

  it("handles whitespace only", () => {
    const stats = analyzeText("   \n\t  ");
    expect(stats.words).toBe(0);
    expect(stats.characters).toBe(0);
  });

  it("counts words and unicode code points accurately", () => {
    const text = "Hello world! 👋";
    const stats = analyzeText(text);
    expect(stats.words).toBe(3);
    // 'Hello world! ' is 13 code points, wave emoji is 1 code point -> total 14
    expect(stats.characters).toBe(14);
    expect(stats.charactersNoSpaces).toBe(12);
  });

  it("counts sentences and paragraphs", () => {
    const text = "First sentence. Second sentence! Third sentence?\n\nSecond paragraph here.";
    const stats = analyzeText(text);
    expect(stats.words).toBe(9);
    expect(stats.sentences).toBe(4);
    expect(stats.paragraphs).toBe(2);
  });

  it("calculates reading and speaking times", () => {
    const words = Array(450).fill("word").join(" ");
    const stats = analyzeText(words);
    expect(stats.words).toBe(450);
    expect(stats.readingTimeMinutes).toBe(3); // 450 / 200 = 2.25 -> 3
    expect(stats.speakingTimeMinutes).toBe(4); // 450 / 130 = 3.46 -> 4
  });

  describe("readability", () => {
    it("reports no score or level for empty text", () => {
      const stats = analyzeText("   ");
      expect(stats.ariScore).toBe(0);
      expect(stats.readingLevel).toBe("N/A");
    });

    it("reports no score or level for text without letters or digits", () => {
      const stats = analyzeText("... 👋 !!!");
      expect(stats.ariScore).toBe(0);
      expect(stats.readingLevel).toBe("N/A");
    });

    it("computes ARI from letters, words and sentences", () => {
      // 34 letters, 4 words, 1 sentence: 4.71 * 8.5 + 0.5 * 4 - 21.43 = 20.605
      const stats = analyzeText("Elephants remember distant waterholes.");
      expect(stats.ariScore).toBe(20.6);
    });

    it("ignores punctuation when counting characters per word", () => {
      const plain = analyzeText("Readability matters today");
      const punctuated = analyzeText("Readability, matters: today");
      expect(punctuated.ariScore).toBe(plain.ariScore);
    });

    it("clamps negative scores to zero", () => {
      const stats = analyzeText("Go. Up. On.");
      expect(stats.ariScore).toBe(0);
      expect(stats.readingLevel).toBe("Kindergarten");
    });

    it.each([
      ["Kindergarten", "The cat sat on a mat."], // score 0 (clamped)
      ["Grades 1-2", "The little kitten ran home."], // score 1.8
      ["Grade 9", "Teachers explained the hard chapter to pupils."], // score 8.3
      ["College", "Experts documented small changes across eight river cities."], // score 12.6
      ["Professional", "Interdisciplinary collaboration fundamentally strengthens institutional decisionmaking."],
    ])("maps the score to %s", (level, text) => {
      expect(analyzeText(text).readingLevel).toBe(level);
    });
  });

  it("throws TypeError on non-string input", () => {
    // @ts-expect-error testing invalid argument
    expect(() => analyzeText(null)).toThrow(TypeError);
  });
});

describe("computeTopKeywords", () => {
  it("returns empty array for empty text", () => {
    expect(computeTopKeywords("")).toEqual([]);
  });

  it("returns empty array for whitespace-only text", () => {
    expect(computeTopKeywords("   \n\t  ")).toEqual([]);
  });

  it("returns empty array when limit is 0 or negative", () => {
    expect(computeTopKeywords("hello world", 0)).toEqual([]);
    expect(computeTopKeywords("hello world", -1)).toEqual([]);
  });

  it("counts words case-insensitively", () => {
    const result = computeTopKeywords("Hello HELLO hello world");
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ word: "hello", count: 3, densityPct: 75.0 });
    expect(result[1]).toEqual({ word: "world", count: 1, densityPct: 25.0 });
  });

  it("filters out stop words", () => {
    const result = computeTopKeywords("The quick brown fox and the lazy dog");
    const words = result.map(e => e.word);
    expect(words).toContain("quick");
    expect(words).toContain("brown");
    expect(words).toContain("fox");
    expect(words).toContain("lazy");
    expect(words).not.toContain("the");
    expect(words).not.toContain("and");
  });

  it("filters out tokens shorter than 2 characters", () => {
    // Single-character tokens are dropped; two-character tokens are kept
    const result = computeTopKeywords("a i x y cat");
    expect(result).toEqual([{ word: "cat", count: 1, densityPct: 100.0 }]);
  });

  it("computes density percentage correctly", () => {
    // 10 total words, "hello" appears 3 times -> 3/10 = 30%
    const result = computeTopKeywords("hello hello hello world test one two three four five");
    expect(result[0]).toEqual({ word: "hello", count: 3, densityPct: 30.0 });
  });

  it("rounds density to 1 decimal place", () => {
    // 7 total words, "test" appears 2 times -> 2/7 = 28.571... -> 28.6
    const result = computeTopKeywords("test test one two three four five");
    expect(result[0].densityPct).toBe(28.6);
  });

  it("sorts by count descending, then alphabetically", () => {
    const result = computeTopKeywords("zebra apple banana apple zebra banana apple");
    // "apple" has count 3; "banana" and "zebra" both have count 2 and tie-break alphabetically
    expect(result[0]).toEqual({ word: "apple", count: 3, densityPct: 42.9 });
    expect(result[1]).toEqual({ word: "banana", count: 2, densityPct: 28.6 });
    expect(result[2]).toEqual({ word: "zebra", count: 2, densityPct: 28.6 });
  });

  it("respects the limit parameter", () => {
    const result = computeTopKeywords("one two three four five six seven eight", 3);
    expect(result).toHaveLength(3);
  });

  it("handles Unicode letters correctly", () => {
    const result = computeTopKeywords("café café naïve naive résumé");
    const words = result.map(e => e.word);
    expect(words).toContain("café");
    expect(words).toContain("naïve");
    expect(words).toContain("résumé");
  });

  it("returns empty array for non-string input", () => {
    // @ts-expect-error testing invalid argument
    expect(computeTopKeywords(null)).toEqual([]);
    // @ts-expect-error testing invalid argument
    expect(computeTopKeywords(undefined)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { analyzeText } from "./counter";

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

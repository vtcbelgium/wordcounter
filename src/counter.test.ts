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

  it("throws TypeError on non-string input", () => {
    // @ts-expect-error testing invalid argument
    expect(() => analyzeText(null)).toThrow(TypeError);
  });
});

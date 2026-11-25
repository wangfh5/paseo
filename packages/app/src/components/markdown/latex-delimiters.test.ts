import { describe, expect, it } from "vitest";
import { normalizeLatexDelimiters } from "./latex-delimiters";

describe("normalizeLatexDelimiters", () => {
  it("turns \\[...\\] without surrounding blank lines into a $$ block", () => {
    expect(normalizeLatexDelimiters("Crossing 通过\n\\[\nR=1\n\\]\n定义一个交点。")).toBe(
      "Crossing 通过\n\n\n$$\nR=1\n$$\n\n\n定义一个交点。",
    );
  });

  it("turns mid-sentence \\[...\\] into a $$ block", () => {
    expect(normalizeLatexDelimiters("before \\[R=1\\] after")).toBe(
      "before \n\n$$\nR=1\n$$\n\n after",
    );
  });

  it("turns \\(...\\) into inline $...$", () => {
    expect(normalizeLatexDelimiters("energy \\(E=mc^2\\) here")).toBe("energy $E=mc^2$ here");
  });

  it("leaves delimiters inside code fences alone", () => {
    expect(normalizeLatexDelimiters("```\n\\[R=1\\]\n```")).toBe("```\n\\[R=1\\]\n```");
  });

  it("leaves delimiters inside inline code alone", () => {
    expect(normalizeLatexDelimiters("use `\\(x\\)` in prose")).toBe("use `\\(x\\)` in prose");
  });

  it("leaves empty delimiter bodies as text", () => {
    expect(normalizeLatexDelimiters("empty \\( \\) and \\[  \\]")).toBe(
      "empty \\( \\) and \\[  \\]",
    );
  });

  it("leaves \\[...\\] inside image alt text alone", () => {
    expect(normalizeLatexDelimiters("![*literal* \\[label\\]](badge.svg)")).toBe(
      "![*literal* \\[label\\]](badge.svg)",
    );
  });
});

/**
 * Agents emit LaTeX-standard \( \) and \[ \] delimiters alongside $ and $$.
 * md4c's latexMath flag only recognizes $ / $$, so normalize the former
 * before parsing. Fenced code, inline code, and markdown images are left
 * alone; an unclosed fence (mid-stream chunk) counts as code to the end of
 * the source.
 *
 * \[...\] becomes a $$ block with its own blank lines so it always parses as
 * display math. A paragraph-internal $$ would otherwise stay inline.
 */
export function normalizeLatexDelimiters(source: string): string {
  return source
    .split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/g)
    .map((part, index) => (index % 2 === 1 ? part : rewriteProse(part)))
    .join("");
}

function rewriteProse(part: string): string {
  let out = "";
  let i = 0;
  while (i < part.length) {
    const imageEnd = endOfMarkdownImage(part, i);
    if (imageEnd > i) {
      out += part.slice(i, imageEnd);
      i = imageEnd;
      continue;
    }
    let j = i + 1;
    while (j < part.length && endOfMarkdownImage(part, j) === j) j += 1;
    out += rewriteMath(part.slice(i, j));
    i = j;
  }
  return out;
}

function rewriteMath(part: string): string {
  return part
    .replace(/\\\(([\s\S]*?)\\\)/g, (match, math: string) => (math.trim() ? `$${math}$` : match))
    .replace(/\\\[([\s\S]*?)\\\]/g, (match, math: string) =>
      math.trim() ? `\n\n$$\n${math.trim()}\n$$\n\n` : match,
    );
}

/** Index after `![alt](url)` / `![alt][ref]`, or `from` if this is not an image. */
function endOfMarkdownImage(source: string, from: number): number {
  if (source[from] !== "!" || source[from + 1] !== "[") return from;
  let i = from + 2;
  while (i < source.length) {
    if (source[i] === "]" && source[i - 1] !== "\\") {
      i += 1;
      if (source[i] === "(") {
        const close = source.indexOf(")", i + 1);
        return close === -1 ? from : close + 1;
      }
      if (source[i] === "[") {
        const close = source.indexOf("]", i + 1);
        return close === -1 ? from : close + 1;
      }
      return from;
    }
    i += 1;
  }
  return from;
}

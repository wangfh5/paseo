"use strict";

import { useMemo } from 'react';
// Copying a selection that contains math yields its TeX source ($...$ / $$...$$).
import 'katex/contrib/copy-tex';
import { jsx as _jsx } from "react/jsx-runtime";
// KaTeX's HTML output needs its stylesheet and fonts, served by the host app at /katex/.
const KATEX_STYLESHEET_ID = 'katex-stylesheet';
function ensureKaTeXStylesheet() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KATEX_STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = KATEX_STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = '/katex/katex.min.css';
  document.head.appendChild(link);
}
export function KaTeXRenderer({
  content,
  katex,
  displayMode,
  style
}) {
  const delimiter = displayMode ? '$$' : '$';
  const html = useMemo(() => {
    if (!katex) return null;
    ensureKaTeXStylesheet();
    return katex.renderToString(content, {
      output: 'htmlAndMathml',
      displayMode,
      throwOnError: false,
      trust: false
    });
  }, [katex, content, displayMode]);
  const displayStyle = displayMode ? {
    ...style,
    display: 'block',
    whiteSpace: 'pre-wrap'
  } : style;
  if (!html) {
    return /*#__PURE__*/_jsx("span", {
      role: "math",
      "aria-label": content,
      style: displayStyle,
      children: `${delimiter}${content}${delimiter}`
    });
  }
  return /*#__PURE__*/_jsx("span", {
    role: "math",
    "aria-label": content,
    style: displayStyle,
    dangerouslySetInnerHTML: {
      __html: html
    }
  });
}
//# sourceMappingURL=KaTeXRenderer.js.map
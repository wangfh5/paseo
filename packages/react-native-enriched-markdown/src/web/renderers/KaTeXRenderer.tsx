import { useMemo, type CSSProperties } from 'react';
// Copying a selection that contains math yields its TeX source ($...$ / $$...$$).
import 'katex/contrib/copy-tex';
import type { KaTeXInstance } from '../katex';

// KaTeX's HTML output needs its stylesheet and fonts, served by the host app at /katex/.
const KATEX_STYLESHEET_ID = 'katex-stylesheet';
function ensureKaTeXStylesheet(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KATEX_STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = KATEX_STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = '/katex/katex.min.css';
  document.head.appendChild(link);
}

interface KaTeXRendererProps {
  content: string;
  katex: KaTeXInstance | null;
  displayMode: boolean;
  style: CSSProperties;
}

export function KaTeXRenderer({
  content,
  katex,
  displayMode,
  style,
}: KaTeXRendererProps) {
  const delimiter = displayMode ? '$$' : '$';

  const html = useMemo(() => {
    if (!katex) return null;
    ensureKaTeXStylesheet();
    return katex.renderToString(content, {
      output: 'htmlAndMathml',
      displayMode,
      throwOnError: false,
      trust: false,
    });
  }, [katex, content, displayMode]);

  const displayStyle = displayMode
    ? { ...style, display: 'block' as const, whiteSpace: 'pre-wrap' as const }
    : style;

  if (!html) {
    return (
      <span role="math" aria-label={content} style={displayStyle}>
        {`${delimiter}${content}${delimiter}`}
      </span>
    );
  }

  return (
    <span
      role="math"
      aria-label={content}
      style={displayStyle}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

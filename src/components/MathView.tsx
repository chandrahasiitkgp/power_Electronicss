import React, { useMemo } from 'react';
import katex from 'katex';

interface MathProps {
  math: string;
  inline?: boolean;
  className?: string;
}

/**
 * Clean KaTeX renderer for academic mathematical notation.
 * Strips any surrounding $ or $$ delimiters if present and renders crisp human-readable math.
 */
export const MathView: React.FC<MathProps> = ({ math, inline = true, className = '' }) => {
  const renderedHtml = useMemo(() => {
    // Clean string from potential stray $ or $$
    const cleaned = math.trim().replace(/^\$\$?|\$\$?$/g, '').trim();
    try {
      return katex.renderToString(cleaned, {
        displayMode: !inline,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch {
      return cleaned;
    }
  }, [math, inline]);

  if (inline) {
    return (
      <span
        className={`inline-math font-normal ${className}`}
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    );
  }

  return (
    <div
      className={`block-math overflow-x-auto py-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

export const MathInline: React.FC<{ math: string; className?: string }> = ({ math, className }) => (
  <MathView math={math} inline={true} className={className} />
);

export const MathBlock: React.FC<{ math: string; className?: string }> = ({ math, className }) => (
  <MathView math={math} inline={false} className={className} />
);

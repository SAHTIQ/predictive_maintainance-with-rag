import React from 'react';

interface MarkdownMessageProps {
  content: string;
}

/**
 * Format inline tokens: bold (**), italic (*), machine IDs (TXM-xxx), SOP codes, and numeric telemetry.
 */
function formatInline(text: string): React.ReactNode[] {
  // Regex splitting by bold, italics, code blocks
  // Matches: **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  const tokens = text.split(regex);

  tokens.forEach((token, idx) => {
    if (!token) return;

    if (token.startsWith('**') && token.endsWith('**')) {
      const inner = token.slice(2, -2);
      parts.push(
        <strong key={idx} className="font-semibold text-slate-100">
          {formatMachineAndSpecs(inner)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      const inner = token.slice(1, -1);
      parts.push(
        <em key={idx} className="italic text-slate-300">
          {formatMachineAndSpecs(inner)}
        </em>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      const inner = token.slice(1, -1);
      parts.push(
        <code key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono text-[0.8rem]">
          {inner}
        </code>
      );
    } else {
      parts.push(<span key={idx}>{formatMachineAndSpecs(token)}</span>);
    }
  });

  return parts;
}

/**
 * Highlights domain tokens: TXM-xxx machine identifiers, SOP codes, and ISO standards
 */
function formatMachineAndSpecs(raw: string): React.ReactNode {
  const domainRegex = /(TXM-\d{3}|SOP-[A-Z0-9-]+|ISO\s*\d+(?:-\d+)?)/g;
  const segments = raw.split(domainRegex);
  if (segments.length === 1) return raw;

  return (
    <>
      {segments.map((seg, sIdx) => {
        if (/^TXM-\d{3}$/.test(seg)) {
          return (
            <span
              key={sIdx}
              className="inline-block px-1.5 py-0.2 mx-0.5 rounded font-mono font-bold text-[0.82rem] bg-cyan-950/60 text-cyan-300 border border-cyan-800/60"
            >
              {seg}
            </span>
          );
        }
        if (/^(SOP-[A-Z0-9-]+|ISO\s*\d+(?:-\d+)?)$/.test(seg)) {
          return (
            <span
              key={sIdx}
              className="inline-block px-1.5 py-0.2 mx-0.5 rounded font-mono text-[0.8rem] bg-slate-800 text-amber-300 border border-slate-700"
            >
              {seg}
            </span>
          );
        }
        return seg;
      })}
    </>
  );
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let currentList: { type: 'ul' | 'ol'; items: React.ReactNode[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentList.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-slate-200 text-[0.84rem] leading-relaxed">
                <span className="text-cyan-400 font-bold select-none mt-0.5">•</span>
                <span className="flex-1">{it}</span>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentList.items.map((it, i) => (
              <li key={i} className="flex items-start gap-2.5 text-slate-200 text-[0.84rem] leading-relaxed">
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-mono text-[0.7rem] font-bold select-none mt-0.5 flex-shrink-0">
                  {i + 1}
                </span>
                <span className="flex-1">{it}</span>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Headings: ### or ##
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <div
          key={`h3-${idx}`}
          className="flex items-center gap-2 mt-3 mb-2 pb-1 border-b border-slate-700/80"
        >
          <span className="w-1.5 h-3.5 bg-cyan-400 rounded-sm inline-block flex-shrink-0" />
          <h4 className="text-[0.92rem] font-bold text-slate-100 tracking-wide">
            {trimmed.slice(4)}
          </h4>
        </div>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <div
          key={`h2-${idx}`}
          className="flex items-center gap-2 mt-3.5 mb-2 pb-1.5 border-b border-slate-700"
        >
          <span className="w-2 h-4 bg-cyan-400 rounded-sm inline-block flex-shrink-0" />
          <h3 className="text-[0.98rem] font-bold text-white tracking-wide">
            {trimmed.slice(3)}
          </h3>
        </div>
      );
      return;
    }

    // Blockquote: >
    if (trimmed.startsWith('> ')) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${idx}`}
          className="my-2 pl-3 py-1.5 border-l-2 border-cyan-500/80 bg-slate-800/40 rounded-r text-[0.82rem] text-slate-300 italic"
        >
          {formatInline(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Unordered List: - or *
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.slice(2);
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(formatInline(itemText));
      return;
    }

    // Ordered List: 1. or 2.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const itemText = numMatch[2];
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(formatInline(itemText));
      return;
    }

    // Standard Paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="my-1.5 text-[0.84rem] text-slate-200 leading-relaxed">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1 font-sans">{elements}</div>;
};

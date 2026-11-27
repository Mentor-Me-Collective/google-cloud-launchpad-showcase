export type BriefLineKind = 'heading' | 'bullet' | 'number' | 'text';

export interface BriefSpan {
  text: string;
  bold: boolean;
  cite: boolean;
}

export interface BriefLine {
  kind: BriefLineKind;
  marker: string;
  spans: BriefSpan[];
}

function spansOf(line: string): BriefSpan[] {
  const spans: BriefSpan[] = [];
  // Split on **bold** and [citation] tokens, keeping them.
  for (const part of line.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/)) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**')) {
      spans.push({ text: part.slice(2, -2), bold: true, cite: false });
      continue;
    }
    if (part.startsWith('[') && part.endsWith(']')) {
      spans.push({ text: part, bold: false, cite: true });
      continue;
    }
    spans.push({ text: part, bold: false, cite: false });
  }
  return spans;
}

/** Turns the model's lightly formatted text into headings, bullets and paragraphs with highlighted citations. */
export function parseBrief(text: string): BriefLine[] {
  return text
    .split('\n')
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    .map((raw): BriefLine => {
      const heading = raw.match(/^#{1,6}\s+(.*)$/);
      if (heading) return { kind: 'heading', marker: '', spans: spansOf(heading[1].replace(/\*\*/g, '')) };
      if (/^\*\*[^*]+\*\*:?$/.test(raw)) return { kind: 'heading', marker: '', spans: spansOf(raw.replace(/\*\*/g, '')) };
      const bullet = raw.match(/^[-*•]\s+(.*)$/);
      if (bullet) return { kind: 'bullet', marker: '•', spans: spansOf(bullet[1]) };
      const numbered = raw.match(/^(\d+[.)])\s+(.*)$/);
      if (numbered) return { kind: 'number', marker: numbered[1], spans: spansOf(numbered[2]) };
      return { kind: 'text', marker: '', spans: spansOf(raw) };
    });
}

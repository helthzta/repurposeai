/**
 * Renders a plain-text legal document (numbered sections, bullet/numbered lists, "---"
 * section dividers — see src/lib/legal/*.ts) as structured, readable HTML without pulling in
 * a markdown dependency. The source text is verbatim legal copy; this only handles layout.
 */

const MAJOR_HEADING = /^\d+\.\s+\S/; // "1. WHO WE ARE"
const DOTTED_SUBHEADING = /^\d+\.\d+\s+\S/; // "13.1 Service Providers"
const LETTER_SUBHEADING = /^[A-Z]\.\s+\S/; // "A. Create unauthorized copies"
const BULLET_LINE = /^-\s+/;
const NUMBERED_LINE = /^\d+\.\s+/;

function splitBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
}

function isHeading(block: string) {
  return (
    !block.includes("\n") &&
    (MAJOR_HEADING.test(block) || DOTTED_SUBHEADING.test(block) || LETTER_SUBHEADING.test(block))
  );
}

// Short, unnumbered Title Case lead-ins used as sub-headings before a list (e.g. "Provide the
// Services", "Communications") — distinguished from a full sentence by length + no end punctuation.
function isLeadIn(block: string) {
  return (
    !block.includes("\n") &&
    block.length <= 45 &&
    /^[A-Z]/.test(block) &&
    !/[.,:;]$/.test(block) &&
    !isHeading(block)
  );
}

function isList(block: string, pattern: RegExp) {
  const lines = block.split("\n").map((l) => l.trim());
  return lines.length > 1 && lines.every((l) => pattern.test(l));
}

export function LegalDocument({ body }: { body: string }) {
  const blocks = splitBlocks(body);

  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {blocks.map((block, i) => {
        if (block === "---") return null;

        if (isList(block, BULLET_LINE)) {
          const items = block.split("\n").map((l) => l.trim().replace(BULLET_LINE, ""));
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }

        if (isList(block, NUMBERED_LINE)) {
          const items = block.split("\n").map((l) => l.trim().replace(NUMBERED_LINE, ""));
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5">
              {items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ol>
          );
        }

        if (MAJOR_HEADING.test(block) && !block.includes("\n")) {
          return (
            <h2
              key={i}
              className="border-t pt-5 text-base font-extrabold tracking-tight text-foreground first:border-t-0 first:pt-0"
            >
              {block}
            </h2>
          );
        }

        if (isHeading(block)) {
          return (
            <h3 key={i} className="pt-1 text-sm font-bold text-foreground">
              {block}
            </h3>
          );
        }

        if (isLeadIn(block)) {
          return (
            <p key={i} className="font-semibold text-foreground">
              {block}
            </p>
          );
        }

        return (
          <p key={i} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}

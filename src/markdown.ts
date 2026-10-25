export type MarkdownAudit = {
  formattedBody: string;
  warnings: string[];
  errors: string[];
  excerpt: string;
};

const secretPatterns: Array<{ name: string; pattern: RegExp }> = [
  { name: "AWS access key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/ },
  { name: "JWT", pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/ },
  { name: "private key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

export function auditMarkdown(body: string): MarkdownAudit {
  const formattedBody = body.replace(/\r\n?/g, "\n").trim();
  const warnings: string[] = [];
  const errors: string[] = [];
  const lines = formattedBody.split("\n");

  let previousHeadingLevel = 0;
  let h1Count = 0;
  let openFence: { marker: "`" | "~"; length: number; line: number } | undefined;
  let inCodeFence = false;

  for (const [index, line] of lines.entries()) {
    const lineNumber = index + 1;
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);

    if (fence) {
      const marker = fence[1]?.[0] as "`" | "~";
      const length = fence[1]?.length ?? 0;
      const info = fence[2] ?? "";
      if (inCodeFence && openFence && marker === openFence.marker && length >= openFence.length) {
        inCodeFence = false;
        openFence = undefined;
      } else if (!inCodeFence) {
        inCodeFence = true;
        openFence = { marker, length, line: lineNumber };
        if (!info.trim()) {
          warnings.push(`Line ${lineNumber}: code fence has no language.`);
        }
      }
      continue;
    }

    if (inCodeFence) {
      continue;
    }

    const heading = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (heading) {
      const level = heading[1]?.length ?? 0;
      if (level === 1) {
        h1Count += 1;
      }
      if (previousHeadingLevel > 0 && level > previousHeadingLevel + 1) {
        warnings.push(`Line ${lineNumber}: heading level skips from H${previousHeadingLevel} to H${level}.`);
      }
      previousHeadingLevel = level;
    }

    if (/!?\[[^\]]*\]\(\s*\)/.test(line)) {
      errors.push(`Line ${lineNumber}: link destination is empty.`);
    }

    for (const image of line.matchAll(/!\[([^\]]*)\]\([^)]+\)/g)) {
      if (!image[1]?.trim()) {
        warnings.push(`Line ${lineNumber}: informative images need meaningful alt text.`);
      }
    }
  }

  if (openFence) {
    errors.push(`Line ${openFence.line}: code fence is not closed.`);
  }
  if (h1Count > 1) {
    warnings.push("Body contains more than one H1 heading.");
  }

  for (const secret of secretPatterns) {
    if (secret.pattern.test(formattedBody)) {
      errors.push(`Potential ${secret.name} detected. Remove it before publishing.`);
    }
  }

  return { formattedBody, warnings, errors, excerpt: createExcerpt(lines) };
}

function createExcerpt(lines: string[]): string {
  const text = lines
    .filter((line) => !line.startsWith("#") && !line.startsWith("```") && !line.startsWith("~~~"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text.length <= 200 ? text : `${text.slice(0, 197)}...`;
}

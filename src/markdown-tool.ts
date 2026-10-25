import { z } from "zod";

import { auditMarkdown } from "./markdown.js";

export const FormatMarkdownInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().min(1).max(100_000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export function formatMarkdown(input: z.infer<typeof FormatMarkdownInputSchema>) {
  return {
    title: input.title,
    tags: input.tags,
    ...auditMarkdown(input.body),
  };
}

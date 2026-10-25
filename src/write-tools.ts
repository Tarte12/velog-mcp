import { z } from "zod";

import { auditMarkdown } from "./markdown.js";
import type { VelogGateway } from "./velog-gateway.js";

const WriteInputFields = {
  title: z.string().trim().min(1).max(120),
  body: z.string().min(1).max(100_000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  urlSlug: z.string().trim().min(1).max(200).optional(),
  confirm: z.boolean().default(false),
};

export const CreateDraftInputSchema = z.object(WriteInputFields);
export const PublishPrivateInputSchema = z.object(WriteInputFields);
export const PublishPublicInputSchema = z.object({
  ...WriteInputFields,
  isPrivate: z.boolean().default(true),
});

type WriteInput = z.infer<typeof CreateDraftInputSchema>;

export function createWriteTools(gateway: VelogGateway) {
  return {
    createDraft: async (input: WriteInput) => createPost(gateway, input, true, true),
    publishPrivate: async (input: WriteInput) => createPost(gateway, input, false, true),
    publishWithVisibility: async (
      input: z.infer<typeof PublishPublicInputSchema>,
    ) => createPost(gateway, input, false, input.isPrivate),
  };
}

async function createPost(
  gateway: VelogGateway,
  input: WriteInput,
  isTemp: boolean,
  isPrivate: boolean,
) {
  const urlSlug = input.urlSlug ?? slugify(input.title);
  const audit = auditMarkdown(input.body);
  if (audit.errors.length > 0) {
    return {
      status: "blocked" as const,
      isTemp,
      isPrivate,
      urlSlug,
      errors: audit.errors,
      warnings: audit.warnings,
    };
  }

  if (!input.confirm) {
    return {
      status: "preview" as const,
      isTemp,
      isPrivate,
      urlSlug,
      warnings: audit.warnings,
      message: "Set confirm=true to write to Velog.",
    };
  }

  const post = await gateway.writePost({
    title: input.title,
    body: input.body,
    tags: input.tags,
    urlSlug,
    isTemp,
    isPrivate,
  });

  return { status: "written" as const, post };
}

function slugify(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "velog-post";
}

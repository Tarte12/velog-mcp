import { z } from "zod";

import type { VelogGateway } from "./velog-gateway.js";

const UsernameSchema = z.string().trim().min(1).max(80);
const LimitSchema = z.number().int().min(1).max(50).default(20);

export const ListPostsInputSchema = z.object({
  username: UsernameSchema,
  limit: LimitSchema,
  cursor: z.string().min(1).optional(),
  tag: z.string().trim().min(1).max(100).optional(),
});

export const GetPostInputSchema = z.object({
  username: UsernameSchema,
  urlSlug: z.string().trim().min(1).max(200),
});

export const SearchPostsInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  username: UsernameSchema.optional(),
  limit: LimitSchema,
});

export function createReadTools(gateway: VelogGateway) {
  return {
    listPosts: async (input: z.infer<typeof ListPostsInputSchema>) => gateway.listPosts(input),
    getPost: async (input: z.infer<typeof GetPostInputSchema>) => gateway.getPost(input),
    searchPosts: async (input: z.infer<typeof SearchPostsInputSchema>) => gateway.searchPosts(input),
  };
}

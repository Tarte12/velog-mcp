import { z } from "zod";

const endpoint = "https://v3.velog.io/graphql";

const GraphqlErrorSchema = z.object({
  message: z.string(),
});

const GraphqlResponseSchema = z.object({
  data: z.unknown().optional(),
  errors: z.array(GraphqlErrorSchema).optional(),
});

const PostSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  body: z.string().nullable(),
  url_slug: z.string().nullable(),
  short_description: z.string().nullable(),
  thumbnail: z.string().nullable(),
  released_at: z.string().nullable(),
  is_private: z.boolean(),
  tags: z.array(z.string()).default([]),
  user: z
    .object({
      username: z.string(),
    })
    .nullable(),
});

const PostsDataSchema = z.object({
  posts: z.array(PostSchema),
});

const PostDataSchema = z.object({
  post: PostSchema.nullable(),
});

const SearchDataSchema = z.object({
  searchPosts: z.object({
    count: z.number(),
    posts: z.array(PostSchema),
  }),
});

const CurrentUserDataSchema = z.object({
  currentUser: z.object({
    username: z.string(),
  }).nullable(),
});

const WrittenPostSchema = z.object({
  id: z.string(),
  url_slug: z.string().nullable(),
  is_temp: z.boolean(),
  is_private: z.boolean(),
});

const WritePostDataSchema = z.object({
  writePost: WrittenPostSchema,
});

export type VelogPost = z.infer<typeof PostSchema>;
export type WrittenVelogPost = z.infer<typeof WrittenPostSchema>;

export class VelogGatewayError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "VelogGatewayError";
  }
}

export type FetchLike = typeof fetch;

export class VelogGateway {
  public constructor(
    private readonly fetchLike: FetchLike = fetch,
    private readonly graphqlEndpoint = endpoint,
    private refreshToken?: string,
    private readonly onRefreshToken?: (token: string) => void,
  ) {}

  public async listPosts(input: {
    username: string;
    limit: number;
    cursor?: string;
    tag?: string;
  }): Promise<VelogPost[]> {
    const data = await this.request(
      `query Posts($input: GetPostsInput!) {
        posts(input: $input) {
          id title body url_slug short_description thumbnail released_at is_private tags
          user { username }
        }
      }`,
      { input },
    );

    return PostsDataSchema.parse(data).posts;
  }

  public async currentUser(): Promise<{ username: string } | null> {
    const data = await this.request(
      `query CurrentUser {
        currentUser { username }
      }`,
      {},
    );

    return CurrentUserDataSchema.parse(data).currentUser;
  }

  public async getPost(input: {
    username: string;
    urlSlug: string;
  }): Promise<VelogPost | null> {
    const data = await this.request(
      `query Post($input: ReadPostInput!) {
        post(input: $input) {
          id title body url_slug short_description thumbnail released_at is_private tags
          user { username }
        }
      }`,
      { input: { username: input.username, url_slug: input.urlSlug } },
    );

    return PostDataSchema.parse(data).post;
  }

  public async searchPosts(input: {
    query: string;
    username?: string;
    limit: number;
  }): Promise<{ count: number; posts: VelogPost[] }> {
    const data = await this.request(
      `query SearchPosts($input: GetSearchPostsInput!) {
        searchPosts(input: $input) {
          count
          posts {
            id title body url_slug short_description thumbnail released_at is_private tags
            user { username }
          }
        }
      }`,
      {
        input: {
          keyword: input.query,
          username: input.username,
          limit: input.limit,
        },
      },
    );

    return SearchDataSchema.parse(data).searchPosts;
  }

  public async writePost(input: {
    title: string;
    body: string;
    tags: string[];
    urlSlug: string;
    isTemp: boolean;
    isPrivate: boolean;
  }): Promise<WrittenVelogPost> {
    if (!this.refreshToken) {
      throw new VelogGatewayError("Velog writing requires VELOG_REFRESH_TOKEN");
    }

    const data = await this.request(
      `mutation WritePost($input: WritePostInput!) {
        writePost(input: $input) { id url_slug is_temp is_private }
      }`,
      {
        input: {
          title: input.title,
          body: input.body,
          tags: input.tags,
          url_slug: input.urlSlug,
          is_markdown: true,
          is_temp: input.isTemp,
          is_private: input.isPrivate,
          meta: {},
        },
      },
    );

    return WritePostDataSchema.parse(data).writePost;
  }

  private async request(query: string, variables: unknown): Promise<unknown> {
    let response: Response;
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.refreshToken) {
        headers.cookie = `refresh_token=${this.refreshToken}`;
      }

      response = await this.fetchLike(this.graphqlEndpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      });
    } catch {
      throw new VelogGatewayError("Velog request failed");
    }

    if (!response.ok) {
      throw new VelogGatewayError(`Velog returned HTTP ${response.status}`);
    }

    this.acceptRefreshedToken(response.headers);

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new VelogGatewayError("Velog returned invalid JSON");
    }

    const parsed = GraphqlResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new VelogGatewayError("Velog returned an invalid GraphQL response");
    }

    if (parsed.data.errors?.length) {
      throw new VelogGatewayError(`Velog GraphQL error: ${parsed.data.errors[0]?.message ?? "unknown"}`);
    }

    if (parsed.data.data === undefined) {
      throw new VelogGatewayError("Velog GraphQL response has no data");
    }

    return parsed.data.data;
  }

  private acceptRefreshedToken(headers: Headers): void {
    const refreshedToken = getRefreshToken(headers);
    if (!refreshedToken || refreshedToken === this.refreshToken) return;

    this.refreshToken = refreshedToken;
    this.onRefreshToken?.(refreshedToken);
  }
}

function getRefreshToken(headers: Headers): string | undefined {
  const cookieHeaders = typeof headers.getSetCookie === "function"
    ? headers.getSetCookie()
    : [headers.get("set-cookie") ?? ""];

  for (const cookie of cookieHeaders) {
    const match = /(?:^|;\s*)refresh_token=([^;]*)/u.exec(cookie);
    if (!match?.[1]) continue;

    try {
      const token = decodeURIComponent(match[1]);
      if (token) return token;
    } catch {
      // A malformed cookie must not make a successful Velog response fail.
    }
  }

  return undefined;
}

import { z } from "zod";

const InitPostSchema = z.object({
  title: z.string().max(2200),
  privacy_level: z.enum([
    "PUBLIC_TO_EVERYONE",
    "MUTUAL_FOLLOW_FRIENDS",
    "SELF_ONLY",
  ]),
  disable_comment: z.boolean().default(false),
  video_url: z.string().url(),
});

export type InitPostPayload = z.infer<typeof InitPostSchema>;

type TikTokApiEnvelope<T> = {
  data: T;
  error?: {
    code?: string;
    log_id?: string;
    message?: string;
  };
};

export class TikTokPostingClient {
  private readonly baseUrl = "https://open.tiktokapis.com/v2";
  private readonly accessToken: string;

  constructor(accessToken: string) {
    if (!accessToken) {
      throw new Error("[TikTok SDK] Access Token e obrigatorio.");
    }

    this.accessToken = accessToken;
  }

  private async request<T>(
    endpoint: string,
    method: string,
    body?: unknown,
  ): Promise<T> {
    const requestInit: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...requestInit,
      signal: AbortSignal.timeout(15_000),
    });

    const data = (await response.json()) as TikTokApiEnvelope<T>;

    const hasError = !response.ok || (data.error && data.error.code !== "ok");
    if (hasError) {
      throw new Error(
        `[TikTok API Error] ${data.error?.message ?? "Falha desconhecida"} (LogID: ${data.error?.log_id ?? "n/a"})`,
      );
    }

    return data.data;
  }

  public async initVideoUpload(payload: InitPostPayload) {
    const validated = InitPostSchema.parse(payload);

    return this.request<{ publish_id: string }>(
      "/post/publish/video/init/",
      "POST",
      {
        post_info: {
          title: validated.title,
          privacy_level: validated.privacy_level,
          disable_comment: validated.disable_comment,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: validated.video_url,
        },
      },
    );
  }

  public async checkPublishStatus(publishId: string) {
    return this.request<{ status: string; public_url?: string }>(
      "/post/publish/status/fetch/",
      "POST",
      { publish_id: publishId },
    );
  }
}

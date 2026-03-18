import { XMLParser } from "fast-xml-parser";

const RSS_URL = "https://raw.githubusercontent.com/quangvo09/platform-announcement/master/db/rss2.xml";
const FETCH_TIMEOUT_MS = 10_000;

export type Announcement = {
  title: string;
  link: string;
  pubDate: string;
  category: string;
};

export async function fetchPlatformAnnouncements(): Promise<Announcement[]> {
  try {
    const response = await fetch(RSS_URL, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Failed to fetch RSS: ${response.statusText}`);

    const xmlData = await response.text();
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlData);

    const items = jsonObj?.rss?.channel?.item;

    if (!items) return [];

    const list = Array.isArray(items) ? items : [items];

    return list
      .filter((item: unknown): item is Record<string, unknown> => item != null && typeof item === "object")
      .map((item) => ({
        title: String(item.title ?? ""),
        link: String(item.link ?? ""),
        pubDate: String(item.pubDate ?? ""),
        category: String(item.category ?? ""),
      }));
  } catch (error) {
    console.error("error_fetching_announcements", error);
    return [];
  }
}

export function filterTikTokAnnouncements(announcements: Announcement[]): Announcement[] {
  return announcements.filter(a =>
    a.category?.toLowerCase() === "tiktok" ||
    a.title?.toUpperCase().includes("[TIKTOK]")
  );
}

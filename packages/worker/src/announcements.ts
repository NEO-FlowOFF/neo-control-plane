import { XMLParser } from "fast-xml-parser";

const RSS_URL = "https://raw.githubusercontent.com/quangvo09/platform-announcement/master/db/rss2.xml";

export type Announcement = {
  title: string;
  link: string;
  pubDate: string;
  category: string;
};

export async function fetchPlatformAnnouncements(): Promise<Announcement[]> {
  try {
    const response = await fetch(RSS_URL);
    if (!response.ok) throw new Error(`Failed to fetch RSS: ${response.statusText}`);
    
    const xmlData = await response.text();
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlData);

    const items = jsonObj.rss.channel.item;
    const announcements = Array.isArray(items) ? items : [items];

    return announcements.map((item: any) => ({
      title: item.title,
      link: item.link,
      pubDate: item.pubDate,
      category: item.category,
    }));
  } catch (error) {
    console.error("error_fetching_announcements", error);
    return [];
  }
}

/**
 * Filtra anúncios específicos para o TikTok
 */
export function filterTikTokAnnouncements(announcements: Announcement[]): Announcement[] {
  return announcements.filter(a => 
    a.category?.toLowerCase() === "tiktok" || 
    a.title?.toUpperCase().includes("[TIKTOK]")
  );
}

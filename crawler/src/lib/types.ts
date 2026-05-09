export interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  author?: string;
  contentSnippet?: string;
}

export interface NormalizedArticle {
  url: string;
  title: string;
  author: string | null;
  publishedAt: Date | null;
  bodyMd: string;
}

export interface SourceAdapter {
  name: string;
  /** Fetch RSS/Atom feed and return list of article links */
  listLinks(feedUrl: string): Promise<FeedItem[]>;
  /** Fetch one article URL and produce normalized markdown body */
  fetchArticle(url: string, feedItem?: FeedItem): Promise<NormalizedArticle | null>;
}

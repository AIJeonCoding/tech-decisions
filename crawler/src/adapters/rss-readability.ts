import Parser from 'rss-parser';
import type { SourceAdapter, FeedItem, NormalizedArticle } from '../lib/types.js';
import { fetchHtml, fetchText } from '../lib/fetch.js';
import { extractFromHtml } from '../lib/extract.js';

const parser = new Parser({
  customFields: {
    item: ['author', 'creator', 'dc:creator', 'pubDate'],
  },
});

export const rssReadabilityAdapter: SourceAdapter = {
  name: 'rss-readability',

  async listLinks(feedUrl) {
    const xml = await fetchText(feedUrl);
    const feed = await parser.parseString(xml);
    return feed.items
      .filter((it): it is typeof it & { link: string; title: string } => Boolean(it.link && it.title))
      .map<FeedItem>((it) => {
        const x = it as unknown as Record<string, unknown>;
        return {
          title: it.title,
          link: it.link,
          pubDate: it.pubDate ?? it.isoDate,
          author: (x['creator'] as string | undefined) ??
                  (x['dc:creator'] as string | undefined) ??
                  it.author,
          contentSnippet: it.contentSnippet,
        };
      });
  },

  async fetchArticle(url, feedItem): Promise<NormalizedArticle | null> {
    const html = await fetchHtml(url);
    const ex = extractFromHtml(html, url);
    if (!ex || ex.length < 200) return null;
    return {
      url,
      title: ex.title || feedItem?.title || '',
      author: ex.byline ?? feedItem?.author ?? null,
      publishedAt: feedItem?.pubDate ? new Date(feedItem.pubDate) : null,
      bodyMd: ex.content,
    };
  },
};

import Parser from 'rss-parser';
import TurndownService from 'turndown';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import type { SourceAdapter, FeedItem, NormalizedArticle } from '../lib/types.js';
import { fetchHtml, fetchText } from '../lib/fetch.js';

// Medium has a stricter UI but RSS includes full content:encoded.
// Strategy: prefer content:encoded → fall back to readability on the live page.
const parser = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['dc:creator', 'creator'],
    ],
  },
});

const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

export const mediumRssAdapter: SourceAdapter = {
  name: 'medium-rss',

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
          author: x['creator'] as string | undefined,
          contentSnippet: it.contentSnippet,
        };
      });
  },

  async fetchArticle(url, feedItem): Promise<NormalizedArticle | null> {
    // Re-fetch feed to grab full content:encoded for the matching item.
    // For efficiency: cache one feed fetch per run via a global Map.
    const html = await fetchHtml(url);
    const dom = new JSDOM(html, { url });
    const r = new Readability(dom.window.document).parse();
    if (!r || (r.length ?? 0) < 200) return null;
    return {
      url,
      title: r.title ?? feedItem?.title ?? '',
      author: r.byline ?? feedItem?.author ?? null,
      publishedAt: feedItem?.pubDate ? new Date(feedItem.pubDate) : null,
      bodyMd: turndown.turndown(r.content ?? ''),
    };
  },
};

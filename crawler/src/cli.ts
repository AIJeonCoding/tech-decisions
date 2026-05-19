#!/usr/bin/env node
import 'dotenv/config';
import { logger } from './lib/log.js';
import { crawl } from './crawl.js';

const log = logger('cli');

interface Args {
  cmd: string;
  flags: Record<string, string | boolean>;
  positional: string[];
}

function parse(argv: string[]): Args {
  const [cmd = 'help', ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a) continue;
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else {
        const next = rest[i + 1];
        if (next && !next.startsWith('--')) {
          flags[a.slice(2)] = next;
          i++;
        } else {
          flags[a.slice(2)] = true;
        }
      }
    } else {
      positional.push(a);
    }
  }
  return { cmd, flags, positional };
}

const HELP = `tech-decisions crawler CLI

Commands:
  crawl <slug|all> [--limit N] [--concurrency N] [--force]
        Fetch articles from a company source (RSS → body → DB).
  summarize [--limit N] [--model haiku|sonnet]
        Generate 1-line summary for un-processed articles.
  tag [--limit N]
        Assign domain/tag categories.
  decisions [--limit N]
        Extract core architectural decisions (axis/choice/rationale).
  cells [--domain payment-settlement]
        Aggregate decisions into comparison cells.
  all [--limit N]
        Run crawl → summarize → tag → decisions → cells.
  embed [--force] [--limit N]
        Generate local Ollama embeddings for articles + cells (RAG index).

Examples:
  pnpm crawl toss --limit 50
  pnpm crawl all --limit 30
  pnpm summarize --limit 100
  pnpm embed
  pnpm embed --force
`;

async function main() {
  const args = parse(process.argv.slice(2));
  switch (args.cmd) {
    case 'crawl': {
      const target = args.positional[0] ?? 'all';
      await crawl({
        target,
        limit: Number(args.flags.limit ?? 30),
        concurrency: Number(args.flags.concurrency ?? 4),
        force: Boolean(args.flags.force),
      });
      return;
    }
    case 'summarize': {
      const { summarizeBatch } = await import('./pipeline/summarize.js');
      await summarizeBatch({ limit: Number(args.flags.limit ?? 50) });
      return;
    }
    case 'tag': {
      const { tagBatch } = await import('./pipeline/tag.js');
      await tagBatch({ limit: Number(args.flags.limit ?? 50) });
      return;
    }
    case 'decisions': {
      const { decisionsBatch } = await import('./pipeline/decisions.js');
      await decisionsBatch({ limit: Number(args.flags.limit ?? 30) });
      return;
    }
    case 'cells': {
      const { buildCells } = await import('./pipeline/cells.js');
      await buildCells({ domain: String(args.flags.domain ?? 'payment-settlement') });
      return;
    }
    case 'all': {
      const target = args.positional[0] ?? 'all';
      const limit = Number(args.flags.limit ?? 30);
      await crawl({ target, limit });
      const { summarizeBatch } = await import('./pipeline/summarize.js');
      await summarizeBatch({ limit });
      const { tagBatch } = await import('./pipeline/tag.js');
      await tagBatch({ limit });
      const { decisionsBatch } = await import('./pipeline/decisions.js');
      await decisionsBatch({ limit });
      const { buildCells } = await import('./pipeline/cells.js');
      await buildCells({ domain: 'payment-settlement' });
      return;
    }
    case 'embed': {
      const { embedAll } = await import('./pipeline/embed-local.js');
      await embedAll({
        force: Boolean(args.flags.force),
        limit: args.flags.limit !== undefined ? Number(args.flags.limit) : undefined,
      });
      return;
    }
    case 'help':
    case '--help':
    case '-h':
      console.log(HELP);
      return;
    default:
      log.error(`Unknown command: ${args.cmd}`);
      console.log(HELP);
      process.exit(2);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    log.error(e instanceof Error ? e.stack ?? e.message : String(e));
    process.exit(1);
  });

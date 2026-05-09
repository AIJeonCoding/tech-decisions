type Level = 'info' | 'warn' | 'error' | 'debug';

const colors: Record<Level, string> = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  debug: '\x1b[90m',
};
const reset = '\x1b[0m';

function emit(level: Level, scope: string, msg: string, extra?: unknown) {
  const ts = new Date().toISOString().slice(11, 19);
  const tag = `${colors[level]}${level.toUpperCase().padEnd(5)}${reset}`;
  const out = `${ts} ${tag} [${scope}] ${msg}`;
  if (extra !== undefined) console.log(out, extra);
  else console.log(out);
}

export function logger(scope: string) {
  return {
    info: (m: string, x?: unknown) => emit('info', scope, m, x),
    warn: (m: string, x?: unknown) => emit('warn', scope, m, x),
    error: (m: string, x?: unknown) => emit('error', scope, m, x),
    debug: (m: string, x?: unknown) => {
      if (process.env.LOG_LEVEL === 'debug') emit('debug', scope, m, x);
    },
  };
}

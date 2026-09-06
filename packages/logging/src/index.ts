// @the-inclusionist/logging — a one-method Logger port + a few sinks. Small on purpose: the lab needs an on-page
// log and a console mirror; the game may reuse the port with different sinks.

/** The logging port: one line at a time. */
export interface Logger {
  log(message: string): void;
}

/** Writes to console.log. */
export class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

/** Appends "message\n" to a DOM element and keeps it scrolled to the bottom (the lab's on-page log). */
export class DomLogger implements Logger {
  constructor(private readonly el: HTMLElement) {}
  log(message: string): void {
    this.el.textContent += message + '\n';
    this.el.scrollTop = this.el.scrollHeight;
  }
}

/** Fans one message out to several loggers. */
export class MultiLogger implements Logger {
  private readonly sinks: readonly Logger[];
  constructor(...sinks: Logger[]) {
    this.sinks = sinks;
  }
  log(message: string): void {
    for (const s of this.sinks) s.log(message);
  }
}

/** Console methods a mirror can intercept. */
export type ConsoleLevel = 'error' | 'warn' | 'log';

/**
 * Mirror console.{error,warn,log} INTO a logger while still calling the original — this is how the lab
 * surfaced the sherpa/Emscripten `exit(-1)` reason, which is printed via console.error, not stderr.
 * Returns a restore function that un-patches.
 */
export function mirrorConsole(
  logger: Logger,
  levels: readonly ConsoleLevel[] = ['error', 'warn', 'log'],
): () => void {
  const originals = new Map<ConsoleLevel, (...args: unknown[]) => void>();
  for (const level of levels) {
    // Keep the ORIGINAL reference (unbound) so restore() gives back the exact function; call it with
    // apply so console still receives the right `this`.
    const original = console[level] as (...args: unknown[]) => void;
    originals.set(level, original);
    console[level] = (...args: unknown[]): void => {
      try {
        logger.log('[c.' + level + '] ' + args.map(stringifyArg).join(' '));
      } catch {
        /* never let logging throw */
      }
      original.apply(console, args);
    };
  }
  return () => {
    for (const [level, original] of originals) console[level] = original;
  };
}

function stringifyArg(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object' && 'message' in x) return String((x as { message: unknown }).message);
  return String(x);
}

export const VERSION = '0.1.0';

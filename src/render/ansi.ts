const RESET = '\x1b[0m';

export function supportsColor(): boolean {
  const force = process.env.FORCE_COLOR;
  if (force !== undefined && force !== '' && force !== '0') return true;
  if (process.env.NO_COLOR) return false;
  return process.stdout.isTTY === true;
}

function wrap(code: string, s: string, enabled: boolean): string {
  return enabled ? `${code}${s}${RESET}` : s;
}

export function bold(s: string, enabled: boolean): string {
  return wrap('\x1b[1m', s, enabled);
}

export function red(s: string, enabled: boolean): string {
  return wrap('\x1b[31m', s, enabled);
}

export function yellow(s: string, enabled: boolean): string {
  return wrap('\x1b[33m', s, enabled);
}

export function dim(s: string, enabled: boolean): string {
  return wrap('\x1b[2m', s, enabled);
}

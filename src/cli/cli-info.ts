import { obfuskuPath, runObfusku } from './run-cli';

/** Oldest and first-unsupported major of the CLI this extension is tested against. */
export const MIN_SUPPORTED = '1.0.0';
export const NEXT_UNSUPPORTED_MAJOR = 2;

export interface CliVersion {
  major: number;
  minor: number;
  patch: number;
}

/** What the installed `obfusku` can do, decided by its version alone. */
export interface CliInfo extends CliVersion {
  version: string;
  /** Inside the range this extension is tested against. */
  supported: boolean;
  /** `check --json` (1.0 reads `--json` as a file name and reports nothing). */
  json: boolean;
  /** `fmt` keeps comments and nested types (1.0 deletes comments). */
  safeFormat: boolean;
  /** `obfusku test`. */
  test: boolean;
}

export function parseVersion(text: string): CliVersion | undefined {
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(text);
  if (!match) {
    return undefined;
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function atLeast(v: CliVersion, major: number, minor: number): boolean {
  return v.major > major || (v.major === major && v.minor >= minor);
}

export function capabilitiesFor(v: CliVersion): CliInfo {
  const modern = atLeast(v, 1, 1);
  return {
    ...v,
    version: `${v.major}.${v.minor}.${v.patch}`,
    supported: atLeast(v, 1, 0) && v.major < NEXT_UNSUPPORTED_MAJOR,
    json: modern,
    safeFormat: modern,
    test: modern,
  };
}

const cache = new Map<string, CliInfo>();

/**
 * The installed CLI's version and what it supports, or `undefined` when
 * the executable cannot be run. An executable that answers but whose
 * version cannot be read is treated as the oldest supported one, so
 * nothing newer is attempted against it. Only successes are cached: a
 * user who installs the CLI after activation is picked up on next use.
 */
export async function cliInfo(): Promise<CliInfo | undefined> {
  const key = obfuskuPath();
  const known = cache.get(key);
  if (known) {
    return known;
  }
  const result = await runObfusku(['--version']);
  if (result.notFound) {
    return undefined;
  }
  const parsed = parseVersion(result.stdout) ?? { major: 0, minor: 0, patch: 0 };
  const info = capabilitiesFor(parsed);
  cache.set(key, info);
  return info;
}

export function resetCliInfo(): void {
  cache.clear();
}

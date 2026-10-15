import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseToml } from 'smol-toml';
import { MANIFEST_FILE_NAME } from './find-project-root';

/**
 * Reads `<projectRoot>/obfusku.toml`'s `entry` field and resolves it to
 * an absolute `.obk` path via a whole-tree filename search — the same
 * resolution `spec/adr/ADR-018-project-relative-module-resolution.md`
 * defines for `⟲` imports. Returns `undefined` on any manifest or
 * resolution failure; callers treat that as "attribute nowhere in
 * particular" rather than a hard error.
 */
export async function resolveEntryFile(projectRoot: string): Promise<string | undefined> {
  try {
    const manifestText = await fs.readFile(path.join(projectRoot, MANIFEST_FILE_NAME), 'utf8');
    const manifest = parseToml(manifestText) as { entry?: unknown };
    // Format 1/2 string, or a format 2 `[entry]` table with `module` or `path`.
    const entry = manifest.entry;
    if (typeof entry === 'string' && entry.length > 0) {
      return await findModuleFile(projectRoot, entry);
    }
    if (entry && typeof entry === 'object') {
      const { module, path: relative } = entry as { module?: unknown; path?: unknown };
      if (typeof relative === 'string' && relative.length > 0) {
        const file = path.resolve(projectRoot, relative);
        const inside = path.relative(projectRoot, file);
        return inside.startsWith('..') || path.isAbsolute(inside) ? undefined : file;
      }
      if (typeof module === 'string' && module.length > 0) {
        return await findModuleFile(projectRoot, module);
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function findModuleFile(dir: string, moduleName: string): Promise<string | undefined> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name === `${moduleName}.obk`) {
      return path.join(dir, entry.name);
    }
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const found = await findModuleFile(path.join(dir, entry.name), moduleName);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

import * as fs from 'node:fs/promises';
import * as path from 'node:path';

export const MANIFEST_FILE_NAME = 'obfusku.toml';

/**
 * Walks upward from `startPath` (a file or directory) to the nearest
 * ancestor containing `obfusku.toml`, mirroring the CLI's own Project
 * discovery (spec/adr/ADR-017, ADR-020). Returns the Project root
 * directory, or `undefined` if no ancestor has a manifest.
 */
export async function findProjectRoot(startPath: string): Promise<string | undefined> {
  let dir = (await isDirectory(startPath)) ? startPath : path.dirname(startPath);
  let previous: string | undefined;
  while (dir !== previous) {
    if (await fileExists(path.join(dir, MANIFEST_FILE_NAME))) {
      return dir;
    }
    previous = dir;
    dir = path.dirname(dir);
  }
  return undefined;
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}

export async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

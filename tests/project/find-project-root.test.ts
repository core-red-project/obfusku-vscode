import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { findProjectRoot } from '../../src/project/find-project-root';

const projectRoot = path.resolve(__dirname, '../../examples/project');

describe('findProjectRoot', () => {
  it('finds the root from a file nested inside the project', async () => {
    const nested = path.join(projectRoot, 'utils', 'strings.obk');
    expect(await findProjectRoot(nested)).toBe(projectRoot);
  });

  it("finds the root from the manifest's own directory", async () => {
    expect(await findProjectRoot(projectRoot)).toBe(projectRoot);
  });

  it('returns undefined for a path with no ancestor manifest', async () => {
    expect(await findProjectRoot('/tmp')).toBeUndefined();
  });
});

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveEntryFile } from '../../src/project/resolve-entry-file';

const projectRoot = path.resolve(__dirname, '../../examples/project');

describe('resolveEntryFile', () => {
  it("resolves the manifest's entry module to its absolute path", async () => {
    const entryFile = await resolveEntryFile(projectRoot);
    expect(entryFile).toBe(path.join(projectRoot, 'main.obk'));
  });

  it('returns undefined when the project root has no manifest', async () => {
    expect(await resolveEntryFile('/tmp')).toBeUndefined();
  });

  it('resolves a format 2 [entry] table by path and by module, and refuses a path outside', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'obk-entry-'));
    fs.mkdirSync(path.join(root, 'src'));
    fs.writeFileSync(path.join(root, 'src', 'app.obk'), '');
    fs.writeFileSync(
      path.join(root, 'obfusku.toml'),
      'format = 2\n[entry]\npath = "src/app.obk"\n',
    );
    expect(await resolveEntryFile(root)).toBe(path.join(root, 'src', 'app.obk'));
    fs.writeFileSync(path.join(root, 'obfusku.toml'), 'format = 2\n[entry]\nmodule = "app"\n');
    expect(await resolveEntryFile(root)).toBe(path.join(root, 'src', 'app.obk'));
    fs.writeFileSync(path.join(root, 'obfusku.toml'), 'format = 2\n[entry]\npath = "../x.obk"\n');
    expect(await resolveEntryFile(root)).toBeUndefined();
    fs.rmSync(root, { recursive: true, force: true });
  });
});

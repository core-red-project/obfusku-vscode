import { beforeEach, describe, expect, it, vi } from 'vitest';
import { published } from '../mocks/vscode';

const json = JSON.stringify({
  ok: false,
  diagnostics: [
    {
      severity: 'error',
      message: 'boom',
      source: 0,
      line: 1,
      column: 1,
      end_line: 1,
      end_column: 2,
    },
  ],
});

const { runObfusku, state } = vi.hoisted(() => ({
  runObfusku: vi.fn(async (_args: string[]) => ({
    stdout: '',
    stderr: '',
    code: 1,
    notFound: false,
  })),
  state: { modern: true },
}));
vi.mock('../../src/cli/run-cli', () => ({ runObfusku }));
vi.mock('../../src/cli/cli-info', () => ({
  cliInfo: vi.fn(async () => ({
    version: state.modern ? '1.1.0' : '1.0.0',
    json: state.modern,
  })),
}));

import { ObfuskuDiagnostics } from '../../src/diagnostics/diagnostic-provider';

const document = {
  languageId: 'obfusku',
  uri: { scheme: 'file', fsPath: '/p/main.obk' },
} as never;

describe('ObfuskuDiagnostics.refresh', () => {
  beforeEach(() => {
    published.clear();
    runObfusku.mockClear();
    state.modern = true;
    runObfusku.mockResolvedValue({ stdout: json, stderr: '', code: 1, notFound: false });
  });

  it('asks a 1.0 CLI for text, since it would read --json as a file name', async () => {
    state.modern = false;
    runObfusku.mockResolvedValueOnce({
      stdout: '',
      stderr: 'error: expected Int, found String (3:5)\n',
      code: 1,
      notFound: false,
    });
    const provider = new ObfuskuDiagnostics();
    const result = await provider.refresh(document);
    expect(runObfusku).toHaveBeenCalledWith(['check', '/p/main.obk']);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.range.start.line).toBe(2);
  });

  it('asks a 1.1 CLI for JSON', async () => {
    const provider = new ObfuskuDiagnostics();
    await provider.refresh(document);
    expect(runObfusku).toHaveBeenCalledWith(['check', '--json', '/p/main.obk']);
  });

  it("publishes the CLI's diagnostics when the language server is not running", async () => {
    const provider = new ObfuskuDiagnostics();
    const result = await provider.refresh(document);
    expect(result.diagnostics).toHaveLength(1);
    expect(published.get('/p/main.obk')).toHaveLength(1);
  });

  it('publishes nothing while the language server owns the file, but still reports', async () => {
    const provider = new ObfuskuDiagnostics();
    provider.deferToLsp(() => true);
    const result = await provider.refresh(document);
    expect(result.diagnostics).toHaveLength(1);
    expect(published.has('/p/main.obk')).toBe(false);
  });
});

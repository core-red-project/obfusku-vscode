import { type ChildProcessWithoutNullStreams, execFileSync, spawn } from 'node:child_process';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { capabilitiesFor, parseVersion } from '../../src/cli/cli-info';

/**
 * Drives the real `obfusku-lsp` over stdio. `OBFUSKU_LSP_PATH` and
 * `OBFUSKU_PATH` select the pair under test (default: from PATH), so the
 * same file validates 1.0.x and 1.1.x servers; version-dependent
 * behaviour is asserted against what that version is documented to do.
 */
const lspPath = process.env.OBFUSKU_LSP_PATH ?? 'obfusku-lsp';
const cliPath = process.env.OBFUSKU_PATH ?? 'obfusku';
const project = path.resolve(__dirname, '../../examples/project-with-error');

function installedVersion() {
  try {
    return parseVersion(execFileSync(cliPath, ['--version'], { encoding: 'utf8' }));
  } catch {
    return undefined;
  }
}
const version = installedVersion();
const modern = version ? capabilitiesFor(version).safeFormat : false;

interface Published {
  uri: string;
  diagnostics: { message: string; severity?: number }[];
}

class Session {
  private readonly child: ChildProcessWithoutNullStreams;
  private buffer = Buffer.alloc(0);
  readonly published: Published[] = [];
  private nextId = 1;
  private readonly pending = new Map<number, () => void>();

  constructor() {
    this.child = spawn(lspPath, [], { stdio: 'pipe' });
    this.child.stdout.on('data', (chunk: Buffer) => this.onData(chunk));
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const split = this.buffer.indexOf('\r\n\r\n');
      if (split < 0) {
        return;
      }
      const length = Number(
        /content-length: (\d+)/i.exec(this.buffer.toString('ascii', 0, split))?.[1],
      );
      const end = split + 4 + length;
      if (this.buffer.length < end) {
        return;
      }
      const message = JSON.parse(this.buffer.toString('utf8', split + 4, end));
      this.buffer = this.buffer.subarray(end);
      if (message.method === 'textDocument/publishDiagnostics') {
        this.published.push(message.params);
      } else if (typeof message.id === 'number') {
        this.pending.get(message.id)?.();
      }
    }
  }

  private send(message: object): void {
    const body = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...message }));
    this.child.stdin.write(`Content-Length: ${body.length}\r\n\r\n`);
    this.child.stdin.write(body);
  }

  request(method: string, params: object): Promise<void> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.send({ id, method, params });
    });
  }

  notify(method: string, params: object): void {
    this.send({ method, params });
  }

  async start(): Promise<void> {
    await this.request('initialize', { capabilities: {}, processId: null, rootUri: null });
    this.notify('initialized', {});
  }

  async waitFor(count: number, ms = 5000): Promise<void> {
    const deadline = Date.now() + ms;
    while (this.published.length < count && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  open(file: string, text: string): void {
    this.notify('textDocument/didOpen', {
      textDocument: { uri: pathToFileURL(file).href, languageId: 'obfusku', version: 1, text },
    });
  }

  close(file: string): void {
    this.notify('textDocument/didClose', { textDocument: { uri: pathToFileURL(file).href } });
  }

  async stop(): Promise<number | null> {
    await this.request('shutdown', {}).catch(() => undefined);
    this.notify('exit', {});
    return new Promise((resolve) => {
      this.child.on('exit', (code) => resolve(code));
      setTimeout(() => this.child.kill(), 3000);
    });
  }
}

let session: Session | undefined;
afterEach(async () => {
  await session?.stop();
  session = undefined;
});

const run = version ? describe : describe.skip;

run(`obfusku-lsp ${version ? `${version.major}.${version.minor}.${version.patch}` : ''}`, () => {
  it('reports a type error as an error-severity diagnostic', async () => {
    session = new Session();
    await session.start();
    const file = path.join(project, 'main.obk');
    session.open(file, 'x ≔ ☄ 1\n❧\n');
    await session.waitFor(1);
    const [first] = session.published;
    expect(first?.diagnostics.length).toBeGreaterThan(0);
    expect(first?.diagnostics[0]?.severity).toBe(1);
  });

  it('publishes nothing for a valid document', async () => {
    session = new Session();
    await session.start();
    session.open(path.join(project, 'main.obk'), 'x ≔ 1\n❧\n');
    await session.waitFor(1);
    expect(session.published[0]?.diagnostics).toEqual([]);
  });

  it('shuts down cleanly on shutdown + exit', async () => {
    session = new Session();
    await session.start();
    const code = await session.stop();
    session = undefined;
    expect(code).toBe(0);
  });

  it.runIf(modern)('clears a file’s diagnostics when it closes', async () => {
    session = new Session();
    await session.start();
    const file = path.join(project, 'main.obk');
    session.open(file, 'x ≔ ☄ 1\n❧\n');
    await session.waitFor(1);
    session.close(file);
    await session.waitFor(2);
    expect(session.published.at(-1)?.diagnostics).toEqual([]);
  });

  it.runIf(modern)('checks a buffer whose file is not on disk yet', async () => {
    session = new Session();
    await session.start();
    session.open(path.join(project, 'NotSavedYet.obk'), 'x ≔ 1\n❧\n');
    await session.waitFor(1);
    expect(session.published[0]?.diagnostics).toEqual([]);
  });

  it.skipIf(modern)('1.0.x: a buffer not on disk yet is reported unreadable', async () => {
    session = new Session();
    await session.start();
    session.open(path.join(project, 'NotSavedYet.obk'), 'x ≔ 1\n❧\n');
    await session.waitFor(1);
    expect(session.published[0]?.diagnostics[0]?.message).toContain('could not read');
  });
});

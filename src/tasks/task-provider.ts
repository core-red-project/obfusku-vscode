import { spawn } from 'node:child_process';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { cliInfo } from '../cli/cli-info';
import { obfuskuPath, runObfusku } from '../cli/run-cli';
import { parseDiagnostics, parseJsonDiagnostics } from '../diagnostics/parse-diagnostics';
import { fileExists, MANIFEST_FILE_NAME } from '../project/find-project-root';
import { resolveEntryFile } from '../project/resolve-entry-file';

type ObfuskuTaskCommand = 'build' | 'run' | 'test';

interface ObfuskuTaskDefinition extends vscode.TaskDefinition {
  command: ObfuskuTaskCommand;
}

export class ObfuskuTaskProvider implements vscode.TaskProvider {
  static readonly taskType = 'obfusku';

  constructor(private readonly diagnostics: vscode.DiagnosticCollection) {}

  async provideTasks(): Promise<vscode.Task[]> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    const tasks: vscode.Task[] = [];
    for (const folder of folders) {
      if (!(await fileExists(path.join(folder.uri.fsPath, MANIFEST_FILE_NAME)))) {
        continue;
      }
      tasks.push(this.createTask(folder, 'build'));
      tasks.push(this.createTask(folder, 'run'));
      if ((await cliInfo())?.test) {
        tasks.push(this.createTask(folder, 'test'));
      }
    }
    return tasks;
  }

  resolveTask(task: vscode.Task): vscode.Task | undefined {
    const definition = task.definition as ObfuskuTaskDefinition;
    const folder = task.scope;
    if (
      definition.type !== ObfuskuTaskProvider.taskType ||
      (definition.command !== 'build' &&
        definition.command !== 'run' &&
        definition.command !== 'test') ||
      typeof folder !== 'object' ||
      !folder ||
      !('uri' in folder)
    ) {
      return undefined;
    }
    return this.createTask(folder as vscode.WorkspaceFolder, definition.command);
  }

  private createTask(folder: vscode.WorkspaceFolder, command: ObfuskuTaskCommand): vscode.Task {
    const definition: ObfuskuTaskDefinition = { type: ObfuskuTaskProvider.taskType, command };
    const execution = new vscode.CustomExecution(
      async () => new ObfuskuTaskTerminal(folder.uri.fsPath, command, this.diagnostics),
    );
    const task = new vscode.Task(definition, folder, command, 'obfusku', execution);
    if (command === 'build') {
      task.group = vscode.TaskGroup.Build;
    }
    return task;
  }
}

/**
 * Runs `obfusku <command> <projectRoot>` and streams its real output
 * verbatim into the task terminal. Separately, stderr is parsed with the
 * same `parseDiagnostics` the LSP-less fallback path uses and attributed
 * to the Project's resolved entry file, so build/run errors land in the
 * Problems panel too — done this way, rather than via a declarative
 * `problemMatcher`, because the CLI's plain-text diagnostic lines never
 * include a filename (see `render_diagnostics_map` in
 * `obfusku-cli/src/lib.rs`), which a regex-based problem matcher has no
 * way to recover.
 */
class ObfuskuTaskTerminal implements vscode.Pseudoterminal {
  private readonly writeEmitter = new vscode.EventEmitter<string>();
  private readonly closeEmitter = new vscode.EventEmitter<number>();
  readonly onDidWrite = this.writeEmitter.event;
  readonly onDidClose = this.closeEmitter.event;

  constructor(
    private readonly projectRoot: string,
    private readonly command: ObfuskuTaskCommand,
    private readonly diagnostics: vscode.DiagnosticCollection,
  ) {}

  open(): void {
    void this.execute();
  }

  close(): void {}

  private async execute(): Promise<void> {
    const args = [this.command, this.projectRoot];
    this.writeEmitter.fire(`> obfusku ${args.join(' ')}\r\n\r\n`);

    let stderr = '';
    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn(obfuskuPath(), args);
      child.stdout.on('data', (chunk: Buffer) => this.writeEmitter.fire(toTerminalText(chunk)));
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
        this.writeEmitter.fire(toTerminalText(chunk));
      });
      child.on('error', () => {
        this.writeEmitter.fire(
          "Could not find the 'obfusku' executable. Set 'obfusku.path' in your settings.\r\n",
        );
        resolve(-1);
      });
      child.on('close', (code) => resolve(code ?? -1));
    });

    const entryFile = await resolveEntryFile(this.projectRoot);
    if (entryFile && this.command !== 'test') {
      const entryUri = vscode.Uri.file(entryFile);
      if (exitCode === 0) {
        this.diagnostics.delete(entryUri);
      } else {
        const info = await cliInfo();
        const checkResult = info?.json
          ? await runObfusku(['check', '--json', this.projectRoot])
          : undefined;
        const jsonDiagnostics = checkResult && parseJsonDiagnostics(checkResult.stdout);
        this.diagnostics.set(entryUri, jsonDiagnostics ?? parseDiagnostics(stderr));
      }
    }
    this.closeEmitter.fire(exitCode);
  }
}

function toTerminalText(chunk: Buffer): string {
  return chunk.toString().replace(/\r?\n/g, '\r\n');
}

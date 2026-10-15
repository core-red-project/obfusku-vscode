import { execFile } from 'node:child_process';
import * as vscode from 'vscode';

export interface CliResult {
  stdout: string;
  stderr: string;
  code: number;
  notFound: boolean;
}

export function obfuskuPath(): string {
  return vscode.workspace.getConfiguration('obfusku').get<string>('path', 'obfusku');
}

export function obfuskuLspPath(): string {
  return vscode.workspace.getConfiguration('obfusku').get<string>('lspPath', 'obfusku-lsp');
}

export function runObfusku(args: string[], cwd?: string): Promise<CliResult> {
  return new Promise((resolve) => {
    execFile(obfuskuPath(), args, { cwd, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      const notFound = !!error && (error as NodeJS.ErrnoException).code === 'ENOENT';
      const code = error && typeof error.code === 'number' ? error.code : notFound ? -1 : 0;
      resolve({ stdout, stderr, code, notFound });
    });
  });
}

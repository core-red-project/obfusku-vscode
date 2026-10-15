import * as vscode from 'vscode';
import { cliInfo } from '../cli/cli-info';
import { runObfusku } from '../cli/run-cli';
import { parseDiagnostics, parseJsonDiagnostics } from './parse-diagnostics';

export interface RefreshResult {
  notFound: boolean;
  diagnostics: vscode.Diagnostic[];
}

export class ObfuskuDiagnostics implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection('obfusku-check');
  private lspActive: () => boolean = () => false;

  /**
   * While the language server is running it owns this file's Problems
   * entries; publishing the CLI's copy as well would list every error twice.
   */
  deferToLsp(isActive: () => boolean): void {
    this.lspActive = isActive;
  }

  /**
   * Runs one `check` and returns what it found; the collection is only
   * updated while the language server is not the owner of this file.
   */
  async refresh(document: vscode.TextDocument): Promise<RefreshResult> {
    if (document.languageId !== 'obfusku' || document.uri.scheme !== 'file') {
      return { notFound: false, diagnostics: [] };
    }
    const info = await cliInfo();
    if (!info) {
      return { notFound: true, diagnostics: [] };
    }
    const args = info.json
      ? ['check', '--json', document.uri.fsPath]
      : ['check', document.uri.fsPath];
    const result = await runObfusku(args);
    if (result.notFound) {
      return { notFound: true, diagnostics: [] };
    }
    const diagnostics = info.json
      ? (parseJsonDiagnostics(result.stdout) ?? parseDiagnostics(result.stderr))
      : parseDiagnostics(result.stderr);
    if (this.lspActive()) {
      this.collection.delete(document.uri);
    } else {
      this.collection.set(document.uri, diagnostics);
    }
    return { notFound: false, diagnostics };
  }

  clear(document: vscode.TextDocument): void {
    this.collection.delete(document.uri);
  }

  dispose(): void {
    this.collection.dispose();
  }
}

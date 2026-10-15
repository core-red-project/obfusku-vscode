import * as vscode from 'vscode';
import { cliInfo } from '../cli/cli-info';
import { obfuskuPath, runObfusku } from '../cli/run-cli';
import type { ObfuskuDiagnostics } from '../diagnostics/diagnostic-provider';
import { formatDiagnostic } from '../diagnostics/parse-diagnostics';
import type { ProjectContext } from '../project/project-context';

async function activeObfuskuFile(): Promise<vscode.TextDocument | undefined> {
  const document = vscode.window.activeTextEditor?.document;
  if (document?.languageId !== 'obfusku') {
    vscode.window.showWarningMessage('Obfusku: no active .obk file.');
    return undefined;
  }
  if (document.uri.scheme !== 'file') {
    vscode.window.showWarningMessage('Obfusku: file must be saved to disk first.');
    return undefined;
  }
  if (document.isDirty) {
    await document.save();
  }
  return document;
}

function reportCliMissing(result: { notFound: boolean }): boolean {
  if (result.notFound) {
    vscode.window.showWarningMessage(
      "Obfusku: could not find the 'obfusku' executable. Set 'obfusku.path' in your settings.",
    );
  }
  return result.notFound;
}

export function registerCommands(
  context: vscode.ExtensionContext,
  diagnostics: ObfuskuDiagnostics,
  projectContext: ProjectContext,
): void {
  const output = vscode.window.createOutputChannel('Obfusku');
  context.subscriptions.push(output);

  context.subscriptions.push(
    vscode.commands.registerCommand('obfusku.run', async () => {
      const document = await activeObfuskuFile();
      if (!document) {
        return;
      }
      const result = await runObfusku(['run', document.uri.fsPath]);
      if (reportCliMissing(result)) {
        return;
      }
      output.clear();
      output.show(true);
      output.append(result.stdout);
      if (result.stderr) {
        output.append(result.stderr);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('obfusku.typecheck', async () => {
      const document = await activeObfuskuFile();
      if (!document) {
        return;
      }
      const result = await diagnostics.refresh(document);
      if (reportCliMissing(result)) {
        return;
      }
      output.clear();
      output.show(true);
      output.append(
        result.diagnostics.length > 0
          ? `${result.diagnostics.map(formatDiagnostic).join('\n')}\n`
          : 'ok\n',
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('obfusku.format', async () => {
      const document = await activeObfuskuFile();
      if (!document) {
        return;
      }
      await vscode.commands.executeCommand('editor.action.formatDocument');
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('obfusku.build', async () => {
      const root = projectContext.getRoot();
      if (!root) {
        vscode.window.showWarningMessage(
          'Obfusku: active file is not inside a Project (no obfusku.toml found).',
        );
        return;
      }
      const result = await runObfusku(['build', root]);
      if (reportCliMissing(result)) {
        return;
      }
      output.clear();
      output.show(true);
      output.append(result.stdout);
      if (result.stderr) {
        output.append(result.stderr);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('obfusku.test', async () => {
      const root = projectContext.getRoot();
      if (!root) {
        vscode.window.showWarningMessage(
          'Obfusku: active file is not inside a Project (no obfusku.toml found).',
        );
        return;
      }
      const info = await cliInfo();
      if (!info) {
        reportCliMissing({ notFound: true });
        return;
      }
      if (!info.test) {
        vscode.window.showWarningMessage(
          `Obfusku: 'test' needs obfusku 1.1 or newer (found ${info.version}).`,
        );
        return;
      }
      const result = await runObfusku(['test', root]);
      output.clear();
      output.show(true);
      output.append(result.stdout);
      if (result.stderr) {
        output.append(result.stderr);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('obfusku.openRepl', () => {
      const terminal =
        vscode.window.terminals.find((t) => t.name === 'Obfusku REPL') ??
        vscode.window.createTerminal('Obfusku REPL');
      terminal.show();
      terminal.sendText(`"${obfuskuPath()}" repl`);
    }),
  );
}

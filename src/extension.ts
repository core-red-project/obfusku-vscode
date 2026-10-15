import * as vscode from 'vscode';
import { type LanguageClient, State } from 'vscode-languageclient/node';
import { cliInfo, MIN_SUPPORTED, resetCliInfo } from './cli/cli-info';
import { registerCommands } from './commands/commands';
import { ObfuskuDiagnostics } from './diagnostics/diagnostic-provider';
import { ObfuskuFormattingProvider } from './formatting/formatting-provider';
import { createLanguageClient } from './lsp/client';
import { ObfuskuLspStatusBar } from './lsp/status-bar';
import { ProjectContext } from './project/project-context';
import { registerTomlSchemaAssociation } from './project/toml-schema';
import { ObfuskuTaskProvider } from './tasks/task-provider';

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const diagnostics = new ObfuskuDiagnostics();
  context.subscriptions.push(diagnostics);

  const projectContext = new ProjectContext();
  context.subscriptions.push(projectContext);

  registerCommands(context, diagnostics, projectContext);

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      'obfusku',
      new ObfuskuFormattingProvider(),
    ),
  );

  const taskDiagnostics = vscode.languages.createDiagnosticCollection('obfusku-tasks');
  context.subscriptions.push(taskDiagnostics);
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      ObfuskuTaskProvider.taskType,
      new ObfuskuTaskProvider(taskDiagnostics),
    ),
  );

  void registerTomlSchemaAssociation(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('obfusku.path')) {
        resetCliInfo();
        void announceCli(context);
      }
    }),
  );
  void announceCli(context);

  client = createLanguageClient();
  const lsp = client;
  diagnostics.deferToLsp(() => lsp.state === State.Running);
  const statusBar = new ObfuskuLspStatusBar(client);
  context.subscriptions.push(statusBar);
  context.subscriptions.push(
    vscode.commands.registerCommand('obfusku.showLspOutput', () => client?.outputChannel.show()),
  );
  context.subscriptions.push({ dispose: () => void client?.stop() });

  try {
    await client.start();
  } catch {
    statusBar.showFailed();
  }
}

/**
 * Says once per version what the installed CLI cannot do; what it can do
 * needs no announcement.
 */
async function announceCli(context: vscode.ExtensionContext): Promise<void> {
  const info = await cliInfo();
  if (!info) {
    return;
  }
  const key = `obfusku.noticed.${info.version}`;
  if (context.globalState.get<boolean>(key)) {
    return;
  }
  let message: string | undefined;
  if (info.major >= 2) {
    message = `Obfusku ${info.version} is newer than this extension was tested with (1.x); some features may not work.`;
  } else if (info.major < 1) {
    message = `Obfusku ${info.version} is older than the supported ${MIN_SUPPORTED}; upgrade the CLI.`;
  } else if (!info.safeFormat) {
    message = `Obfusku ${info.version} works, but formatting and 'test' are disabled and live checks use text output. Upgrade to 1.1 or newer for the full feature set.`;
  }
  if (message) {
    await context.globalState.update(key, true);
    void vscode.window.showInformationMessage(message);
  }
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}

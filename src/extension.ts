import * as vscode from "vscode";
import type { LanguageClient } from "vscode-languageclient/node";
import { registerCommands } from "./commands/commands";
import { ObfuskuDiagnostics } from "./diagnostics/diagnostic-provider";
import { ObfuskuFormattingProvider } from "./formatting/formatting-provider";
import { createLanguageClient } from "./lsp/client";
import { ObfuskuLspStatusBar } from "./lsp/status-bar";
import { ProjectContext } from "./project/project-context";
import { registerTomlSchemaAssociation } from "./project/toml-schema";
import { ObfuskuTaskProvider } from "./tasks/task-provider";

let client: LanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const diagnostics = new ObfuskuDiagnostics();
  context.subscriptions.push(diagnostics);

  const projectContext = new ProjectContext();
  context.subscriptions.push(projectContext);

  registerCommands(context, diagnostics, projectContext);

  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider(
      "obfusku",
      new ObfuskuFormattingProvider()
    )
  );

  const taskDiagnostics = vscode.languages.createDiagnosticCollection("obfusku-tasks");
  context.subscriptions.push(taskDiagnostics);
  context.subscriptions.push(
    vscode.tasks.registerTaskProvider(
      ObfuskuTaskProvider.taskType,
      new ObfuskuTaskProvider(taskDiagnostics)
    )
  );

  void registerTomlSchemaAssociation(context);

  client = createLanguageClient();
  const statusBar = new ObfuskuLspStatusBar(client);
  context.subscriptions.push(statusBar);
  context.subscriptions.push(
    vscode.commands.registerCommand("obfusku.showLspOutput", () => client?.outputChannel.show())
  );
  context.subscriptions.push({ dispose: () => void client?.stop() });

  try {
    await client.start();
  } catch {
    statusBar.showFailed();
  }
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}

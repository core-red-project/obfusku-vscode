import * as vscode from "vscode";
import { findProjectRoot, MANIFEST_FILE_NAME } from "./find-project-root";

/**
 * Tracks whether the active editor sits inside an Obfusku Project (a
 * directory tree rooted at an `obfusku.toml`), exposing the resolved
 * root and a `obfusku.hasProject` `when`-clause context key so commands
 * and menus can show only where they apply.
 */
export class ProjectContext implements vscode.Disposable {
  private root: string | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor() {
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => this.refresh(editor)),
      vscode.workspace.onDidSaveTextDocument((document) => {
        if (
          document.uri.fsPath.endsWith(MANIFEST_FILE_NAME) ||
          document === vscode.window.activeTextEditor?.document
        ) {
          void this.refresh(vscode.window.activeTextEditor);
        }
      })
    );
    void this.refresh(vscode.window.activeTextEditor);
  }

  getRoot(): string | undefined {
    return this.root;
  }

  private async refresh(editor: vscode.TextEditor | undefined): Promise<void> {
    const document = editor?.document;
    this.root =
      document && document.uri.scheme === "file" && document.languageId === "obfusku"
        ? await findProjectRoot(document.uri.fsPath)
        : undefined;
    await vscode.commands.executeCommand(
      "setContext",
      "obfusku.hasProject",
      this.root !== undefined
    );
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}

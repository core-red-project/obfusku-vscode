import * as vscode from "vscode";
import { runObfusku } from "../cli/run-cli";
import { parseDiagnostics } from "./parse-diagnostics";

export class ObfuskuDiagnostics implements vscode.Disposable {
  private readonly collection = vscode.languages.createDiagnosticCollection("obfusku-check");
  private notifiedMissingCli = false;

  async refresh(document: vscode.TextDocument): Promise<void> {
    if (document.languageId !== "obfusku" || document.uri.scheme !== "file") {
      return;
    }
    const result = await runObfusku(["check", document.uri.fsPath]);
    if (result.notFound) {
      this.warnMissingCli();
      return;
    }
    this.collection.set(document.uri, parseDiagnostics(result.stderr));
  }

  clear(document: vscode.TextDocument): void {
    this.collection.delete(document.uri);
  }

  private warnMissingCli(): void {
    if (this.notifiedMissingCli) {
      return;
    }
    this.notifiedMissingCli = true;
    vscode.window.showWarningMessage(
      "Obfusku: could not find the 'obfusku' executable. Set 'obfusku.path' in your settings."
    );
  }

  dispose(): void {
    this.collection.dispose();
  }
}

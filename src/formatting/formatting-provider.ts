import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";
import { runObfusku } from "../cli/run-cli";

export class ObfuskuFormattingProvider implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
    const tempFile = path.join(os.tmpdir(), `obfusku-fmt-${process.pid}-${Date.now()}.obk`);
    await fs.writeFile(tempFile, document.getText(), "utf8");
    try {
      const result = await runObfusku(["fmt", tempFile]);
      if (result.notFound) {
        vscode.window.showWarningMessage(
          "Obfusku: could not find the 'obfusku' executable. Set 'obfusku.path' in your settings."
        );
        return [];
      }
      if (result.code !== 0) {
        vscode.window.showErrorMessage(`Obfusku: formatting failed.\n${result.stderr.trim()}`);
        return [];
      }
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
      );
      return [vscode.TextEdit.replace(fullRange, result.stdout)];
    } finally {
      await fs.rm(tempFile, { force: true });
    }
  }
}

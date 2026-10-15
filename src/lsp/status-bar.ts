import * as vscode from 'vscode';
import { type LanguageClient, State } from 'vscode-languageclient/node';

export class ObfuskuLspStatusBar implements vscode.Disposable {
  private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  private readonly disposables: vscode.Disposable[] = [];

  constructor(client: LanguageClient) {
    this.item.command = 'obfusku.showLspOutput';
    this.disposables.push(
      this.item,
      client.onDidChangeState((event) => this.render(event.newState)),
    );
    this.render(client.state);
    this.item.show();
  }

  showFailed(): void {
    this.item.text = '$(warning) Obfusku LSP';
    this.item.tooltip =
      "Could not start obfusku-lsp — diagnostics will not update live. Click to see the log, or set 'obfusku.lspPath'.";
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.item.show();
  }

  private render(state: State): void {
    switch (state) {
      case State.Running:
        this.item.text = '$(check) Obfusku LSP';
        this.item.tooltip = 'Obfusku language server is running.';
        this.item.backgroundColor = undefined;
        break;
      case State.Starting:
        this.item.text = '$(sync~spin) Obfusku LSP';
        this.item.tooltip = 'Starting obfusku-lsp…';
        this.item.backgroundColor = undefined;
        break;
      case State.Stopped:
        this.item.text = '$(circle-slash) Obfusku LSP';
        this.item.tooltip = 'Obfusku language server is stopped.';
        this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
    }
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }
}

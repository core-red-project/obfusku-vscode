import * as vscode from "vscode";

const DIAGNOSTIC_LINE = /^(error|warning|note): (.*) \((\d+):(\d+)\)$/;

const SEVERITY: Record<string, vscode.DiagnosticSeverity> = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  note: vscode.DiagnosticSeverity.Information,
};

export function parseDiagnostics(output: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (line.length === 0) {
      continue;
    }
    const match = DIAGNOSTIC_LINE.exec(line);
    if (!match) {
      continue;
    }
    const [, severity, message, lineNo, columnNo] = match;
    if (
      severity === undefined ||
      message === undefined ||
      lineNo === undefined ||
      columnNo === undefined
    ) {
      continue;
    }
    const position = new vscode.Position(
      Math.max(0, Number(lineNo) - 1),
      Math.max(0, Number(columnNo) - 1)
    );
    const range = new vscode.Range(position, position);
    diagnostics.push(new vscode.Diagnostic(range, message, SEVERITY[severity]));
  }
  return diagnostics;
}

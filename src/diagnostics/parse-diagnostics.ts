import * as vscode from 'vscode';

const DIAGNOSTIC_LINE = /^(error|warning|note): (.*) \((\d+):(\d+)\)$/;

const SEVERITY: Record<string, vscode.DiagnosticSeverity> = {
  error: vscode.DiagnosticSeverity.Error,
  warning: vscode.DiagnosticSeverity.Warning,
  note: vscode.DiagnosticSeverity.Information,
};

export function parseDiagnostics(output: string): vscode.Diagnostic[] {
  const diagnostics: vscode.Diagnostic[] = [];
  for (const rawLine of output.split('\n')) {
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
      Math.max(0, Number(columnNo) - 1),
    );
    const range = new vscode.Range(position, position);
    diagnostics.push(new vscode.Diagnostic(range, message, SEVERITY[severity]));
  }
  return diagnostics;
}

interface JsonDiagnostic {
  severity: string;
  message: string;
  source: number;
  line: number;
  column: number;
  end_line: number;
  end_column: number;
}

const IMPORTED_PREFIX = 'in an imported module: ';

/**
 * Parses `obfusku check --json`'s single-line report. A diagnostic whose
 * span belongs to another file (`source` other than 0 — the entry is
 * registered first) has that file's line/column, so it is pinned to the
 * first line of this document with a prefix instead of at a wrong place
 * or dropped: dropping it would leave a failing check with no visible error.
 * Returns `undefined` when `output` is not that report (a CLI without
 * `--json`), so the caller can fall back to `parseDiagnostics`.
 */
export function parseJsonDiagnostics(output: string): vscode.Diagnostic[] | undefined {
  let report: { diagnostics?: unknown };
  try {
    report = JSON.parse(output.trim());
  } catch {
    return undefined;
  }
  if (!report || !Array.isArray(report.diagnostics)) {
    return undefined;
  }
  const diagnostics: vscode.Diagnostic[] = [];
  for (const d of report.diagnostics as Partial<JsonDiagnostic>[]) {
    const { line, column, end_line, end_column, source, message, severity } = d;
    if (
      typeof message !== 'string' ||
      typeof severity !== 'string' ||
      !Number.isFinite(source) ||
      !Number.isFinite(line) ||
      !Number.isFinite(column) ||
      !Number.isFinite(end_line) ||
      !Number.isFinite(end_column)
    ) {
      continue;
    }
    const own = source === 0;
    const at = (l: number, c: number) =>
      new vscode.Position(own ? Math.max(0, l - 1) : 0, own ? Math.max(0, c - 1) : 0);
    const diagnostic = new vscode.Diagnostic(
      new vscode.Range(
        at(line as number, column as number),
        at(end_line as number, end_column as number),
      ),
      own ? message : `${IMPORTED_PREFIX}${message}`,
      SEVERITY[severity],
    );
    diagnostic.source = 'obfusku';
    diagnostics.push(diagnostic);
  }
  return diagnostics;
}

const LABEL: Record<number, string> = {
  [vscode.DiagnosticSeverity.Error]: 'error',
  [vscode.DiagnosticSeverity.Warning]: 'warning',
  [vscode.DiagnosticSeverity.Information]: 'note',
};

/** `severity: message (line:col)`, the CLI's own text form, 1-based. */
export function formatDiagnostic(d: vscode.Diagnostic): string {
  const label = LABEL[d.severity ?? vscode.DiagnosticSeverity.Error] ?? 'error';
  return `${label}: ${d.message} (${d.range.start.line + 1}:${d.range.start.character + 1})`;
}

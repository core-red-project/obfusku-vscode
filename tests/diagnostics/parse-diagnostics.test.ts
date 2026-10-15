import { describe, expect, it } from 'vitest';
import { DiagnosticSeverity } from 'vscode';
import {
  formatDiagnostic,
  parseDiagnostics,
  parseJsonDiagnostics,
} from '../../src/diagnostics/parse-diagnostics';

describe('parseDiagnostics', () => {
  it('parses a single error line into a zero-width diagnostic at 0-based position', () => {
    const result = parseDiagnostics('error: expected Int, found String (3:5)');
    expect(result).toHaveLength(1);
    const [diagnostic] = result;
    expect(diagnostic?.message).toBe('expected Int, found String');
    expect(diagnostic?.severity).toBe(DiagnosticSeverity.Error);
    expect(diagnostic?.range.start.line).toBe(2);
    expect(diagnostic?.range.start.character).toBe(4);
  });

  it('parses warning and note severities', () => {
    const result = parseDiagnostics(
      'warning: unreachable match arm (5:1)\nnote: shadowed binding (1:1)',
    );
    expect(result.map((d) => d.severity)).toEqual([
      DiagnosticSeverity.Warning,
      DiagnosticSeverity.Information,
    ]);
  });

  it('ignores blank lines and lines that do not match the diagnostic format', () => {
    const result = parseDiagnostics('\nok\n\n');
    expect(result).toHaveLength(0);
  });

  it('returns an empty array for empty output', () => {
    expect(parseDiagnostics('')).toHaveLength(0);
  });
});

describe('parseJsonDiagnostics', () => {
  const report = (items: unknown[]) => JSON.stringify({ ok: false, diagnostics: items });
  const item = (over: Record<string, unknown> = {}) => ({
    severity: 'error',
    message: 'expected Int, found Bool',
    source: 0,
    line: 3,
    column: 5,
    end_line: 3,
    end_column: 10,
    ...over,
  });

  it('maps a span to a real 0-based range', () => {
    const [d] = parseJsonDiagnostics(report([item()])) ?? [];
    expect(d?.message).toBe('expected Int, found Bool');
    expect(d?.severity).toBe(DiagnosticSeverity.Error);
    expect(d?.range.start.line).toBe(2);
    expect(d?.range.start.character).toBe(4);
    expect(d?.range.end.character).toBe(9);
  });

  it("pins an imported file's diagnostic to line 1 with a prefix instead of dropping it", () => {
    const result = parseJsonDiagnostics(report([item({ source: 2 }), item({ message: 'mine' })]));
    expect(result?.map((d) => d.message)).toEqual([
      'in an imported module: expected Int, found Bool',
      'mine',
    ]);
    expect(result?.[0]?.range.start.line).toBe(0);
    expect(result?.[0]?.range.start.character).toBe(0);
  });

  it('skips entries whose numbers are missing instead of producing NaN positions', () => {
    const { line: _line, ...broken } = item();
    expect(parseJsonDiagnostics(report([broken, item()]))).toHaveLength(1);
  });

  it('accepts a clean report and returns undefined for non-JSON output', () => {
    expect(parseJsonDiagnostics('{"ok":true,"diagnostics":[]}')).toEqual([]);
    expect(parseJsonDiagnostics('unknown command: --json')).toBeUndefined();
  });

  it('keeps warnings and notes as their own severities', () => {
    const result = parseJsonDiagnostics(
      report([item({ severity: 'warning' }), item({ severity: 'note' })]),
    );
    expect(result?.map((d) => d.severity)).toEqual([
      DiagnosticSeverity.Warning,
      DiagnosticSeverity.Information,
    ]);
  });
});

describe('formatDiagnostic', () => {
  it("renders the CLI's severity: message (line:col) form", () => {
    const [d] =
      parseJsonDiagnostics(
        JSON.stringify({
          diagnostics: [
            {
              severity: 'warning',
              message: 'm',
              source: 0,
              line: 2,
              column: 3,
              end_line: 2,
              end_column: 4,
            },
          ],
        }),
      ) ?? [];
    expect(d ? formatDiagnostic(d) : '').toBe('warning: m (2:3)');
  });
});

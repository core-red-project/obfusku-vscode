import { describe, expect, it } from "vitest";
import { DiagnosticSeverity } from "vscode";
import { parseDiagnostics } from "../src/diagnostics/parse-diagnostics";

describe("parseDiagnostics", () => {
  it("parses a single error line into a zero-width diagnostic at 0-based position", () => {
    const result = parseDiagnostics("error: expected Int, found String (3:5)");
    expect(result).toHaveLength(1);
    const [diagnostic] = result;
    expect(diagnostic?.message).toBe("expected Int, found String");
    expect(diagnostic?.severity).toBe(DiagnosticSeverity.Error);
    expect(diagnostic?.range.start.line).toBe(2);
    expect(diagnostic?.range.start.character).toBe(4);
  });

  it("parses warning and note severities", () => {
    const result = parseDiagnostics(
      "warning: unreachable match arm (5:1)\nnote: shadowed binding (1:1)"
    );
    expect(result.map((d) => d.severity)).toEqual([
      DiagnosticSeverity.Warning,
      DiagnosticSeverity.Information,
    ]);
  });

  it("ignores blank lines and lines that do not match the diagnostic format", () => {
    const result = parseDiagnostics("\nok\n\n");
    expect(result).toHaveLength(0);
  });

  it("returns an empty array for empty output", () => {
    expect(parseDiagnostics("")).toHaveLength(0);
  });
});

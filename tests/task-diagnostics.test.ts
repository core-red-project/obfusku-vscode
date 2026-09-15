import { execFile } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { DiagnosticSeverity } from "vscode";
import { parseDiagnostics } from "../src/diagnostics/parse-diagnostics";
import { resolveEntryFile } from "../src/project/resolve-entry-file";

const execFileAsync = promisify(execFile);
const brokenProjectRoot = path.resolve(__dirname, "../examples/project-with-error");

/**
 * Exercises the same sequence `ObfuskuTaskTerminal` (src/tasks/task-provider.ts)
 * runs: spawn the real CLI, then attribute its stderr to the Project's
 * resolved entry file — the reason a declarative `problemMatcher` was not
 * used (the CLI's plain-text diagnostics carry no filename to match against).
 */
describe("task diagnostics attribution", () => {
  it("attributes obfusku build's diagnostics to the resolved entry file", async () => {
    let stderr = "";
    try {
      await execFileAsync("obfusku", ["build", brokenProjectRoot]);
    } catch (error) {
      stderr = (error as { stderr?: string }).stderr ?? "";
    }
    expect(stderr).toContain("expected Int, found String");

    const entryFile = await resolveEntryFile(brokenProjectRoot);
    expect(entryFile).toBe(path.join(brokenProjectRoot, "main.obk"));

    const diagnostics = parseDiagnostics(stderr);
    expect(diagnostics).toHaveLength(1);
    const [diagnostic] = diagnostics;
    expect(diagnostic?.severity).toBe(DiagnosticSeverity.Error);
    expect(diagnostic?.range.start.line).toBe(2);
  });
});

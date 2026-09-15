# Obfusku for VS Code — CLAUDE.md

## Repository Overview
`obfusku-vscode` is a single-package TypeScript project (Node.js, VS Code extension host). It is Monolithic — one publishable unit, no workspace tooling.

---

## 1. Repository Purpose & Architecture

Language support for [Obfusku](https://github.com/core-red-project/obfusku) inside VS Code: syntax highlighting, formatting, live diagnostics, Project-aware commands and tasks, and snippets. It never reimplements language logic — every correctness decision (parsing, type inference, formatting rules) is delegated to the `obfusku`/`obfusku-lsp` binaries; this extension only wires their output into VS Code's UI surfaces.

### Module Map

| Module | Responsibility |
| --- | --- |
| `src/extension.ts` | Activation entry point — wires every provider, command, and the LSP client together. |
| `src/cli/run-cli.ts` | Thin `child_process` wrapper around the `obfusku` binary, reading `obfusku.path` from settings. |
| `src/lsp/` | `vscode-languageclient` wiring to `obfusku-lsp` (`client.ts`) and its status bar indicator (`status-bar.ts`). |
| `src/diagnostics/` | Diagnostic parsing (`parse-diagnostics.ts`, for the CLI's plain-text `severity: message (line:col)` format) and the CLI-backed fallback collection used by `Obfusku: Type Check File`. |
| `src/formatting/` | `DocumentFormattingEditProvider` backed by `obfusku fmt` against a temp-file copy of the buffer. |
| `src/project/` | Project discovery (`obfusku.toml`, walking upward per `ADR-017`/`ADR-020`), the `obfusku.hasProject` context key, entry-module resolution, and the optional Even Better TOML schema association. |
| `src/tasks/` | `TaskProvider` for `build`/`run` tasks — uses `CustomExecution` rather than a declarative `problemMatcher` because the CLI's diagnostics carry no filename to match against. |
| `src/commands/` | Command palette / editor-title commands (`run`, `typecheck`, `format`, `build`, `openRepl`). |
| `syntaxes/obfusku.tmLanguage.json` | TextMate grammar, one-to-one with `spec/CONCRETE_SYMBOLIC_GRAMMAR.md`'s glyph table. |
| `schemas/obfusku-toml.schema.json` | JSON Schema for `obfusku.toml`, matching `crates/obfusku-cli/src/project.rs`'s `Manifest` struct exactly. |

---

## 2. Stack Profile & Tooling

- **Runtime**: Node.js (required by the VS Code extension host — not Bun/Deno).
- **Package Manager**: npm.
- **Type Checker**: TypeScript compiler (`tsc --noEmit`), `strict: true` plus `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.
- **Formatter & Linter**: Biome (`biome format`, `biome lint`).
- **Testing**: Vitest, with a hand-rolled `vscode` module mock (`tests/mocks/vscode.ts`) so unit tests need no VS Code host. One test (`tests/task-diagnostics.test.ts`) spawns the real `obfusku` CLI — it needs `obfusku` on `PATH` to pass.
- **Bundler**: esbuild (`scripts/build.mjs`) — bundles everything except `vscode` itself into one `dist/extension.js`; required because Marketplace packages ship without `node_modules`.
- **Packaging**: `@vscode/vsce`.

---

## 3. Task Runner (`just`)

```bash
just install     # npm install
just dev         # esbuild --watch
just build       # bundle dist/extension.js
just test        # vitest run
just typecheck   # tsc --noEmit
just lint        # biome lint
just format      # biome format --write
just check       # format check + lint + typecheck + test + build (read-only, CI-safe)
just clean       # remove dist/ and any packaged .vsix
just package     # build, then vsce package
```

---

## 4. Core Architectural Invariants

1. **No reimplemented language logic.** Formatting, type checking, and diagnostics all shell out to `obfusku`/`obfusku-lsp`. If a rule from `spec/` needs enforcing, it belongs in the `obfusku` repository, not here.
2. **Diagnostics have two independent sources.** `obfusku-lsp` pushes live diagnostics for open buffers; the CLI-backed `ObfuskuDiagnostics` collection (`obfusku-check`) is only a fallback used by the explicit `Obfusku: Type Check File` command and the task provider's own `obfusku-tasks` collection — never fight over the same `DiagnosticCollection`.
3. **The CLI's diagnostic format has no filename.** `render_diagnostics_map` in `obfusku-cli` only ever prints `severity: message (line:col)`. Anything that needs to attribute a diagnostic to a file (the task provider) must resolve that file itself (`src/project/resolve-entry-file.ts`), not assume a regex can extract it.
4. **Settings, never hardcoded paths.** Both `obfusku.path` and `obfusku.lspPath` default to bare command names resolved via `PATH` — never assume a specific install location.
5. **Best-effort third-party integration fails silently.** The Even Better TOML schema association (`src/project/toml-schema.ts`) is a no-op if that extension isn't installed, or if its settings shape ever changes — it must never block this extension's own activation.

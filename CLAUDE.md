# Obfusku for VS Code — CLAUDE.md

## Repository Overview
`obfusku-vscode` is a single-package TypeScript project (Node.js, VS Code extension host). It is Monolithic — one publishable unit, no workspace tooling.

---

## 1. Repository Purpose & Architecture

Language support for [Obfusku](https://github.com/core-red-project/obfusku) inside VS Code: syntax highlighting, formatting, live diagnostics, Project-aware commands and tasks, and snippets. It never reimplements language logic — every correctness decision (parsing, type inference, formatting rules) is delegated to the `obfusku`/`obfusku-lsp` binaries; this extension only wires their output into VS Code's UI surfaces.

## Where things go

| Kind | Location |
| --- | --- |
| Activation entry point | `src/extension.ts` |
| CLI wrapper | `src/cli/run-cli.ts` |
| LSP client | `src/lsp/client.ts` |
| LSP status bar indicator | `src/lsp/status-bar.ts` |
| Diagnostic parsing & CLI fallback collection | `src/diagnostics/` |
| Document formatting provider | `src/formatting/` |
| Project discovery & context | `src/project/` |
| Task provider for build & run | `src/tasks/` |
| Commands | `src/commands/` |
| TextMate grammar | `syntaxes/obfusku.tmLanguage.json` |
| Project manifest JSON schema | `schemas/obfusku-toml.schema.json` |
| Snippets | `snippets/obfusku.json` |
| Tests (mirroring src/ path for path) | `tests/` |

---

## 2. Stack Profile & Tooling

- **Runtime**: Node.js (required by the VS Code extension host — not Bun/Deno).
- **Package Manager**: pnpm.
- **Type Checker**: TypeScript compiler (`tsc --noEmit`), `strict: true` plus `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`.
- **Formatter & Linter**: Biome (`biome format`, `biome lint`).
- **Testing**: Vitest, with a hand-rolled `vscode` module mock (`tests/mocks/vscode.ts`) so unit tests need no VS Code host.
- **Bundler**: esbuild (`scripts/build.mjs`) — bundles everything except `vscode` itself into one `dist/extension.js`; required because Marketplace packages ship without `node_modules`.
- **Packaging**: `@vscode/vsce`.

---

## 3. Task Runner (`just`)

```bash
just install     # pnpm install --frozen-lockfile
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

# Obfusku for VS Code

<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Obfusku icon" />
</p>

<p align="center">
  <strong>Highlighting ✦ Live Diagnostics ✦ Project-Aware Tasks</strong><br>
  <em>Language support for Obfusku, the symbolic ritualistic esoteric programming language, directly inside VS Code.</em>
</p>

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
[![CI](https://github.com/core-red-project/obfusku-vscode/workflows/CI/badge.svg)](https://github.com/core-red-project/obfusku-vscode/actions)

---

## Why This Extension

[Obfusku](https://github.com/core-red-project/obfusku) expresses computation through a frozen alphabet of glyphs (`λ`, `≔`, `⟡`, `▷`, `☄`, `☊`, `❧`…) rather than ASCII keywords. Without editor support, that alphabet is just unrecognized text to VS Code — no highlighting, no error feedback until you run the CLI by hand, no sense of whether a directory is a Project or a bare file.

This extension closes that gap: it never reimplements any of Obfusku's language logic itself — parsing, type inference, and formatting all stay owned by the `obfusku`/`obfusku-lsp` binaries — it only wires their real output into VS Code's native UI.

---

## Key Features

### Syntax Highlighting
A TextMate grammar built directly from `spec/CONCRETE_SYMBOLIC_GRAMMAR.md`'s glyph table — binders (`≔ ˚ ⚙︎`), control (`⟡ ☄ ☊`), base types, pattern/match syntax, and every operator at its correct precedence group.

### Live Diagnostics
`obfusku-lsp` runs as a real language server, pushing type errors, parse errors, and warnings as you type — against the unsaved buffer, not just on save.

### Formatting
Formats the current buffer through `obfusku fmt`, no save required first.

### Project Support
Recognizes `obfusku.toml` (`spec/adr/ADR-017`/`018`/`020`) the same way the CLI does — walking upward from the active file:
- `Obfusku: Build Project` and its editor-title icon appear only when the active file sits inside a Project.
- Build/Run tasks (`Terminal: Run Task` → `obfusku`) for every workspace folder with a manifest, with errors and warnings attributed to the Project's entry file and surfaced in the Problems panel.
- Schema-backed completion for `obfusku.toml` when the [Even Better TOML](https://marketplace.visualstudio.com/items?itemName=tamasfe.even-better-toml) extension is installed.

### Commands

| Command | What it does |
|---|---|
| `Obfusku: Run File` | Runs the active file with `obfusku run` and shows output |
| `Obfusku: Type Check File` | Runs `obfusku check` and refreshes diagnostics |
| `Obfusku: Format File` | Formats the active file |
| `Obfusku: Open REPL` | Opens an integrated terminal running `obfusku repl` |
| `Obfusku: Build Project` | Runs `obfusku build` (only shown inside a Project) |
| `Obfusku: Show Language Server Output` | Opens the `obfusku-lsp` output channel |

### Status Bar
Shows whether `obfusku-lsp` is running, starting, or failed to start — click it to jump straight to the server's own log.

### Snippets
Functions, bindings, type declarations (sum/record/tuple), `match`, conditionals, `raise`/`catch`, and imports.

---

## Requirements

Both `obfusku` and `obfusku-lsp` must be installed and resolvable on `PATH` — the official `install.sh` installs both together:

```bash
curl -fsSL https://raw.githubusercontent.com/core-red-project/obfusku/main/install.sh | bash
```

If they live somewhere else, point to them explicitly:

```json
{
  "obfusku.path": "/path/to/obfusku",
  "obfusku.lspPath": "/path/to/obfusku-lsp"
}
```

## Settings

| Setting | Default | Description |
|---|---|---|
| `obfusku.path` | `"obfusku"` | Path to the `obfusku` CLI executable |
| `obfusku.lspPath` | `"obfusku-lsp"` | Path to the `obfusku-lsp` language server executable |

---

## Known Limitations

- A brand-new file with no project directory on disk yet won't get diagnostics until
  it's saved once — `obfusku-lsp` resolves the project root from the file's real path.
- No hover, go-to-definition, or completion yet — `obfusku-lsp` currently implements
  `textDocument/publishDiagnostics` only.
- Build/Run tasks don't use a declarative `problemMatcher`: the CLI's plain-text
  diagnostic lines (`error: message (line:col)`) never include a filename, so a
  regex-based matcher has nothing to key on. Instead, the task provider resolves
  the Project's entry file itself and attributes diagnostics to it directly — correct
  for the common case, but a diagnostic that actually originates in an imported
  module still surfaces against the entry file, not the module that raised it.

---

## Resources & Community

- [Obfusku language repository](https://github.com/core-red-project/obfusku) — specification, ADRs, CLI, and LSP source
- [Issue Tracker & Feature Requests](https://github.com/core-red-project/obfusku-vscode/issues)
- [Contributing Guide](CONTRIBUTING.md)

---

<p align="center">
  <strong>Obfusku for VS Code</strong> — A Core Red Project<br>
  <em>&copy; 2026 Sxnnyside Project. Distributed under the MIT License.</em>
</p>

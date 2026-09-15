# Changelog

All notable changes to **Obfusku for VS Code** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- Syntax highlighting for `.obk` files via a TextMate grammar covering the
  full glyph set of `spec/CONCRETE_SYMBOLIC_GRAMMAR.md`.
- Language configuration: comments (`//`, `⌈…⌉`), bracket pairs, and
  auto-closing.
- Document formatting backed by `obfusku fmt`.
- Live diagnostics (errors, warnings, notes) via `obfusku-lsp`, updating as
  the buffer changes rather than only on save.
- Commands: `Obfusku: Run File`, `Obfusku: Type Check File`,
  `Obfusku: Format File`, `Obfusku: Open REPL`, `Obfusku: Build Project`,
  `Obfusku: Show Language Server Output`.
- Snippets for common constructs: functions, bindings, type declarations,
  match, conditionals, exceptions, imports.
- `obfusku.path` / `obfusku.lspPath` settings to point at non-`PATH`
  executables.
- Project support (`obfusku.toml`, ADR-017/018/020): a `obfusku.hasProject`
  context key gating the `Obfusku: Build Project` command and its
  editor-title icon; a JSON Schema for `obfusku.toml`, registered against
  Even Better TOML's schema associations when that extension is present;
  a `TaskProvider` contributing `build`/`run` tasks per workspace folder,
  with diagnostics attributed to the Project's resolved entry file.
- Status bar item reflecting `obfusku-lsp`'s connection state.

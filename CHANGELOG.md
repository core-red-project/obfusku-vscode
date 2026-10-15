# Changelog

All notable changes to **Obfusku for VS Code** are documented here.

This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.2.0] - 2026-10-15

### Added

- Compatibility with obfusku 1.0.0 and 1.1.0 (extension 0.1.0 targeted 1.0.0, 0.2.0 targets 1.1.0 and keeps working on 1.0.0): the installed CLI's version (`obfusku --version`) decides which features are enabled (`src/cli/cli-info.ts`).
- `Obfusku: Run Project Tests` command and a `test` task (obfusku ≥ 1.1).
- A one-time notice for a CLI older than 1.1 or newer than 1.x.
- `[test] timeout` in the `obfusku.toml` schema.
- CI runs the quality gate against obfusku 1.0.0 and 1.1.0.
- `tests/lsp`: drives the real `obfusku-lsp` over stdio, against whichever 1.0.x or 1.1.x pair is selected.
- Complete TextMate grammar expansion:
  - Numeric literals support for hex (`0x...`), binary (`0b...`), octal (`0o...`), underscored digit separators, and scientific floats.
  - Unicode escape sequences (`\u{...}`).
  - Exception declaration keyword (`☈`).
  - Primitive and bytes types (`⌭`).
  - Host function calls (`⌁[↑↓↯⍰⊕⊖⇄⧉]?[⌬⌥⎈⍉⌂⌭⎙⎚⌖⧗⧖⚀⚁]?`) and bytes operators (`⌭[#⌷⍪⊠⇋⇌⌕⌘⍕]`).
  - Comprehensive combinators: collection (`⟐⌿⌽⊡⊟⊞#⊙⊕⍪⌷⍳⊠⍋⇋⇌⍬⊎⊖⌕⊛⌸⌹⍭⊌⊝∈⊚⌻`), text (`⫽⫴⌫∋⍴⊏↦⇝⌶⍂⌯⌮⇧⇩⤳⊢⊣⍸`), numeric (`∥⋆⊓⊔⊗∼⋘⋙⊥⊤√⌊⌃⌾⋇ℯℓ∿∾∠⍥∦ϖ∞`), and conversions (`↗↘⍕⚑`).
  - Extended constructors (`⊘⁝⦰⧫✓✗⌑➤◇`) and punctuation accessor (`.`).
- Structured JSON diagnostic parsing (`parseJsonDiagnostics`):
  - Consumes single-line structured reports from `obfusku check --json`.
  - Maps diagnostics accurately to 0-based character ranges.
  - Automatically isolates imported module errors to prevent attribution to the wrong line of the entry file.
- Task provider (`ObfuskuTaskTerminal`) error handling:
  - Build and Run tasks query structured `--json` diagnostics when non-zero exit codes occur, avoiding stderr text misattributions.
  - Diagnostics are cleared cleanly when tasks succeed.
- Sxnnyside Developer Experience alignment (100.0 Excellence):
  - Canonical Biome formatter profile.
  - Strict text normalization via `.editorconfig` and `.gitattributes`.
  - Modern dev tooling on `pnpm` and TypeScript 7.0 baseline.
  - Automated Git hooks via Husky enforcing `just check` and Conventional Commits.
  - Grouped Dependabot configuration in `.github/dependabot.yml`.
  - Automated release pipeline with SemVer verification, `git-cliff` changelog generation, and SHA256 integrity checksums.
  - Refactored test suite in `tests/` mirroring `src/` path for path.

### Fixed

- With obfusku 1.0.x, `Type Check File` and the live fallback reported no errors at all: 1.0 reads `--json` as a file name. A 1.0 CLI is now asked for text.
- With obfusku 1.0.x, format-on-save deleted every comment. Formatting is disabled for 1.0.x, with a warning.
- Fixed Biome `useOptionalChain` warning in `src/commands/commands.ts`.

## [0.1.0] - 2026-10-15

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

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-05-16

### Added

- Repository initialized with full project scaffold
- `package.json` with all commands, keybindings, configuration, and views per SPEC.md §19
- TypeScript strict mode configuration (`tsconfig.json`)
- esbuild bundler (`esbuild.js`) with `--production` flag for minification
- ESLint Flat Config with `@typescript-eslint/recommended` rules
- Prettier configuration (singleQuote, trailingComma: all, printWidth: 100)
- husky + lint-staged pre-commit hook (lint + format on staged `.ts` files)
- `.vscode/launch.json` for Extension Development Host debugging
- `.vscode/tasks.json` with watch build task
- Directory structure per SPEC.md §18 (all placeholder files in place)
- `src/extension.ts` — minimal activate/deactivate stub
- `src/types/htb.ts` — HTB API response type definitions
- `src/types/findings.ts` — EnumFinding and CommandLogEntry types
- `src/utils/logger.ts` — OutputChannel-based logger
- `src/utils/config.ts` — typed configuration accessors
- `src/utils/mask.ts` — sensitive data masking (flags, passwords, SSH keys)
- `src/utils/i18n.ts` — l10n wrapper
- Service and view placeholder stubs for all Phase 1-4 modules
- Test suite scaffold with Mocha (`src/test/suite/`)
- Workspace templates (`resources/templates/`)
- l10n stubs (`l10n/`)
- GitHub Actions CI workflow (Ubuntu / macOS / Windows matrix)
- GitHub Actions security, release, and nightly workflow stubs
- Issue templates (bug report, feature request)
- `FUNDING.yml`, `SECURITY.md`, `CONTRIBUTING.md`
- Activity Bar SVG icon (`media/htb-companion.svg`)

[0.0.1]: https://github.com/long-910/vscode-htb-companion/releases/tag/v0.0.1

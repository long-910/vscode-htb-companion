# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-16

### Added

- `services/htbApi.ts` — full HTB v4 API client with typed response models, error classes
  (`HtbAuthError`, `HtbRateLimitError`, `HtbApiError`), and all Phase 1 endpoints
- `services/auth.ts` — `AuthService` using `vscode.SecretStorage`; sign-in flow opens
  HTB Settings URL, validates token, restores session on activation
- `services/workspace.ts` — `WorkspaceService` scaffolds `standard` template workspace
  (`~/.htb/<box-name>/`) with `.htb/`, `.vscode/`, `scans/`, `loot/` and template substitution
- `services/vpn.ts` — `VpnService` managing OpenVPN subprocess; binary auto-detection for
  Linux/macOS/Windows, elevation strategy selection (sudo/pkexec/osascript/runas/none),
  process health-check, password masking in logs, `.ovpn` script-security warning
- `views/statusBar.ts` — `StatusBarManager` with 4 status bar items: account, VPN,
  active box, flag progress
- `views/machinesTree.ts` — three VS Code `TreeDataProvider` implementations:
  `ProfileProvider`, `ActiveMachineProvider` (with flag status + expiry children),
  `MachinesListProvider`
- `commands/auth.ts` — `htb.signIn`, `htb.signOut`, `htb.refresh`, VPN connect/disconnect
- `commands/machines.ts` — `htb.spawnMachine`, `htb.terminateMachine`, `htb.resetMachine`,
  `htb.openBoxWorkspace`, `htb.copyTargetIp`, `htb.openMachineInBrowser`
- `commands/flags.ts` — `htb.submitFlag` with difficulty rating and flag status refresh
- `extension.ts` — full `activate()` wiring all services, views, and session restore
- `src/test/suite/htbApi.test.ts` — 8 unit tests for API client (fetch stubbing with sinon)
- `src/test/suite/workspace.test.ts` — 2 integration tests for workspace scaffold in tmpdir
- `src/test/suite/vpn.test.ts` — 2 unit tests for elevation strategy detection

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

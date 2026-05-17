# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.0] - 2026-05-17

### Added

- Phase 5: Enumeration Visualizer, Screenshot Capture, Pwnbox SSH
- `htb.enum.showVisualizer` — Webview panel showing an interactive Enumeration Map: ports/services table, directories, subdomains, users/creds, CVEs, and generated Mermaid graph syntax (copy button included)
- Screenshot auto-capture on `htb.terminal.captureCommand` — macOS (`screencapture -i`), Linux (`scrot -s` / `gnome-screenshot -a`), Windows (PowerShell); saved under `screenshots/` in the box workspace; respects `htb.writeup.captureScreenshots` setting
- `htb.pwnbox.configSsh` — fetches Pwnbox SSH info from HTB API, writes `~/.ssh/config` Host block (`htb-pwnbox`), offers one-click Remote-SSH connect or copy SSH command

## [0.4.0] - 2026-05-17

### Added

- Phase 4: Writeup Export
- `htb.writeup.draft` — populate `writeup.md` from captured commands (grouped by section tag), enumeration findings, box metadata, and notes; opens the file in editor
- `htb.writeup.exportMarkdown` — same as draft but saves to a user-chosen path via save dialog
- `CommandLogEntry.section` field — section tag (recon / enumeration / foothold / privesc / loot) is now persisted in `.htb/commands.jsonl`

### Fixed

- macOS VPN: pre-create log/pid files as user-owned so root-run OpenVPN can write while the extension retains read access
- macOS VPN: reverted to osascript GUI password dialog (dropped terminal approach)
- macOS VPN: 180 s poll timeout; TLS Error no longer stops polling prematurely
- macOS VPN: final log check at timeout boundary to catch late completions
- Extension icon set to `images/icon.png`

## [0.3.0] - 2026-05-17

### Added

- `services/ai.ts` — `AiService` wrapping VS Code Language Model API; auto-selects available
  model (GitHub Copilot or Claude extension); `buildContextPayload` assembles token-capped
  context (≤ 12 000 chars) from machine metadata, findings, and command history
- Hint-level system prompts: `nudge` / `tactic` / `ttp` / `poc` — controls how explicit AI
  responses are
- `htb.ai.confirmBeforeSend` setting — shows a Webview review panel before transmitting context
  to the AI model; sensitive values (flags, passwords, SSH keys) are masked in the preview
- `commands/ai.ts` — `registerAiCommands`:
  - `htb.ai.suggestNext` (`Ctrl+Alt+N`) — asks "what to investigate next" with full context
  - `htb.ai.analyzeOutput` — sends selected editor text or clipboard content for analysis
  - `htb.ai.askContext` — free-form question about the current box
  - `htb.ai.setHintLevel` — QuickPick to change hint level without opening settings
- AI result shown in a VS Code Webview panel beside the editor (no output channel noise)
- `src/test/suite/ai.test.ts` — 8 unit tests covering context payload building, masking,
  truncation, and null-machine handling

### Changed

- `views/machinesTree.ts` — `ActiveMachineProvider` now exposes `activeMachine` getter
- `utils/config.ts` — added `getAiContextMode()` helper
- `extension.ts` — wired `AiService` and `registerAiCommands`
- `package.json` — added `htb.ai.confirmBeforeSend` setting and `htb.ai.setHintLevel` command

## [0.2.0] - 2026-05-16

### Added

- `services/parsers/nmap.ts` — `parseNmapText` (ports, OS detection, HTTP title notes) and
  `parseNmapXml` (regex-based XML port extraction)
- `services/parsers/gobuster.ts` — `parseGobusterOutput` auto-detecting dir/dns/vhost mode;
  filters non-interesting HTTP status codes
- `services/parsers/ffuf.ts` — `parseFfufJson` (full JSON output with vhost vs directory
  detection from FUZZ value pattern) and `parseFfufText` (plain text best-effort parse)
- `services/commandHistory.ts` — `CommandHistoryService` persisting command log entries to
  `.htb/commands.jsonl`; `htb.terminal.captureCommand` with section tagging
- `views/enumPanel.ts` — `EnumerationProvider` tree view with category grouping, deduplication,
  confidence icons; `importOutputToFindings` auto-detects parser from content
- `views/machinesTree.ts` — `RetiredMachinesProvider` with page-by-page loading,
  `StartingPointProvider` with Tier 1/2/3 sections, `RecentBoxesProvider` (persisted to
  `globalState`)
- `commands/enum.ts` — `htb.enum.importNmap` (file picker → auto-detect parser),
  `htb.enum.addFinding` (QuickPick type + InputBox value), `htb.enum.copyFinding`,
  `htb.enum.showVisualizer` (Phase 4 placeholder)
- `htb.machines.loadMoreRetired` command for retired machine pagination
- `services/workspace.ts` — `getBoxDir(name)` helper method
- `src/test/suite/parsers.test.ts` — 28 unit tests covering nmap text/XML, gobuster
  dir/dns/vhost, ffuf JSON/text parsers

### Changed

- `extension.ts` — wired `EnumerationProvider`, `CommandHistoryService`, and
  `registerEnumCommands`; added `RetiredMachinesProvider`, `StartingPointProvider`,
  `RecentBoxesProvider` registrations; loads Starting Point Tier 1-3 and retired page 1 on
  session restore; sets `commandHistory` workspace when active machine is present
- `commands/machines.ts` — `registerMachineCommands` now accepts `RecentBoxesProvider`; updates
  recent boxes and persists to `globalState` after opening a workspace

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

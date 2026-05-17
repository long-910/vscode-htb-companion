# Contributing to HTB Companion

English | [日本語](./docs/CONTRIBUTING.ja.md) | [简体中文](./docs/CONTRIBUTING.zh-CN.md)

Thank you for your interest in contributing! This document covers everything you need to get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Conventions](#coding-conventions)
- [Commit and PR Guidelines](#commit-and-pr-guidelines)
- [Running Tests](#running-tests)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)
- [Security Vulnerabilities](#security-vulnerabilities)

---

## Code of Conduct

Be respectful and constructive. This extension is used in a security-research context; contributions that automate active attacks against targets, exfiltrate data, or circumvent HTB's terms of service will be rejected.

---

## How to Contribute

| Path | Examples |
|---|---|
| **Bug fix** | Fix a crash, wrong API call, broken VPN parse |
| **Feature** | New HTB API surface, new panel, new export format |
| **Documentation** | Improve README, add missing config docs |
| **Localization** | Add or fix translations under `l10n/` |
| **Tests** | Increase coverage for a service or command |

For anything beyond a trivial fix, open an issue first so we can agree on scope before you invest time.

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 20
- [VS Code](https://code.visualstudio.com/) ≥ 1.95
- An HTB App Token (for manual testing against the live API)

### Install & Build

```sh
git clone https://github.com/long-910/vscode-htb-companion.git
cd vscode-htb-companion
npm install
npm run compile
```

### Run in Extension Development Host

Press `F5` in VS Code (or run **Run Extension** from the Run panel). This opens a new VS Code window with the extension loaded.

### Watch Mode

```sh
npm run watch
```

Both `esbuild` and `tsc` run in parallel and rebuild on save.

### Packaging a `.vsix` for Manual Testing

When you need to install the extension in a real VS Code window (not the Extension Development Host), build a `.vsix` package locally.

**Debug build** — includes source maps, skips minification:

```sh
npm run compile          # type-check + lint + esbuild (debug mode)
npx vsce package --no-dependencies
```

**Production build** — minified, no source maps (mirrors what is published):

```sh
npm run package          # type-check + lint + esbuild --production
npx vsce package --no-dependencies
```

Both commands emit a file named `vscode-htb-companion-<version>.vsix` in the project root.

**Install the `.vsix` into VS Code:**

```sh
code --install-extension vscode-htb-companion-<version>.vsix
```

Or drag-and-drop the file onto the Extensions panel. Reload VS Code after installing.

> The debug build's source maps let you see original TypeScript file names and line numbers in the **Developer Tools** console (`Help → Toggle Developer Tools`).

---

## Project Structure

```
src/
  commands/        # One file per command group (ai, enum, machine, vpn, …)
  services/        # Stateful singletons (HtbApiClient, AiService, VpnService, …)
  providers/       # VS Code TreeDataProvider implementations
  views/           # Webview panels (visualizer, writeup, …)
  types/           # Shared TypeScript interfaces and enums
  extension.ts     # Entry point — registers all providers and commands
l10n/              # Localization bundles
media/             # Icons used inside webviews
resources/         # Static assets packaged with the extension
docs/              # Extra documentation (CONTRIBUTING translations, SPEC, …)
```

---

## Coding Conventions

- **TypeScript strict mode** — `tsconfig.json` has `"strict": true`. No `any` without a comment explaining why.
- **ESLint + Prettier** — run `npm run lint:fix` and `npm run format` before committing. The pre-commit hook (husky + lint-staged) enforces this automatically.
- **No active security tooling** — the extension must never spawn nmap, gobuster, ffuf, or similar tools on behalf of the user. Read output files; do not produce them.
- **No comments for obvious code** — only add a comment when the *why* is non-obvious (hidden constraint, subtle invariant, known workaround).
- **Keep services stateful, commands thin** — business logic lives in `src/services/`; commands are thin glue that call services and update the UI.

---

## Commit and PR Guidelines

- Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`, etc.
- Keep commits focused — one logical change per commit.
- PR title should match the commit type and be ≤ 72 characters.
- Fill in the PR template fully; incomplete PRs may be closed without review.
- All CI checks must pass before merge.

---

## Running Tests

```sh
npm test
```

This compiles the test suite and runs it inside a VS Code extension host via `@vscode/test-electron`. Tests live in `src/test/`.

To run only type-checking without tests:

```sh
npm run check-types
```

---

## Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template. Include:

- VS Code version
- Extension version
- Steps to reproduce
- Expected vs. actual behavior
- Relevant output from the **HTB Companion** Output channel

---

## Requesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) issue template. Describe the problem you are solving, not just the solution you have in mind. Features that require executing security tools on behalf of the user will not be accepted.

---

## Security Vulnerabilities

**Do not open a public issue.** Report via [GitHub Security Advisories](https://github.com/long-910/vscode-htb-companion/security/advisories/new). See [SECURITY.md](./SECURITY.md) for the full policy.

---

## License

By contributing you agree that your contributions will be licensed under the [MIT License](./LICENSE).

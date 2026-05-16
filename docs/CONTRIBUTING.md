# Contributing

## Development Setup

```bash
git clone https://github.com/long-910/vscode-htb-companion
cd vscode-htb-companion
npm install
```

Press `F5` in VS Code to launch the Extension Development Host.

## Branch Strategy

- `main` — stable, tagged releases only
- `feat/*` — new features
- `fix/*` — bug fixes

Open a PR against `main` with a clear description.

## Code Style

- TypeScript strict mode
- ESLint + Prettier enforced via pre-commit hook
- No runtime dependencies (devDependencies only)
- Files over 400 lines should be split

## Commit Convention

Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

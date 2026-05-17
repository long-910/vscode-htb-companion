English | [日本語](./README.ja.md) | [简体中文](./README.zh-CN.md)

# HTB Companion

[![CI](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=long-kudo.vscode-htb-companion)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Registry-purple)](https://open-vsx.org/extension/long-kudo/vscode-htb-companion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Hack The Box integration for VS Code** — manage machines, track findings, get AI hints, and export writeups without leaving your editor.

---

## Concept

HTB Companion is a **companion tool**, not an attack tool.

It does **not** execute nmap, gobuster, ffuf, or any other security tool on your behalf. It does **not** send exploit payloads, perform automated scanning, or interact with target machines directly.

What it does is organize your workflow:

- It **reads** output files that you produced by running tools yourself in the terminal.
- It **manages** your HTB session (VPN, machine spawn/terminate, flag submission) via the official HTB API.
- It **scaffolds** a structured workspace so notes, scan results, and credentials stay organized.
- It **assists** with AI hints using context you explicitly provide — with sensitive values masked before transmission.

All active interaction with a target machine happens in **your terminal**, under **your control**.

---

## Features

| Area | What you get |
|---|---|
| **Auth & Profile** | Sign in with your HTB App Token; profile and rank shown in sidebar |
| **Machine Management** | Browse Active / Retired (paginated) / Starting Point (Tier 1-3); spawn, terminate, reset |
| **VPN** | Launch and monitor OpenVPN from within VS Code; auto-detects binary and elevation strategy |
| **Workspace Scaffold** | One command creates a structured box directory with pre-filled `notes.md`, scan folders, VS Code tasks, and `HTB_TARGET` env var |
| **Enumeration Panel** | Import nmap / gobuster / ffuf output → auto-parsed findings grouped by category (ports, directories, subdomains, users, CVEs, notes) |
| **Enumeration Visualizer** | Webview map of all findings with auto-generated Mermaid graph syntax and MITRE ATT&CK tactic mapping |
| **Command History** | Capture terminal commands with section tags (recon / foothold / privesc / loot); persisted to `.htb/commands.jsonl`; optional screenshot auto-capture |
| **AI Assistant** | Suggest next step, analyze output, ask context questions — powered by VS Code Language Model API (GitHub Copilot or Claude extension); configurable hint levels |
| **Writeup Export** | Draft `writeup.md` populated from captured commands, findings, box metadata, and notes; export to any path via save dialog |
| **Sherlocks (DFIR)** | Browse HTB Sherlocks challenges grouped by category with difficulty icons and solved status |
| **Pwnbox SSH** | Fetch Pwnbox SSH info from HTB API and auto-configure `~/.ssh/config` for one-click Remote-SSH connect |
| **Recent Boxes** | Sidebar list of recently opened workspaces with one-click re-open |
| **Status Bar** | Live VPN status, active machine name + IP, flag progress |

---

## Requirements

| Dependency | Notes |
|---|---|
| **VS Code** ≥ 1.95 | |
| **HTB App Token** | Generate at [app.hackthebox.com/account-settings](https://app.hackthebox.com/account-settings) → *App Tokens* |
| **OpenVPN** | Required for VPN features. Install via your OS package manager or from [openvpn.net](https://openvpn.net/community-downloads/). OpenVPN Connect (GUI) is **not** supported. |
| **.ovpn file** | Download from HTB → *Labs* → *Access* |
| **AI extension** *(optional)* | [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) or [Claude for VS Code](https://marketplace.visualstudio.com/items?itemName=Anthropic.claude-code) for AI hint features |

---

## Quick Start

### 1. Install

Search **"HTB Companion"** in the VS Code Extensions panel, or install from the command line:

```sh
code --install-extension long-kudo.vscode-htb-companion
```

### 2. Sign In

Open the Command Palette (`Ctrl+Shift+P`) and run:

```
HTB: Sign In
```

The extension opens your HTB Account Settings page. Create an App Token, paste it into the prompt, and press **Enter**. Your profile and rank will appear in the HTB sidebar.

### 3. Connect VPN

1. Place your `.ovpn` file in `~/htb/vpn/` (or set `htb.vpn.configDirectory` in settings).
2. Run **HTB: Connect VPN** from the Command Palette.
3. The status bar shows `$(radio-tower) VPN ✓` when the tunnel is up.

### 4. Spawn a Machine and Open its Workspace

1. Pick a machine from the **Machines** tree in the HTB sidebar.
2. Right-click → **Spawn Machine** (or run `HTB: Spawn Machine`).
3. Once spawned, right-click the machine → **Open Box Workspace**.

A directory is created at `~/htb/<box-name>/` with the structure below, and VS Code opens it as a workspace.

```
~/htb/<box-name>/
├── .htb/
│   ├── box.json          ← metadata (id, name, os, difficulty, ip)
│   ├── commands.jsonl    ← captured command log
│   └── findings.json     ← structured findings
├── .vscode/
│   ├── settings.json     ← HTB_TARGET env var pre-set
│   └── tasks.json        ← nmap / gobuster task shortcuts
├── notes.md              ← pre-filled recon template
├── writeup.md            ← writeup draft template
├── scans/
│   ├── nmap/
│   ├── web/
│   └── smb/
├── screenshots/          ← auto-saved screenshots (Capture Command)
└── loot/
    └── credentials.md
```

---

## Core Workflows

### Importing Scan Results

After running nmap, gobuster, or ffuf, import the output directly into the **Enumeration** panel:

1. Run **HTB: Import Scan Output** (`Ctrl+Shift+P` → `HTB: Import Scan Output`).
2. Select the output file (`.txt`, `.xml`, `.json`, `.gnmap`).
3. The extension auto-detects the tool and populates the Enumeration tree with grouped findings.

**Supported formats:**

| Tool | Format |
|---|---|
| nmap | Text (`-oN`) and XML (`-oX`) |
| gobuster | `dir`, `dns`, and `vhost` text output |
| ffuf | JSON (`-of json`) and plain text |

You can also add findings manually: right-click the Enumeration panel → **Add Finding**.

### Enumeration Visualizer

After importing findings, run **HTB: Show Enumeration Visualizer** to open a Webview panel that shows:

- **Ports & Services** table with protocol, service name, and version
- **Directories, Subdomains, Users, CVEs, Notes** grouped by type
- **MITRE ATT&CK Mapping** — tactics and techniques inferred from your findings (verify manually)
- **Mermaid Syntax** — copy-pasteable graph definition for Mermaid Live Editor or Obsidian

### Capturing Commands for Your Writeup

Press `Ctrl+Alt+C` (or run **HTB: Capture Command for Writeup**) to log any command with a section tag. On macOS and Linux, an interactive screenshot is offered automatically (drag to select region). The entry is appended to `.htb/commands.jsonl`.

### AI Assistant

With GitHub Copilot or the Claude extension installed:

| Command | Shortcut | Description |
|---|---|---|
| Suggest Next Step | `Ctrl+Alt+N` | Ask "what should I investigate next?" with full box context |
| Analyze Output | — | Send selected text or clipboard content for analysis |
| Ask About Current Box | — | Free-form question about the active machine |
| Set AI Hint Level | — | Toggle between `nudge` / `tactic` / `ttp` / `poc` detail levels |

Sensitive values (flags, passwords, SSH keys) are automatically masked before any context is sent. Enable `htb.ai.confirmBeforeSend` to review the full payload in a Webview before sending.

### Exporting Your Writeup

1. Run **HTB: Draft Writeup** — populates `writeup.md` with your captured commands grouped by phase, imported findings, box metadata, and notes.
2. Review and edit `writeup.md`.
3. Run **HTB: Export Writeup (Markdown)** to save to any path via a save dialog.

### Sherlocks (DFIR)

The **Sherlocks** panel in the sidebar lists all HTB Sherlocks challenges grouped by category (Forensics, Malware Analysis, Threat Hunting, etc.). Click a challenge to open it in your browser or download the case files.

### Submitting Flags

Press `Ctrl+Alt+F` (or run **HTB: Submit Flag**), enter the flag, and rate the difficulty. The Active Machine tree updates to show which flags are owned.

### Pwnbox SSH

Run **HTB: Configure Pwnbox SSH** to automatically fetch your Pwnbox connection details and write a `Host htb-pwnbox` block to `~/.ssh/config`. Then connect with one click via the Remote-SSH extension.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Alt+F` | Submit Flag |
| `Ctrl+Alt+I` | Copy Target IP |
| `Ctrl+Alt+C` | Capture Command for Writeup |
| `Ctrl+Alt+N` | AI: Suggest Next Step |

---

## Commands Reference

| Command | Description |
|---|---|
| `HTB: Sign In` | Authenticate with your HTB App Token |
| `HTB: Sign Out` | Clear stored token |
| `HTB: Refresh` | Reload profile, machine list, and status bar |
| `HTB: Spawn Machine` | Spawn the selected machine |
| `HTB: Terminate Machine` | Terminate the active machine |
| `HTB: Reset Machine` | Reset the active machine to its initial state |
| `HTB: Open Box Workspace` | Scaffold and open the workspace for a machine |
| `HTB: Submit Flag` | Submit user or root flag with difficulty rating |
| `HTB: Copy Target IP` | Copy active machine IP to clipboard |
| `HTB: Open in Browser` | Open machine page on hackthebox.com |
| `HTB: Connect VPN` | Launch OpenVPN with the selected `.ovpn` file |
| `HTB: Disconnect VPN` | Stop the VPN tunnel |
| `HTB: Select VPN Server` | Choose a different `.ovpn` file |
| `HTB: Import Scan Output` | Parse nmap / gobuster / ffuf file → Enumeration panel |
| `HTB: Add Finding` | Manually add a finding to the Enumeration panel |
| `HTB: Show Enumeration Visualizer` | Open Webview with findings map and MITRE ATT&CK table |
| `HTB: Capture Command for Writeup` | Log a command with section tag (+ optional screenshot) |
| `HTB AI: Suggest Next Step` | AI-powered next step suggestion (`Ctrl+Alt+N`) |
| `HTB AI: Analyze Output` | Send selected text / clipboard to AI for analysis |
| `HTB AI: Ask About Current Box` | Free-form AI question about the active box |
| `HTB AI: Set AI Hint Level` | Toggle hint verbosity (nudge / tactic / ttp / poc) |
| `HTB: Draft Writeup` | Populate `writeup.md` from commands, findings, and notes |
| `HTB: Export Writeup (Markdown)` | Save writeup to a chosen path via save dialog |
| `HTB: Configure Pwnbox SSH` | Write `~/.ssh/config` entry for Pwnbox and connect |
| `HTB: Refresh Sherlocks` | Reload Sherlocks challenge list from HTB API |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `htb.workspaceRoot` | `~/htb` | Root directory where box workspaces are created |
| `htb.workspaceTemplate` | `standard` | Scaffold template: `minimal`, `standard`, `full` |
| `htb.vpn.openvpnPath` | *(auto)* | Path to `openvpn` binary; auto-detected from PATH if empty |
| `htb.vpn.configDirectory` | `~/htb/vpn` | Directory containing `.ovpn` files |
| `htb.vpn.defaultConfig` | *(none)* | Default `.ovpn` file used by Connect VPN without a prompt |
| `htb.vpn.elevationStrategy` | `auto` | Privilege escalation: `auto`, `sudo`, `pkexec`, `none`, `windows-uac` |
| `htb.vpn.autoDisconnectOnTerminate` | `false` | Disconnect VPN when terminating a machine |
| `htb.vpn.healthCheckIntervalSec` | `10` | VPN health check interval (seconds) |
| `htb.ai.provider` | `auto` | AI provider: `auto`, `copilot`, `claude`, `off` |
| `htb.ai.hintLevel` | `nudge` | Hint verbosity: `nudge`, `tactic`, `ttp`, `poc` |
| `htb.ai.contextMode` | `current-box` | Context sent to AI: `minimal`, `current-box`, `full-history` |
| `htb.ai.confirmBeforeSend` | `false` | Show context review panel before sending to AI |
| `htb.enum.autoImportFromTerminal` | `true` | Auto-parse scan output detected in terminal |
| `htb.writeup.captureScreenshots` | `true` | Auto-capture screenshot on Capture Command |
| `htb.writeup.passwordProtect` | `false` | Encrypt writeup output (for HTB Retired Machine policy) |
| `htb.telemetry` | `false` | Anonymous telemetry (off by default) |

---

## VPN Notes

- **Linux**: elevation via `sudo` or `pkexec` (auto-detected).
- **macOS**: elevation via `osascript` (GUI password dialog); 180 s connect timeout.
- **Windows**: elevation via `runas` (UAC prompt). Requires [OpenVPN Community](https://openvpn.net/community-downloads/), not OpenVPN Connect.
- `.ovpn` files with `script-security 2` or higher will show a warning — expected for HTB config files.

---

## Security

- Your HTB App Token is stored in **VS Code's Secret Storage** (OS keychain) — never in settings or plaintext files.
- Passwords and flags are masked in all logs and output panels.
- AI context is masked for flags, passwords, and SSH keys before transmission.
- Telemetry is **off by default**.

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure policy.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```sh
git clone https://github.com/long-910/vscode-htb-companion.git
cd vscode-htb-companion
npm install
npm run watch       # build in watch mode
# Press F5 in VS Code to launch the Extension Development Host
```

---

## Support

If you find this extension useful, consider supporting development:

- [GitHub Sponsors](https://github.com/sponsors/long-910)
- [Ko-fi](https://ko-fi.com/long910)

---

## License

[MIT](LICENSE) © long-910

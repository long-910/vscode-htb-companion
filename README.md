English | [日本語](./README.ja.md) | [简体中文](./README.zh-CN.md)

# HTB Companion

[![CI](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=long-kudo.vscode-htb-companion)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Registry-purple)](https://open-vsx.org/extension/long-kudo/vscode-htb-companion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Hack The Box integration for VS Code** — manage machines, track findings, capture commands, and scaffold box workspaces without leaving your editor.

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
| **Command History** | Capture terminal commands with section tags (recon / foothold / privesc / loot); persisted to `.htb/commands.jsonl` |
| **Recent Boxes** | Sidebar list of recently opened workspaces with one-click re-open |
| **Status Bar** | Live VPN status, active machine name + IP, flag progress |

> **Roadmap**: AI hints (Phase 3) and writeup export (Phase 4) are coming in future releases.

---

## Requirements

| Dependency | Notes |
|---|---|
| **VS Code** ≥ 1.90 | |
| **HTB App Token** | Generate at [app.hackthebox.com/account-settings](https://app.hackthebox.com/account-settings) → *App Tokens* |
| **OpenVPN** | Required for VPN features. Install via your OS package manager or from [openvpn.net](https://openvpn.net/community-downloads/). OpenVPN Connect (GUI) is **not** supported. |
| **.ovpn file** | Download from HTB → *Labs* → *Access* |

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

### Capturing Commands for Your Writeup

Press `Ctrl+Alt+C` (or run **HTB: Capture Command for Writeup**) to log any command with a section tag. The entry is appended to `.htb/commands.jsonl` and can be included in your writeup later.

### Submitting Flags

Press `Ctrl+Alt+F` (or run **HTB: Submit Flag**), enter the flag, and rate the difficulty. The Active Machine tree updates to show which flags are owned.

### Copying the Target IP

Press `Ctrl+Alt+I` to copy the active machine's IP to your clipboard.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Alt+F` | Submit Flag |
| `Ctrl+Alt+I` | Copy Target IP |
| `Ctrl+Alt+C` | Capture Command for Writeup |
| `Ctrl+Alt+N` | Suggest Next Step *(Phase 3, coming soon)* |

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
| `HTB: Capture Command for Writeup` | Log a command with a section tag |

---

## Settings

| Setting | Default | Description |
|---|---|---|
| `htb.workspaceRoot` | `~/htb` | Root directory where box workspaces are created |
| `htb.workspaceTemplate` | `standard` | Scaffold template: `minimal` (notes only), `standard` (notes + scans + loot), `full` (adds exploits + screenshots) |
| `htb.vpn.openvpnPath` | *(auto)* | Path to `openvpn` binary. Auto-detected from PATH if empty |
| `htb.vpn.configDirectory` | `~/htb/vpn` | Directory containing `.ovpn` files |
| `htb.vpn.defaultConfig` | *(none)* | Default `.ovpn` file used by Connect VPN without a prompt |
| `htb.vpn.elevationStrategy` | `auto` | Privilege escalation method: `auto`, `sudo`, `pkexec`, `none`, `windows-uac` |
| `htb.vpn.autoDisconnectOnTerminate` | `false` | Disconnect VPN automatically when terminating a machine |
| `htb.vpn.healthCheckIntervalSec` | `10` | How often to check VPN tunnel health (seconds) |
| `htb.enum.autoImportFromTerminal` | `true` | Automatically parse scan output detected in the terminal |
| `htb.telemetry` | `false` | Anonymous telemetry (off by default) |

---

## VPN Notes

- **Linux**: elevation via `sudo` or `pkexec` (auto-detected). Run without elevation if already root.
- **macOS**: elevation via `osascript` (GUI password prompt).
- **Windows**: elevation via `runas` (UAC prompt). Requires the [OpenVPN Community](https://openvpn.net/community-downloads/) installer, not OpenVPN Connect.
- `.ovpn` files with `script-security 2` or higher will show a warning — this is expected for HTB config files.

---

## Security

- Your HTB App Token is stored in **VS Code's Secret Storage** (OS keychain) — never in settings or plaintext files.
- Passwords and flags are masked in all logs and output panels.
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

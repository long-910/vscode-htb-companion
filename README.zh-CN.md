[English](./README.md) | [日本語](./README.ja.md) | 简体中文

# HTB Companion

[![CI](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=long-kudo.vscode-htb-companion)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Registry-purple)](https://open-vsx.org/extension/long-kudo/vscode-htb-companion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Hack The Box 的 VS Code 集成扩展** — 无需离开编辑器，即可管理靶机、追踪发现、记录命令并自动创建靶机工作区。

---

## 功能列表

| 功能 | 说明 |
|---|---|
| **认证与个人资料** | 使用 HTB App Token 登录，侧边栏显示个人资料和段位 |
| **靶机管理** | 浏览 Active / Retired（分页）/ Starting Point（Tier 1-3）；启动、终止、重置靶机 |
| **VPN** | 在 VS Code 内启动并监控 OpenVPN；自动检测可执行文件和提权方式 |
| **工作区自动生成** | 一条命令创建包含预填 `notes.md`、扫描目录、VS Code 任务和 `HTB_TARGET` 环境变量的靶机目录 |
| **枚举面板** | 导入 nmap / gobuster / ffuf 输出 → 自动解析并按类别（端口、目录、子域名、用户、CVE、笔记）分组显示 |
| **命令历史** | 为终端命令打上分段标签（recon / foothold / privesc / loot）并记录，持久化到 `.htb/commands.jsonl` |
| **近期靶机** | 侧边栏显示最近打开的工作区，一键重新打开 |
| **状态栏** | 实时显示 VPN 状态、当前靶机名称与 IP、Flag 获取进度 |

> **路线图**：AI 提示（Phase 3）和 Writeup 导出（Phase 4）将在后续版本中推出。

---

## 环境要求

| 依赖项 | 说明 |
|---|---|
| **VS Code** ≥ 1.90 | |
| **HTB App Token** | 在 [app.hackthebox.com/account-settings](https://app.hackthebox.com/account-settings) → *App Tokens* 中生成 |
| **OpenVPN** | VPN 功能所需。通过系统包管理器或 [openvpn.net](https://openvpn.net/community-downloads/) 安装。**不支持** OpenVPN Connect（GUI 版）|
| **.ovpn 文件** | 从 HTB → *Labs* → *Access* 下载 |

---

## 快速开始

### 1. 安装

在 VS Code 扩展面板搜索 **"HTB Companion"**，或通过命令行安装：

```sh
code --install-extension long-kudo.vscode-htb-companion
```

### 2. 登录

打开命令面板（`Ctrl+Shift+P`）并执行：

```
HTB: Sign In
```

扩展将自动打开 HTB 账户设置页面。创建 App Token 后粘贴到输入框，按 **Enter** 确认。HTB 侧边栏将显示您的个人资料和段位。

### 3. 连接 VPN

1. 将 `.ovpn` 文件放到 `~/htb/vpn/` 目录（或在设置中修改 `htb.vpn.configDirectory`）。
2. 在命令面板执行 **HTB: Connect VPN**。
3. 状态栏显示 `VPN ✓` 时表示隧道已建立。

### 4. 启动靶机并打开工作区

1. 在 HTB 侧边栏的 **Machines** 树中选择靶机。
2. 右键 → **Spawn Machine**（或执行 `HTB: Spawn Machine`）。
3. 启动后，右键 → **Open Box Workspace**。

系统将在 `~/htb/<box-name>/` 创建目录并作为 VS Code 工作区打开，目录结构如下：

```
~/htb/<box-name>/
├── .htb/
│   ├── box.json          ← 元数据（id, name, os, difficulty, ip）
│   ├── commands.jsonl    ← 命令记录
│   └── findings.json     ← 结构化发现事项
├── .vscode/
│   ├── settings.json     ← 预设 HTB_TARGET 环境变量
│   └── tasks.json        ← nmap / gobuster 任务快捷方式
├── notes.md              ← 预填的侦察模板
├── writeup.md            ← Writeup 草稿模板
├── scans/
│   ├── nmap/
│   ├── web/
│   └── smb/
└── loot/
    └── credentials.md
```

---

## 核心工作流

### 导入扫描结果

运行 nmap、gobuster 或 ffuf 后，可直接将输出文件导入 **Enumeration** 面板：

1. 执行 **HTB: Import Scan Output**（`Ctrl+Shift+P` → `HTB: Import Scan Output`）。
2. 选择输出文件（`.txt`、`.xml`、`.json`、`.gnmap`）。
3. 扩展自动判断工具类型，并将发现事项分类显示在 Enumeration 树中。

**支持的格式：**

| 工具 | 格式 |
|---|---|
| nmap | 文本（`-oN`）和 XML（`-oX`） |
| gobuster | `dir`、`dns`、`vhost` 文本输出 |
| ffuf | JSON（`-of json`）和纯文本 |

也可手动添加发现事项：右键 Enumeration 面板 → **Add Finding**。

### 记录命令（用于 Writeup）

按 `Ctrl+Alt+C`（或执行 **HTB: Capture Command for Writeup**）可为命令打上分段标签并记录。条目追加到 `.htb/commands.jsonl`，之后可在 Writeup 中引用。

### 提交 Flag

按 `Ctrl+Alt+F`（或执行 **HTB: Submit Flag**），输入 Flag 并评分难度。Active Machine 树将更新显示 Flag 获取状态。

### 复制目标 IP

按 `Ctrl+Alt+I` 将当前靶机的 IP 复制到剪贴板。

---

## 键盘快捷键

| 快捷键 | 操作 |
|---|---|
| `Ctrl+Alt+F` | 提交 Flag |
| `Ctrl+Alt+I` | 复制目标 IP |
| `Ctrl+Alt+C` | 记录命令（Writeup 用） |
| `Ctrl+Alt+N` | 建议下一步 *(Phase 3 – 即将推出)* |

---

## 命令列表

| 命令 | 说明 |
|---|---|
| `HTB: Sign In` | 使用 HTB App Token 认证 |
| `HTB: Sign Out` | 清除已保存的 Token |
| `HTB: Refresh` | 重新加载个人资料、靶机列表和状态栏 |
| `HTB: Spawn Machine` | 启动选中的靶机 |
| `HTB: Terminate Machine` | 终止当前活跃的靶机 |
| `HTB: Reset Machine` | 将靶机重置为初始状态 |
| `HTB: Open Box Workspace` | 生成并打开靶机工作区 |
| `HTB: Submit Flag` | 提交 User / Root Flag 并评分难度 |
| `HTB: Copy Target IP` | 复制活跃靶机的 IP |
| `HTB: Open in Browser` | 在 hackthebox.com 打开靶机页面 |
| `HTB: Connect VPN` | 使用选定的 `.ovpn` 文件启动 OpenVPN |
| `HTB: Disconnect VPN` | 断开 VPN 隧道 |
| `HTB: Select VPN Server` | 选择其他 `.ovpn` 文件 |
| `HTB: Import Scan Output` | 解析 nmap / gobuster / ffuf 文件并显示在 Enumeration 面板 |
| `HTB: Add Finding` | 手动向 Enumeration 面板添加发现事项 |
| `HTB: Capture Command for Writeup` | 为命令打标签并记录 |

---

## 设置项

| 设置键 | 默认值 | 说明 |
|---|---|---|
| `htb.workspaceRoot` | `~/htb` | 靶机工作区的根目录 |
| `htb.workspaceTemplate` | `standard` | 脚手架模板：`minimal`（仅 notes）、`standard`（notes + scans + loot）、`full`（额外添加 exploits + screenshots）|
| `htb.vpn.openvpnPath` | *(自动检测)* | `openvpn` 可执行文件路径。为空时从 PATH 自动检测 |
| `htb.vpn.configDirectory` | `~/htb/vpn` | 存放 `.ovpn` 文件的目录 |
| `htb.vpn.defaultConfig` | *(无)* | 连接 VPN 时无需提示直接使用的默认 `.ovpn` 文件 |
| `htb.vpn.elevationStrategy` | `auto` | 提权方式：`auto`、`sudo`、`pkexec`、`none`、`windows-uac` |
| `htb.vpn.autoDisconnectOnTerminate` | `false` | 终止靶机时自动断开 VPN |
| `htb.vpn.healthCheckIntervalSec` | `10` | VPN 隧道健康检查间隔（秒） |
| `htb.enum.autoImportFromTerminal` | `true` | 自动解析终端中检测到的扫描输出 |
| `htb.telemetry` | `false` | 匿名遥测（默认关闭） |

---

## VPN 注意事项

- **Linux**：通过 `sudo` 或 `pkexec` 自动提权。以 root 运行时无需提权。
- **macOS**：通过 `osascript` 弹出 GUI 密码框进行提权。
- **Windows**：通过 `runas`（UAC 提示）提权。需要安装 [OpenVPN Community](https://openvpn.net/community-downloads/) 版本，不支持 OpenVPN Connect。
- 包含 `script-security 2` 或更高级别的 `.ovpn` 文件会显示警告，这对 HTB 配置文件来说是正常现象。

---

## 安全

- HTB App Token 存储在 **VS Code 的 Secret Storage**（系统密钥链）中，不会写入设置文件或明文文件。
- 密码和 Flag 在所有日志和输出面板中均被脱敏处理。
- 遥测**默认关闭**。

漏洞披露政策请参阅 [SECURITY.md](SECURITY.md)。

---

## 参与贡献

欢迎贡献！详情请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)。

```sh
git clone https://github.com/long-910/vscode-htb-companion.git
cd vscode-htb-companion
npm install
npm run watch       # 监听模式构建
# 在 VS Code 中按 F5 启动 Extension Development Host
```

---

## 支持开发

如果这个扩展对您有帮助，欢迎赞助开发：

- [GitHub Sponsors](https://github.com/sponsors/long-910)
- [Ko-fi](https://ko-fi.com/long910)

---

## 许可证

[MIT](LICENSE) © long-910

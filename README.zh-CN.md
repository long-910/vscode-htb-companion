[English](./README.md) | [日本語](./README.ja.md) | 简体中文

# HTB Companion

[![CI](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=long-kudo.vscode-htb-companion)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Registry-purple)](https://open-vsx.org/extension/long-kudo/vscode-htb-companion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Hack The Box 的 VS Code 集成扩展** — 无需离开编辑器，即可管理靶机、追踪发现、获取 AI 提示并导出 Writeup。

---

## 设计理念

HTB Companion 是一款**辅助工具，而非攻击工具**。

本扩展不会代替您执行 nmap、gobuster、ffuf 或任何其他安全工具，不会发送漏洞利用载荷，不会进行自动扫描，也不会直接与目标靶机通信。

本扩展的作用是整理您的工作流程：

- **读取**您在终端中运行工具后产生的输出文件，并对发现事项进行归类整理
- 通过官方 HTB API **管理** HTB 会话（VPN 连接、靶机启动／终止、Flag 提交）
- **自动创建**结构化工作区，让笔记、扫描结果和凭据保持有序
- 在发送前对敏感信息进行脱敏处理，并提供 **AI 提示**（可在发送前预览内容）

对靶机的所有主动操作均在**您的终端**中、**由您自己**完成。

---

## 功能列表

| 功能 | 说明 |
|---|---|
| **认证与个人资料** | 使用 HTB App Token 登录，侧边栏显示个人资料和段位 |
| **靶机管理** | 浏览 Active / Retired（分页）/ Starting Point（Tier 1-3）；启动、终止、重置靶机 |
| **VPN** | 在 VS Code 内启动并监控 OpenVPN；自动检测可执行文件和提权方式 |
| **工作区自动生成** | 一条命令创建包含预填 `notes.md`、扫描目录、VS Code 任务和 `HTB_TARGET` 环境变量的靶机目录 |
| **枚举面板** | 导入 nmap / gobuster / ffuf 输出 → 自动解析并按类别（端口、目录、子域名、用户、CVE、笔记）分组显示 |
| **枚举可视化器** | 以 Webview 面板显示所有发现事项，自动生成 Mermaid 图语法并展示 MITRE ATT&CK 战术映射 |
| **命令历史** | 为终端命令打上分段标签（recon / foothold / privesc / loot）并记录，持久化到 `.htb/commands.jsonl`；支持自动截图 |
| **AI 助手** | 建议下一步操作、分析输出、回答上下文问题 — 基于 VS Code Language Model API（GitHub Copilot 或 Claude 扩展）；可配置提示级别 |
| **Writeup 导出** | 从捕获的命令、发现事项、靶机元数据和笔记自动生成 `writeup.md`；可保存至任意路径 |
| **Sherlocks（DFIR）** | 按类别浏览 HTB Sherlocks 挑战，显示难度图标和解题状态 |
| **Pwnbox SSH** | 从 HTB API 获取 Pwnbox SSH 信息并自动配置 `~/.ssh/config`，一键 Remote-SSH 连接 |
| **近期靶机** | 侧边栏显示最近打开的工作区，一键重新打开 |
| **状态栏** | 实时显示 VPN 状态、当前靶机名称与 IP、Flag 获取进度 |

---

## 环境要求

| 依赖项 | 说明 |
|---|---|
| **VS Code** ≥ 1.95 | |
| **HTB App Token** | 在 [app.hackthebox.com/account-settings](https://app.hackthebox.com/account-settings) → *App Tokens* 中生成 |
| **OpenVPN** | VPN 功能所需。通过系统包管理器或 [openvpn.net](https://openvpn.net/community-downloads/) 安装。**不支持** OpenVPN Connect（GUI 版）|
| **.ovpn 文件** | 从 HTB → *Labs* → *Access* 下载 |
| **AI 扩展** *(可选)* | AI 提示功能需要 [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) 或 [Claude for VS Code](https://marketplace.visualstudio.com/items?itemName=Anthropic.claude-code) |

---

## 快速开始

### 1. 安装

在 VS Code 扩展面板中搜索 **"HTB Companion"**，或通过命令行安装：

```sh
code --install-extension long-kudo.vscode-htb-companion
```

### 2. 登录

打开命令面板（`Ctrl+Shift+P`）并运行：

```
HTB: Sign In
```

扩展将打开您的 HTB 账户设置页面。创建 App Token，将其粘贴到提示框中并按 **Enter**。您的个人资料和段位将显示在 HTB 侧边栏中。

### 3. 连接 VPN

1. 将 `.ovpn` 文件放置在 `~/htb/vpn/`（或在设置中修改 `htb.vpn.configDirectory`）。
2. 从命令面板运行 **HTB: Connect VPN**。
3. 状态栏显示 `$(radio-tower) VPN ✓` 即表示隧道已建立。

### 4. 启动靶机并打开工作区

1. 从 HTB 侧边栏的 **Machines** 树中选择靶机。
2. 右键 → **Spawn Machine**（或运行 `HTB: Spawn Machine`）。
3. 启动后，右键 → **Open Box Workspace**。

系统将在 `~/htb/<box-name>/` 创建目录并作为 VS Code 工作区打开：

```
~/htb/<box-name>/
├── .htb/
│   ├── box.json          ← 元数据（id, name, os, difficulty, ip）
│   ├── commands.jsonl    ← 捕获的命令日志
│   └── findings.json     ← 结构化发现事项
├── .vscode/
│   ├── settings.json     ← 预设 HTB_TARGET 环境变量
│   └── tasks.json        ← nmap / gobuster 任务快捷方式
├── notes.md              ← 预填侦察模板
├── writeup.md            ← Writeup 草稿模板
├── scans/
│   ├── nmap/
│   ├── web/
│   └── smb/
├── screenshots/          ← 命令捕获时的自动截图
└── loot/
    └── credentials.md
```

---

## 核心工作流

### 导入扫描结果

运行 nmap、gobuster 或 ffuf 后，将输出文件直接导入**枚举**面板：

1. 运行 **HTB: Import Scan Output**。
2. 选择输出文件（`.txt`、`.xml`、`.json`、`.gnmap`）。
3. 扩展自动识别工具类型，并将发现事项按类别分组显示。

**支持的格式：**

| 工具 | 格式 |
|---|---|
| nmap | 文本（`-oN`）和 XML（`-oX`） |
| gobuster | `dir`、`dns`、`vhost` 文本输出 |
| ffuf | JSON（`-of json`）和纯文本 |

### 枚举可视化器

运行 **HTB: Show Enumeration Visualizer** 打开 Webview 面板：

- **端口与服务**表格（协议、服务名称、版本）
- 目录、子域名、用户、CVE、笔记分组显示
- **MITRE ATT&CK 映射** — 根据发现事项自动推断战术与技术（建议手动核实）
- **Mermaid 语法** — 可粘贴到 Mermaid Live Editor 或 Obsidian 渲染图形

### AI 助手

安装 GitHub Copilot 或 Claude 扩展后：

| 命令 | 快捷键 | 说明 |
|---|---|---|
| Suggest Next Step | `Ctrl+Alt+N` | 结合完整靶机上下文询问"下一步应该调查什么" |
| Analyze Output | — | 将选中文本或剪贴板内容发送给 AI 分析 |
| Ask About Current Box | — | 关于当前靶机的自由提问 |
| Set AI Hint Level | — | 切换提示详细程度（nudge / tactic / ttp / poc） |

### 导出 Writeup

1. 运行 **HTB: Draft Writeup** — 从捕获的命令、发现事项、靶机元数据和笔记自动生成 `writeup.md`。
2. 审阅并编辑 `writeup.md`。
3. 运行 **HTB: Export Writeup (Markdown)** 通过保存对话框导出至任意路径。

### 提交 Flag

按 `Ctrl+Alt+F`，输入 Flag 并评定难度。Active Machine 树将更新显示已获取的 Flag。

---

## 键盘快捷键

| 快捷键 | 操作 |
|---|---|
| `Ctrl+Alt+F` | 提交 Flag |
| `Ctrl+Alt+I` | 复制目标 IP |
| `Ctrl+Alt+C` | 捕获命令用于 Writeup |
| `Ctrl+Alt+N` | AI：建议下一步 |

---

## 命令参考

| 命令 | 说明 |
|---|---|
| `HTB: Sign In` | 使用 HTB App Token 进行身份验证 |
| `HTB: Sign Out` | 清除已保存的 Token |
| `HTB: Refresh` | 重新加载个人资料、靶机列表和状态栏 |
| `HTB: Spawn Machine` | 启动选中的靶机 |
| `HTB: Terminate Machine` | 终止当前活跃靶机 |
| `HTB: Reset Machine` | 将活跃靶机重置为初始状态 |
| `HTB: Open Box Workspace` | 创建并打开靶机工作区 |
| `HTB: Submit Flag` | 提交 User 或 Root Flag 并评定难度 |
| `HTB: Copy Target IP` | 将活跃靶机 IP 复制到剪贴板 |
| `HTB: Open in Browser` | 在 hackthebox.com 打开靶机页面 |
| `HTB: Connect VPN` | 使用选定的 `.ovpn` 文件启动 OpenVPN |
| `HTB: Disconnect VPN` | 停止 VPN 隧道 |
| `HTB: Select VPN Server` | 选择其他 `.ovpn` 文件 |
| `HTB: Import Scan Output` | 解析 nmap / gobuster / ffuf 文件 → 枚举面板 |
| `HTB: Add Finding` | 手动向枚举面板添加发现事项 |
| `HTB: Show Enumeration Visualizer` | 打开包含发现事项地图和 MITRE ATT&CK 表格的 Webview |
| `HTB: Capture Command for Writeup` | 带分段标签记录命令（支持自动截图） |
| `HTB AI: Suggest Next Step` | AI 驱动的下一步建议（`Ctrl+Alt+N`） |
| `HTB AI: Analyze Output` | 将选中文本／剪贴板发送给 AI 分析 |
| `HTB AI: Ask About Current Box` | 关于当前靶机向 AI 自由提问 |
| `HTB AI: Set AI Hint Level` | 切换提示详细程度 |
| `HTB: Draft Writeup` | 从命令、发现事项和笔记自动生成 `writeup.md` |
| `HTB: Export Writeup (Markdown)` | 将 Writeup 保存至指定路径 |
| `HTB: Configure Pwnbox SSH` | 写入 Pwnbox 的 `~/.ssh/config` 条目并连接 |
| `HTB: Refresh Sherlocks` | 从 HTB API 重新加载 Sherlocks 挑战列表 |

---

## 设置

| 设置项 | 默认值 | 说明 |
|---|---|---|
| `htb.workspaceRoot` | `~/htb` | 靶机工作区的根目录 |
| `htb.workspaceTemplate` | `standard` | 脚手架模板：`minimal`、`standard`、`full` |
| `htb.vpn.openvpnPath` | *(自动)* | `openvpn` 可执行文件路径；为空时从 PATH 自动检测 |
| `htb.vpn.configDirectory` | `~/htb/vpn` | 存放 `.ovpn` 文件的目录 |
| `htb.vpn.defaultConfig` | *(无)* | Connect VPN 时无需提示直接使用的默认 `.ovpn` 文件 |
| `htb.vpn.elevationStrategy` | `auto` | 提权方式：`auto`、`sudo`、`pkexec`、`none`、`windows-uac` |
| `htb.vpn.autoDisconnectOnTerminate` | `false` | 终止靶机时自动断开 VPN |
| `htb.vpn.healthCheckIntervalSec` | `10` | VPN 健康检查间隔（秒） |
| `htb.ai.provider` | `auto` | AI 提供商：`auto`、`copilot`、`claude`、`off` |
| `htb.ai.hintLevel` | `nudge` | 提示详细程度：`nudge`、`tactic`、`ttp`、`poc` |
| `htb.ai.contextMode` | `current-box` | 发送给 AI 的上下文量：`minimal`、`current-box`、`full-history` |
| `htb.ai.confirmBeforeSend` | `false` | 发送给 AI 前显示上下文审查面板 |
| `htb.enum.autoImportFromTerminal` | `true` | 自动解析终端中检测到的扫描输出 |
| `htb.writeup.captureScreenshots` | `true` | 捕获命令时自动截图 |
| `htb.writeup.passwordProtect` | `false` | 加密 Writeup 输出（符合 HTB Retired Machine 政策） |
| `htb.telemetry` | `false` | 匿名遥测（默认关闭） |

---

## VPN 使用说明

- **Linux**：通过 `sudo` 或 `pkexec` 提权（自动检测）。
- **macOS**：通过 `osascript` 提权（GUI 密码对话框）；连接超时为 180 秒。
- **Windows**：通过 `runas` 提权（UAC 提示）。需要安装 [OpenVPN Community](https://openvpn.net/community-downloads/)，不支持 OpenVPN Connect。
- 包含 `script-security 2` 或更高级别的 `.ovpn` 文件将显示警告——这对 HTB 配置文件是正常现象。

---

## 安全性

- HTB App Token 存储在 **VS Code 的 Secret Storage**（操作系统密钥链）中——绝不写入设置文件或明文文件。
- 密码和 Flag 在所有日志和输出面板中均被脱敏处理。
- AI 上下文在传输前自动屏蔽 Flag、密码和 SSH 密钥。
- 遥测**默认关闭**。

详情请参阅 [SECURITY.md](SECURITY.md)。

---

## 贡献

```sh
git clone https://github.com/long-910/vscode-htb-companion.git
cd vscode-htb-companion
npm install
npm run watch
# 在 VS Code 中按 F5 启动扩展开发主机
```

---

## 支持

- [GitHub Sponsors](https://github.com/sponsors/long-910)
- [Ko-fi](https://ko-fi.com/long910)

---

## 许可证

[MIT](LICENSE) © long-910

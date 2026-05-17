[English](./README.md) | 日本語 | [简体中文](./README.zh-CN.md)

# HTB Companion

[![CI](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=long-kudo.vscode-htb-companion)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Registry-purple)](https://open-vsx.org/extension/long-kudo/vscode-htb-companion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Hack The Box を VS Code から操作する拡張機能** — マシンの管理、発見事項のトラッキング、AI ヒントの取得、ライトアップのエクスポートをエディタから離れずに行えます。

---

## コンセプト

HTB Companion は**攻撃ツールではなく、コンパニオン（補助）ツール**です。

nmap・gobuster・ffuf などのセキュリティツールをこの拡張機能が代わりに実行することはありません。エクスプロイトの送信、自動スキャン、ターゲットマシンへの直接通信も一切行いません。

この拡張機能が行うのはワークフローの整理です：

- ターミナルで自分が実行したツールの**出力ファイルを読み込み**、発見事項を整理する
- 公式 HTB API を通じて VPN 接続・マシンのスポーン／終了・フラグ提出など**HTB セッションを管理**する
- ノート・スキャン結果・認証情報が整理された**ワークスペースを自動生成**する
- 機密情報をマスクしたうえで**AI ヒントを取得**する（送信前に内容を確認可能）

ターゲットマシンへの能動的な操作はすべて**あなたのターミナル**で**あなた自身の操作**により行われます。

---

## 機能一覧

| 機能 | 概要 |
|---|---|
| **認証・プロフィール** | HTB App Token でサインイン。サイドバーにプロフィールとランクを表示 |
| **マシン管理** | Active / Retired（ページネーション）/ Starting Point（Tier 1-3）を一覧表示。スポーン・終了・リセット |
| **VPN** | VS Code 内から OpenVPN を起動・監視。バイナリと昇格方法を自動検出 |
| **ワークスペース自動生成** | コマンド1つで `notes.md`・スキャンフォルダ・VS Code タスク・`HTB_TARGET` 環境変数を含むボックスディレクトリを作成 |
| **列挙パネル** | nmap / gobuster / ffuf の出力をインポート → ツールを自動判定してカテゴリ別（ポート・ディレクトリ・サブドメイン・ユーザー・CVE・メモ）に整理 |
| **列挙ビジュアライザー** | すべての発見事項を Webview マップで表示。Mermaid グラフ構文の自動生成と MITRE ATT&CK タクティクスマッピング付き |
| **コマンド履歴** | ターミナルのコマンドをセクションタグ（recon / foothold / privesc / loot）付きで記録。`.htb/commands.jsonl` に永続化。スクリーンショット自動撮影対応 |
| **AI アシスタント** | 次のステップの提案・出力解析・コンテキスト質問 — VS Code Language Model API（GitHub Copilot または Claude 拡張機能）を使用。ヒントレベル設定可能 |
| **ライトアップエクスポート** | キャプチャしたコマンド・発見事項・メタデータ・ノートから `writeup.md` を自動生成。任意のパスに保存可能 |
| **Sherlocks（DFIR）** | HTB Sherlocks チャレンジをカテゴリ別に一覧表示。難易度アイコンと解答状況を表示 |
| **Pwnbox SSH** | HTB API から Pwnbox SSH 情報を取得し、`~/.ssh/config` を自動設定。ワンクリックで Remote-SSH 接続 |
| **Recent Boxes** | 最近開いたワークスペースをサイドバーに表示。ワンクリックで再オープン |
| **ステータスバー** | VPN 接続状態・アクティブマシン名と IP・フラグ取得状況をリアルタイム表示 |

---

## 必要な環境

| 依存 | 備考 |
|---|---|
| **VS Code** ≥ 1.95 | |
| **HTB App Token** | [app.hackthebox.com/account-settings](https://app.hackthebox.com/account-settings) → *App Tokens* で生成 |
| **OpenVPN** | VPN 機能に必要。OS のパッケージマネージャーまたは [openvpn.net](https://openvpn.net/community-downloads/) からインストール。OpenVPN Connect（GUI 版）は**非対応** |
| **.ovpn ファイル** | HTB → *Labs* → *Access* からダウンロード |
| **AI 拡張機能** *(任意)* | AI ヒント機能には [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) または [Claude for VS Code](https://marketplace.visualstudio.com/items?itemName=Anthropic.claude-code) が必要 |

---

## クイックスタート

### 1. インストール

VS Code の拡張機能パネルで **"HTB Companion"** を検索するか、コマンドラインからインストール：

```sh
code --install-extension long-kudo.vscode-htb-companion
```

### 2. サインイン

コマンドパレット（`Ctrl+Shift+P`）から実行：

```
HTB: Sign In
```

HTB アカウント設定ページが開きます。App Token を作成し、プロンプトに貼り付けて **Enter** を押してください。HTB サイドバーにプロフィールとランクが表示されます。

### 3. VPN 接続

1. `.ovpn` ファイルを `~/htb/vpn/` に置く（または設定で `htb.vpn.configDirectory` を変更）。
2. コマンドパレットから **HTB: Connect VPN** を実行。
3. ステータスバーに `$(radio-tower) VPN ✓` が表示されれば接続完了。

### 4. マシンのスポーンとワークスペースの起動

1. HTB サイドバーの **Machines** ツリーからマシンを選択。
2. 右クリック → **Spawn Machine**（または `HTB: Spawn Machine`）。
3. スポーン完了後、右クリック → **Open Box Workspace**。

`~/htb/<box-name>/` にディレクトリが作成され、VS Code でワークスペースとして開きます。

```
~/htb/<box-name>/
├── .htb/
│   ├── box.json          ← メタデータ（id, name, os, difficulty, ip）
│   ├── commands.jsonl    ← キャプチャしたコマンドログ
│   └── findings.json     ← 構造化された発見事項
├── .vscode/
│   ├── settings.json     ← HTB_TARGET 環境変数が設定済み
│   └── tasks.json        ← nmap / gobuster タスクショートカット
├── notes.md              ← 偵察テンプレートが事前入力済み
├── writeup.md            ← ライトアップ下書きテンプレート
├── scans/
│   ├── nmap/
│   ├── web/
│   └── smb/
├── screenshots/          ← コマンドキャプチャ時の自動スクリーンショット
└── loot/
    └── credentials.md
```

---

## 主なワークフロー

### スキャン結果のインポート

nmap・gobuster・ffuf を実行後、出力ファイルを直接**列挙**パネルにインポート：

1. **HTB: Import Scan Output** を実行。
2. 出力ファイル（`.txt`・`.xml`・`.json`・`.gnmap`）を選択。
3. ツールを自動判定し、発見事項がカテゴリ別に整理されます。

**対応フォーマット：**

| ツール | フォーマット |
|---|---|
| nmap | テキスト（`-oN`）および XML（`-oX`） |
| gobuster | `dir`・`dns`・`vhost` のテキスト出力 |
| ffuf | JSON（`-of json`）およびプレーンテキスト |

### 列挙ビジュアライザー

**HTB: Show Enumeration Visualizer** を実行すると Webview パネルが開きます：

- **ポート＆サービス**テーブル（プロトコル・サービス名・バージョン）
- ディレクトリ・サブドメイン・ユーザー・CVE・メモのグループ表示
- **MITRE ATT&CK マッピング** — 発見事項から自動推論（手動確認推奨）
- **Mermaid 構文** — Mermaid Live Editor や Obsidian に貼り付け可能

### AI アシスタント

| コマンド | ショートカット | 説明 |
|---|---|---|
| Suggest Next Step | `Ctrl+Alt+N` | ボックスのフルコンテキストで次に調べるべきことを提案 |
| Analyze Output | — | 選択テキストまたはクリップボードを AI で解析 |
| Ask About Current Box | — | アクティブマシンについて自由形式で質問 |
| Set AI Hint Level | — | ヒントの詳細度を切替（nudge / tactic / ttp / poc） |

### ライトアップのエクスポート

1. **HTB: Draft Writeup** — コマンド・発見事項・メタデータ・ノートから `writeup.md` を自動生成。
2. 内容を確認・編集。
3. **HTB: Export Writeup (Markdown)** で任意のパスに保存。

### フラグの提出

`Ctrl+Alt+F` でフラグを入力し難易度を評価。アクティブマシンのツリーに取得状況が表示されます。

---

## キーボードショートカット

| ショートカット | アクション |
|---|---|
| `Ctrl+Alt+F` | フラグを提出 |
| `Ctrl+Alt+I` | ターゲット IP をコピー |
| `Ctrl+Alt+C` | ライトアップ用コマンドをキャプチャ |
| `Ctrl+Alt+N` | AI: 次のステップを提案 |

---

## コマンドリファレンス

| コマンド | 説明 |
|---|---|
| `HTB: Sign In` | HTB App Token で認証 |
| `HTB: Sign Out` | 保存されたトークンを削除 |
| `HTB: Refresh` | プロフィール・マシン一覧・ステータスバーを更新 |
| `HTB: Spawn Machine` | 選択したマシンをスポーン |
| `HTB: Terminate Machine` | アクティブマシンを終了 |
| `HTB: Reset Machine` | アクティブマシンを初期状態にリセット |
| `HTB: Open Box Workspace` | マシンのワークスペースを生成して開く |
| `HTB: Submit Flag` | ユーザー／ルートフラグを難易度評価とともに提出 |
| `HTB: Copy Target IP` | アクティブマシンの IP をクリップボードにコピー |
| `HTB: Open in Browser` | hackthebox.com のマシンページを開く |
| `HTB: Connect VPN` | 選択した `.ovpn` ファイルで OpenVPN を起動 |
| `HTB: Disconnect VPN` | VPN トンネルを停止 |
| `HTB: Select VPN Server` | 別の `.ovpn` ファイルを選択 |
| `HTB: Import Scan Output` | nmap / gobuster / ffuf ファイルを列挙パネルに取り込む |
| `HTB: Add Finding` | 列挙パネルに発見事項を手動追加 |
| `HTB: Show Enumeration Visualizer` | 発見事項マップと MITRE ATT&CK テーブルの Webview を開く |
| `HTB: Capture Command for Writeup` | セクションタグ付きでコマンドを記録（スクリーンショット自動撮影対応） |
| `HTB AI: Suggest Next Step` | AI による次のステップ提案（`Ctrl+Alt+N`） |
| `HTB AI: Analyze Output` | 選択テキスト／クリップボードを AI で解析 |
| `HTB AI: Ask About Current Box` | アクティブボックスについて AI に自由質問 |
| `HTB AI: Set AI Hint Level` | ヒントの詳細度を切替 |
| `HTB: Draft Writeup` | コマンド・発見事項・ノートから `writeup.md` を自動生成 |
| `HTB: Export Writeup (Markdown)` | 任意のパスにライトアップを保存 |
| `HTB: Configure Pwnbox SSH` | Pwnbox 用の `~/.ssh/config` エントリを書き込んで接続 |
| `HTB: Refresh Sherlocks` | HTB API から Sherlocks チャレンジ一覧を更新 |

---

## 設定

| 設定 | デフォルト | 説明 |
|---|---|---|
| `htb.workspaceRoot` | `~/htb` | ボックスワークスペースを作成するルートディレクトリ |
| `htb.workspaceTemplate` | `standard` | スキャフォールドテンプレート：`minimal`・`standard`・`full` |
| `htb.vpn.openvpnPath` | *(自動)* | `openvpn` バイナリのパス。空の場合は PATH から自動検出 |
| `htb.vpn.configDirectory` | `~/htb/vpn` | `.ovpn` ファイルを置くディレクトリ |
| `htb.vpn.defaultConfig` | *(なし)* | Connect VPN でプロンプトなしに使用するデフォルト `.ovpn` |
| `htb.vpn.elevationStrategy` | `auto` | 昇格方法：`auto`・`sudo`・`pkexec`・`none`・`windows-uac` |
| `htb.vpn.autoDisconnectOnTerminate` | `false` | マシン終了時に VPN を自動切断 |
| `htb.vpn.healthCheckIntervalSec` | `10` | VPN ヘルスチェックの間隔（秒） |
| `htb.ai.provider` | `auto` | AI プロバイダ：`auto`・`copilot`・`claude`・`off` |
| `htb.ai.hintLevel` | `nudge` | ヒントの詳細度：`nudge`・`tactic`・`ttp`・`poc` |
| `htb.ai.contextMode` | `current-box` | AI に送るコンテキスト量：`minimal`・`current-box`・`full-history` |
| `htb.ai.confirmBeforeSend` | `false` | AI への送信前にコンテキストレビューパネルを表示 |
| `htb.enum.autoImportFromTerminal` | `true` | ターミナルで検出したスキャン出力を自動インポート |
| `htb.writeup.captureScreenshots` | `true` | コマンドキャプチャ時にスクリーンショットを自動撮影 |
| `htb.writeup.passwordProtect` | `false` | ライトアップ出力を暗号化 |
| `htb.telemetry` | `false` | 匿名テレメトリ（デフォルト OFF） |

---

## セキュリティ

- HTB App Token は **VS Code の Secret Storage**（OS キーチェーン）に保存。設定ファイルや平文ファイルには書き込みません。
- パスワードとフラグはすべてのログと出力パネルでマスクされます。
- AI コンテキストはフラグ・パスワード・SSH キーを送信前に自動マスクします。
- テレメトリは**デフォルト OFF**です。

詳しくは [SECURITY.md](SECURITY.md) をご覧ください。

---

## コントリビューション

```sh
git clone https://github.com/long-910/vscode-htb-companion.git
cd vscode-htb-companion
npm install
npm run watch
# VS Code で F5 → Extension Development Host を起動
```

---

## サポート

- [GitHub Sponsors](https://github.com/sponsors/long-910)
- [Ko-fi](https://ko-fi.com/long910)

---

## ライセンス

[MIT](LICENSE) © long-910

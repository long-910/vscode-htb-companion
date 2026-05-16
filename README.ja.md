[English](./README.md) | 日本語 | [简体中文](./README.zh-CN.md)

# HTB Companion

[![CI](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml/badge.svg)](https://github.com/long-910/vscode-htb-companion/actions/workflows/ci.yml)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=long-kudo.vscode-htb-companion)
[![Open VSX](https://img.shields.io/badge/Open%20VSX-Registry-purple)](https://open-vsx.org/extension/long-kudo/vscode-htb-companion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Hack The Box を VS Code から操作する拡張機能** — マシンの管理、発見事項のトラッキング、コマンドの記録、ボックスワークスペースの自動生成をエディタから離れずに行えます。

---

## コンセプト

HTB Companion は**攻撃ツールではなく、コンパニオン（補助）ツール**です。

nmap・gobuster・ffuf などのセキュリティツールをこの拡張機能が代わりに実行することはありません。エクスプロイトの送信、自動スキャン、ターゲットマシンへの直接通信も一切行いません。

この拡張機能が行うのはワークフローの整理です：

- ターミナルで自分が実行したツールの**出力ファイルを読み込み**、発見事項を整理する
- 公式 HTB API を通じて VPN 接続・マシンのスポーン／終了・フラグ提出など**HTB セッションを管理**する
- ノート・スキャン結果・認証情報が整理された**ワークスペースを自動生成**する
- 機密情報をマスクしたうえで**AI ヒントを取得**する（送信内容はユーザーが確認可能）

ターゲットマシンへの能動的な操作はすべて**あなたのターミナル**で**あなた自身の操作**により行われます。

---

## 機能一覧

| 機能 | 概要 |
|---|---|
| **認証・プロフィール** | HTB App Token でサインイン。サイドバーにプロフィールとランクを表示 |
| **マシン管理** | Active / Retired（ページネーション）/ Starting Point（Tier 1-3）を一覧表示。スポーン・終了・リセット |
| **VPN** | VS Code 内から OpenVPN を起動・監視。バイナリと昇格方法を自動検出 |
| **ワークスペース自動生成** | コマンド1つで `notes.md`、スキャンフォルダ、VS Code タスク、`HTB_TARGET` 環境変数を含むボックスディレクトリを作成 |
| **列挙パネル** | nmap / gobuster / ffuf の出力をインポート → ツールを自動判定してカテゴリ別（ポート・ディレクトリ・サブドメイン・ユーザー・CVE・メモ）に整理 |
| **コマンド履歴** | ターミナルのコマンドをセクションタグ（recon / foothold / privesc / loot）付きで記録。`.htb/commands.jsonl` に永続化 |
| **Recent Boxes** | 最近開いたワークスペースをサイドバーに表示。ワンクリックで再オープン |
| **ステータスバー** | VPN 接続状態・アクティブマシン名と IP・フラグ取得状況をリアルタイム表示 |

> **ロードマップ**: AI ヒント（Phase 3）とライトアップエクスポート（Phase 4）は今後のリリースで追加予定です。

---

## 必要な環境

| 依存 | 備考 |
|---|---|
| **VS Code** ≥ 1.90 | |
| **HTB App Token** | [app.hackthebox.com/account-settings](https://app.hackthebox.com/account-settings) → *App Tokens* で生成 |
| **OpenVPN** | VPN 機能に必要。OS のパッケージマネージャーまたは [openvpn.net](https://openvpn.net/community-downloads/) からインストール。OpenVPN Connect（GUI 版）は**非対応** |
| **.ovpn ファイル** | HTB → *Labs* → *Access* からダウンロード |

---

## クイックスタート

### 1. インストール

VS Code の拡張機能パネルで **"HTB Companion"** を検索するか、コマンドラインからインストールします：

```sh
code --install-extension long-kudo.vscode-htb-companion
```

### 2. サインイン

コマンドパレット（`Ctrl+Shift+P`）から実行します：

```
HTB: Sign In
```

HTB のアカウント設定ページが開きます。App Token を作成してプロンプトに貼り付け、**Enter** を押してください。HTB サイドバーにプロフィールとランクが表示されます。

### 3. VPN 接続

1. `.ovpn` ファイルを `~/htb/vpn/` に配置します（または設定の `htb.vpn.configDirectory` で変更可）。
2. コマンドパレットから **HTB: Connect VPN** を実行します。
3. ステータスバーに `VPN ✓` が表示されたらトンネルが確立されています。

### 4. マシンをスポーンしてワークスペースを開く

1. HTB サイドバーの **Machines** ツリーからマシンを選択します。
2. 右クリック → **Spawn Machine**（または `HTB: Spawn Machine`）。
3. スポーン後、右クリック → **Open Box Workspace**。

`~/htb/<box-name>/` にディレクトリが作成され、VS Code のワークスペースとして開きます。

```
~/htb/<box-name>/
├── .htb/
│   ├── box.json          ← メタデータ（id, name, os, difficulty, ip）
│   ├── commands.jsonl    ← コマンド履歴
│   └── findings.json     ← 構造化された発見事項
├── .vscode/
│   ├── settings.json     ← HTB_TARGET 環境変数を事前設定
│   └── tasks.json        ← nmap / gobuster タスクショートカット
├── notes.md              ← Recon テンプレート（事前入力済み）
├── writeup.md            ← ライトアップ下書きテンプレート
├── scans/
│   ├── nmap/
│   ├── web/
│   └── smb/
└── loot/
    └── credentials.md
```

---

## 主なワークフロー

### スキャン結果のインポート

nmap・gobuster・ffuf を実行した後、出力ファイルを **Enumeration** パネルに直接インポートできます：

1. **HTB: Import Scan Output** を実行（`Ctrl+Shift+P` → `HTB: Import Scan Output`）。
2. 出力ファイル（`.txt`、`.xml`、`.json`、`.gnmap`）を選択。
3. ツールが自動判定され、Enumeration ツリーに発見事項がカテゴリ別に表示されます。

**対応フォーマット：**

| ツール | 形式 |
|---|---|
| nmap | テキスト（`-oN`）・XML（`-oX`） |
| gobuster | `dir`・`dns`・`vhost` のテキスト出力 |
| ffuf | JSON（`-of json`）・プレーンテキスト |

発見事項を手動で追加することも可能です：Enumeration パネルを右クリック → **Add Finding**。

### コマンドのキャプチャ（ライトアップ用）

`Ctrl+Alt+C`（または **HTB: Capture Command for Writeup**）を押すと、セクションタグ付きでコマンドを記録できます。`.htb/commands.jsonl` に追記され、後でライトアップに活用できます。

### フラグの提出

`Ctrl+Alt+F`（または **HTB: Submit Flag**）を押してフラグを入力し、難易度を評価します。Active Machine ツリーが更新され、フラグの取得状況が反映されます。

### ターゲット IP のコピー

`Ctrl+Alt+I` でアクティブマシンの IP をクリップボードにコピーします。

---

## キーボードショートカット

| ショートカット | 操作 |
|---|---|
| `Ctrl+Alt+F` | フラグを提出 |
| `Ctrl+Alt+I` | ターゲット IP をコピー |
| `Ctrl+Alt+C` | コマンドをキャプチャ（ライトアップ用） |
| `Ctrl+Alt+N` | 次のステップを提案 *(Phase 3 – 近日公開)* |

---

## コマンド一覧

| コマンド | 説明 |
|---|---|
| `HTB: Sign In` | HTB App Token で認証 |
| `HTB: Sign Out` | 保存済みトークンを削除 |
| `HTB: Refresh` | プロフィール・マシン一覧・ステータスバーを再読み込み |
| `HTB: Spawn Machine` | 選択したマシンをスポーン |
| `HTB: Terminate Machine` | アクティブマシンを終了 |
| `HTB: Reset Machine` | アクティブマシンを初期状態にリセット |
| `HTB: Open Box Workspace` | マシンのワークスペースを生成して開く |
| `HTB: Submit Flag` | ユーザー / ルートフラグを難易度評価付きで提出 |
| `HTB: Copy Target IP` | アクティブマシンの IP をコピー |
| `HTB: Open in Browser` | hackthebox.com のマシンページを開く |
| `HTB: Connect VPN` | 選択した `.ovpn` ファイルで OpenVPN を起動 |
| `HTB: Disconnect VPN` | VPN トンネルを切断 |
| `HTB: Select VPN Server` | 別の `.ovpn` ファイルを選択 |
| `HTB: Import Scan Output` | nmap / gobuster / ffuf ファイルを解析して Enumeration パネルに表示 |
| `HTB: Add Finding` | 発見事項を手動で Enumeration パネルに追加 |
| `HTB: Capture Command for Writeup` | セクションタグ付きでコマンドを記録 |

---

## 設定

| 設定キー | デフォルト | 説明 |
|---|---|---|
| `htb.workspaceRoot` | `~/htb` | ボックスワークスペースを作成するルートディレクトリ |
| `htb.workspaceTemplate` | `standard` | スキャフォルドテンプレート：`minimal`（notes のみ）、`standard`（notes + scans + loot）、`full`（exploits + screenshots を追加） |
| `htb.vpn.openvpnPath` | *(自動検出)* | `openvpn` バイナリのパス。空の場合は PATH から自動検出 |
| `htb.vpn.configDirectory` | `~/htb/vpn` | `.ovpn` ファイルが格納されているディレクトリ |
| `htb.vpn.defaultConfig` | *(なし)* | プロンプトなしで使用されるデフォルトの `.ovpn` ファイル |
| `htb.vpn.elevationStrategy` | `auto` | 権限昇格方法：`auto`、`sudo`、`pkexec`、`none`、`windows-uac` |
| `htb.vpn.autoDisconnectOnTerminate` | `false` | マシン終了時に VPN を自動切断 |
| `htb.vpn.healthCheckIntervalSec` | `10` | VPN トンネルのヘルスチェック間隔（秒） |
| `htb.enum.autoImportFromTerminal` | `true` | ターミナルで検出されたスキャン出力を自動解析 |
| `htb.telemetry` | `false` | 匿名テレメトリ（デフォルト無効） |

---

## VPN に関する注意事項

- **Linux**: `sudo` または `pkexec` で自動昇格。root 実行時は昇格なしで動作します。
- **macOS**: `osascript` による GUI パスワードプロンプトで昇格します。
- **Windows**: `runas`（UAC プロンプト）で昇格します。[OpenVPN Community](https://openvpn.net/community-downloads/) インストーラーが必要です（OpenVPN Connect は非対応）。
- `script-security 2` 以上の `.ovpn` ファイルは警告が表示されます。HTB の設定ファイルでは通常の動作です。

---

## セキュリティ

- HTB App Token は **VS Code の Secret Storage**（OS キーチェーン）に保存されます。設定ファイルや平文ファイルには書き込まれません。
- パスワードとフラグはすべてのログと出力パネルでマスクされます。
- テレメトリは**デフォルトで無効**です。

脆弱性の報告ポリシーについては [SECURITY.md](SECURITY.md) をご覧ください。

---

## コントリビューション

コントリビューションを歓迎します！詳細は [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。

```sh
git clone https://github.com/long-910/vscode-htb-companion.git
cd vscode-htb-companion
npm install
npm run watch       # ウォッチモードでビルド
# VS Code で F5 を押して Extension Development Host を起動
```

---

## サポート

この拡張機能が役に立った場合は、開発支援をご検討ください：

- [GitHub Sponsors](https://github.com/sponsors/long-910)
- [Ko-fi](https://ko-fi.com/long910)

---

## ライセンス

[MIT](LICENSE) © long-910

# pi-omp-theme（pureages fork）

给 [pi](https://github.com/earendil-works/pi) 用的主题 + TUI 呈现扩展。这是
[QuangThai/pi-omp-theme](https://github.com/QuangThai/pi-omp-theme)（MIT）的**个人 fork**。

这个 fork 只动了**底部状态栏**和**启动画面**两处表现，其余部分（编辑器外框、工具输出框、消息渲染、
Titanium 主题色板、各种配置项）与上游完全一致。上游的说明和更新请见原仓库。

- 版本线：`1.1.0-fork.N`。上游最后合并的是 `1.0.12`，后续 fork 改动都带 `-fork.N` 后缀，
  和上游发布区分开。改动明细见 [CHANGELOG.md](CHANGELOG.md)。
- 运行时：Node.js ≥ 22.19，pi ≥ 0.83（每次渲染都会探测运行时接口，认不出来就回退官方原生渲染）

## 安装

两种方式任选一种，都**不需要 node 工具链**：`dist/` 是提交进版本库的构建产物，拉下来就能跑。
装好后在 pi 里 `/reload`（或直接开新会话），主题名是 `titanium`（暗）/ `titanium-light`（亮）。

### 方式 A：机器上有 git（推荐，能一键更新）

```bash
pi install git:github.com/pureages/pi-omp-theme
```

没装 git 就先装一个：

```powershell
winget install --id Git.Git -e --source winget   # Windows（装完要开新终端，PATH 才会刷新）
```

```bash
brew install git          # macOS
sudo apt install git      # Debian / Ubuntu
sudo dnf install git      # Fedora
```

以后更新一条命令搞定：

```bash
pi update --extensions
```

### 方式 B：没有 git、也不想装 git → 下载 ZIP + 本地路径安装

pi 的 local 源安装**只认一个路径**：不调用 git、不调用 npm、也不复制文件，所以下载解压到固定位置就行。

**Windows（PowerShell，一行一行复制执行）：**

```powershell
# 1) 下载最新 main 的 ZIP
Invoke-WebRequest -Uri "https://github.com/pureages/pi-omp-theme/archive/refs/heads/main.zip" -OutFile "$env:TEMP\pi-omp-theme.zip"

# 2) 解压到家目录并改名成 pi-omp-theme（先删旧目录，方便原地重新下载更新）
Remove-Item -Recurse -Force "$HOME\pi-omp-theme" -ErrorAction SilentlyContinue
Expand-Archive -Path "$env:TEMP\pi-omp-theme.zip" -DestinationPath $HOME -Force
Move-Item "$HOME\pi-omp-theme-main" "$HOME\pi-omp-theme"

# 3) 安装
pi install "$HOME\pi-omp-theme"
```

**macOS / Linux（bash）：**

```bash
# 1)+2) 下载 tar.gz，解压到家目录并改名成 pi-omp-theme
curl -L -o /tmp/pi-omp-theme.tar.gz https://github.com/pureages/pi-omp-theme/archive/refs/heads/main.tar.gz
rm -rf ~/pi-omp-theme && tar -xzf /tmp/pi-omp-theme.tar.gz -C ~ && mv ~/pi-omp-theme-main ~/pi-omp-theme

# 3) 安装
pi install ~/pi-omp-theme
```

更新：把上面 1~3 步重跑一遍，然后 `/reload`。（ZIP 里没有 `.git`，所以 `pi update --extensions` 管不到它。）

不习惯命令行也可以在仓库页面点 **`Code` → `Download ZIP`** 手动下载。

**注意事项**

- 解压位置定下来就**别再挪动或改名**，否则 pi 会报 `Path does not exist`。
- `pi install` 有时会把路径写成相对 `~/.pi/agent/settings.json` 的形式（例如 `..\..\foo\pi-omp-theme`），
  能用但难读。想干净就手动写绝对路径（JSON 里用正斜杠，Windows 也认）：

  ```json
  {
    "packages": ["C:/Users/<你的用户名>/pi-omp-theme"]
  }
  ```

### 包里有什么 / 只要主题、不要扩展

除主题与 omp TUI 扩展外，本包还带两个独立的小扩展（纯 TypeScript，放在 `extensions/`）：

- `hidden-thinking-label`：折叠的 thinking 块标签显示实时 token 数与 t/s，结束后显示 `Thought N tokens`；
- `titlebar-spinner`：agent 工作时在终端标题栏显示 braille 转圈。

安装后要单独开关这些扩展，用 `pi config`；只想要主题、不要任何扩展的话，可以在 `settings.json`
里过滤掉整个包的扩展（`source` 要写成**你实际用的那种**：方式 A 用 `git:...`，方式 B 用解压出来的路径）：

```json
{ "packages": [{ "source": "git:github.com/pureages/pi-omp-theme", "extensions": [] }] }
```

### 为什么 `dist/` 要入库

- `pi install git:...` 只做 `git clone` + `npm install --omit=dev`（本包没有依赖，所以不会产生
  `node_modules`），而 `pi.extensions` 指向的 `dist/extensions/pi-omp-theme.ts` 已经在仓库里；
- `pi update --extensions` 更新前会执行 `git clean -fdx`，未跟踪的构建产物会被删掉。

所以**改完源码要重新构建并提交 `dist/`**，否则别人（以及其他机器）装到的还是旧产物。见「本地开发」。

## 这个 fork 改了什么

### 状态栏

底部那一行左边是「模型 + 原生用量」，右边是「目录 + 上下文占用」：

```
⬢ deepseek-v4.1-flash · ◒ high | ↑3.1k ↓15 R2.6k CH90.9% $0.000        ~\Desktop\test\test7 | 0% used | 2.8K/1M
└────────────────── 靠左（左对齐）──────────────────┘                    └──────────── 靠右（右对齐）────────────┘
```

| 项目 | 上游 | 本 fork |
|---|---|---|
| 布局 | 左 `[model_effort, path, git, claude_context]`，右 `[]` | 左 `[model_effort, native_usage]`，右 `[path_plain, context_used]` |
| 用量 | 只有一个 `💲0.001` | 新增 `native_usage`，逐项照抄官方 footer：`↑in ↓out RcacheRead WcacheWrite CHhit% $cost` |
| 目录 | `📁` + 完整路径 | 新增 `path_plain`：**无图标**，家目录缩成 `~`，保留平台分隔符（`~\Desktop\test\test7`） |
| 上下文 | `[██████░░░░] │ 11% used │ 111.4K/1M`（带进度条） | 新增 `context_used`：去掉进度条，只留 `11% used │ 111.4K/1M` |
| 状态行下方 | 特意留 1 行空白（`bottomMargin: 1`） | `bottomMargin: 0`，紧贴终端最后一行 |
| 左右分组之间 | 会多印一个分隔符 | 只用空格分隔（官方 footer 也是纯空格） |
| 启动画面 | 自己的欢迎卡（logo / Welcome back! / Tips / Tool providers / Recent sessions） | `startup.mode: "off"`，交回官方 pi 的 `builtInHeader` |

两个关键实现都是**照抄官方 pi 的源码**，不是凭感觉写的：

- `native_usage` 的显示规则、数字格式（`999` / `1.3k` / `13k` / `2.3M`，小写 k）逐条对应官方
  `FooterComponent`；`CH` 取的是**最近一次 assistant 回合**的命中率，不是全会话平均。
- `formatCwdForFooter()` 是从官方 `modes/interactive/components/footer.ts` 原样搬过来的副本
  （`resolve` + `relative` + `isAbsolute` + 平台分隔符，`HOME || USERPROFILE`），已经和官方实现做过
  逐用例对照验证。

### 配色

| 位置 | 内容 | 语义 token | 默认值 |
|---|---|---|---|
| 左 | `⬢ 模型名` | `model` | 🟣 `#b48ce0` |
| 左 | `↑3.1k` | `usageInput` | 🔴 `#ff5c57` |
| 左 | `↓15` | `usageOutput` | 🟠 `#ff9f43` |
| 左 | `R2.6k` / `W…` | `usageCacheRead` | 🟡 `#e8c547` |
| 左 | `CH90.9%` | `usageCacheHit` | 🟢 `success`（跟随 pi 主题） |
| 左 | `$0.000` | `usageCost` | 🩵 `#3ed6d6` |
| 右 | `~\Desktop\test\test7` | `muted` | 跟随 pi 主题 |
| 右 | `0%` | `contextLow` / `contextMedium` / `contextHigh` / `contextCritical` | 随占用率变 |
| 右 | `used` | `contextUsed` | 🟠 `#ff9f43` |
| 右 | `2.8K/1M` | `contextTokens` | 🩵 `#3ed6d6` |

`usageCacheHit` 用的是 pi 主题自己的 `success`，所以换 `titanium-light` 时会自动跟着变绿；其余是固定
hex，pi 主题里没有对应的语义色。想改颜色不用动代码，在 `~/.pi/agent/settings.json` 里覆盖即可：

```json
{
  "piOmpTheme": {
    "theme": {
      "colors": {
        "model": "#c792ea",
        "usageInput": "#ff6b6b"
      }
    }
  }
}
```

`/pi-omp-theme` 命令可以在 TUI 里交互式改这些配置。

### 关于预设

上游的预设（`default` / `minimal` / `compact` / `full` / `ascii` / `native` / `claude` / `omp`）都还在，
默认预设是 `claude`，上面这些改动就落在 `claude` 预设上（`domain/config-presets.ts` 和
`domain/status-presets.ts` 里标了 `fork:` 注释的地方）。`native_usage` / `path_plain` / `context_used`
是新增的段，上游原有的 `path`（带 `📁`）、`claude_context`（带进度条）等段都**原样保留**，
想要回原来的样子，改一下预设的 layout 就行。

## 本地开发

```bash
npm install                 # 装 devDependencies（tsup / typescript / tsc 测试链）
npm run dev                 # tsup --watch，改完源码自动重建 dist/
npm run build               # 一次性构建
npm test                    # 76 个用例（tsc 编译后跑 node:test）
npm run typecheck           # tsc --noEmit
npm run depcruise           # 分层依赖检查
npm run check               # 上面全部 + build + package:smoke
```

改完源码后：

```bash
npm run build && git add dist && git commit -m "..." && git push
pi update --extensions      # 让本机装的那份（~/.pi/agent/git/...）跟上
# 或者用本地路径开发：pi install C:/path/to/pi-omp-theme，改完 /reload 立即生效
```

源码在 `extension-src/omp-theme/`，分层是 `shared/ → domain/ → features/ → app/ → pi/`，
依赖方向由 `dependency-cruiser.config.cjs` 强制：

| 目录 | 职责 |
|---|---|
| `shared/` | 无状态工具：ANSI 宽度、盒子绘制、路径处理、diff |
| `domain/` | 纯逻辑：状态栏渲染与配色（`status.ts`、`status-renderer.ts`、`theme.ts`）、配置解析 |
| `features/` | 具体界面：`startup/`（启动头）、`status-line/`、`editor/`、`messages/`、`tools/` |
| `app/` | 装配与运行时（快照、命令、配置存储） |
| `pi/` | 唯一接触 pi API 的一层（生命周期、兼容性补丁、会话用量） |

其他文件：`themes/` 两个主题 JSON、`extensions/` 两个独立扩展（`hidden-thinking-label.ts`、
`titlebar-spinner.ts`，不在 omp bundle 内，由 `pi.extensions` 单独声明）、`tests/` 测试
（`node scripts/run-tests.mjs`）、`scripts/package-smoke.mjs` 打包/加载冒烟检查、
`docs/releasing.md` 上游的发布流程（本 fork 不发布到 npm）。

## 许可

MIT，见 [LICENSE](LICENSE)。上游版权归 QuangThai；本 fork 的修改同样以 MIT 发布。

改动记录见 [CHANGELOG.md](CHANGELOG.md)：最上面是 fork 自己的版本线
（`1.1.0-fork.2`，基于最后合并的上游版本 `1.0.12`），下面全是上游历史，原样保留。

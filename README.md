# pi-omp-theme（pureages fork）

给 [pi](https://github.com/earendil-works/pi) 用的主题 + TUI 呈现扩展。这是
[QuangThai/pi-omp-theme](https://github.com/QuangThai/pi-omp-theme)（MIT）的**个人 fork**。

这个 fork 只动了**底部状态栏**和**启动画面**两处表现，其余部分（编辑器外框、工具输出框、消息渲染、
Titanium 主题色板、各种配置项）与上游完全一致。上游的说明和更新请见原仓库。

- 运行时：Node.js ≥ 22.19，pi ≥ 0.83（每次渲染都会探测运行时接口，认不出来就回退官方原生渲染）

## 安装

```bash
pi install git:github.com/pureages/pi-omp-theme
```

**`dist/` 是提交进版本库的构建产物**，所以 git 源开箱即用，目标机器不需要 node 工具链：

- `pi install git:...` 只做 `git clone` + `npm install --omit=dev`（没有任何依赖，不会装 node_modules），
  而 `pi.extensions` 指向的 `dist/extensions/pi-omp-theme.ts` 已经在仓库里；
- `pi update --extensions` 更新前会执行 `git clean -fdx`，未跟踪的构建产物会被删掉，所以必须入库。

因此**改完源码要重新构建并提交 `dist/`**，否则别人（以及别的机器）装到的还是旧产物。见下方「本地开发」。

装好后在 pi 里用 `/reload`，或直接开新会话。主题名是 `titanium`（暗）/ `titanium-light`（亮）。

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
npm run check               # 上面全部 + build + package:smoke（prepack 也跑这个）
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

其他文件：`themes/` 两个主题 JSON、`tests/` 测试（`node scripts/run-tests.mjs`）、
`scripts/package-smoke.mjs` 打包/加载冒烟检查、`docs/releasing.md` 上游的发布流程（本 fork 不发布到 npm）。

## 许可

MIT，见 [LICENSE](LICENSE)。上游版权归 QuangThai；本 fork 的修改同样以 MIT 发布。
改动记录见 [CHANGELOG.md](CHANGELOG.md)（只到上游 `v1.0.12`）与 git log。

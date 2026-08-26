# Otter

跨平台桌面应用，基于 Electron + React + TypeScript + Tailwind CSS + shadcn/ui 构建。

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面运行时 | Electron | 43 |
| UI 框架 | React | 19 |
| 语言 | TypeScript | 5.8 |
| 构建工具 | Vite | 8 |
| 打包分发 | Electron Forge | 7 |
| 样式 | Tailwind CSS | v4 |
| 组件库 | shadcn/ui (base-nova) | - |
| UI 原语 | Radix UI / Base UI | - |
| 图标 | lucide-react | - |
| 字体 | Geist Variable | - |
| 样式工具 | clsx + tailwind-merge + CVA | - |

## 开发

### Node 版本

项目使用 Node.js 24。进入项目后先切换到指定版本：

```bash
nvm use
```

### 安装依赖

```bash
npm ci
```

### 启动开发环境

```bash
npm start
```

### 代码检查

```bash
npm run lint
```

## 构建与打包

### 预打包（不生成安装包）

```bash
npm run package
```

### 生成安装包

```bash
# 所有平台
npm run make

# macOS ARM64
npm run make:mac-arm64

# Windows x64
npm run make:win-x64
```

生成的安装包位于 `out/make/`。

## 发布到 GitHub Releases

项目通过 GitHub Actions 自动发布。推送 `v*` tag 后，会自动构建并发布 GitHub Release。

当前 Release 只发布 Windows/macOS 安装包：

- macOS ARM64：`.dmg`
- Windows x64：`.exe`

> GitHub Release 页面仍会显示 GitHub 自动生成的 `Source code (zip/tar.gz)`，这是 GitHub 默认行为；项目 workflow 上传的正式安装包只包含 `.dmg` 和 `.exe`。

### 日常开发提交流程

```bash
git add .
git commit -m "描述本次改动"
git push
```

### 发布新版本

```bash
# 修复、小改动：1.0.0 -> 1.0.1
npm run release:patch

# 新功能：1.0.0 -> 1.1.0
npm run release:minor

# 破坏性大版本：1.0.0 -> 2.0.0
npm run release:major
```

这些命令会自动完成：

1. 更新 `package.json` 和 `package-lock.json` 中的版本号
2. 创建版本提交
3. 创建 `vX.Y.Z` Git tag
4. 执行 `git push --follow-tags`
5. 触发 GitHub Actions 构建 Windows/macOS 安装包
6. 自动创建 GitHub Release 并上传 `.dmg` / `.exe`

### 发布前检查

```bash
npm run lint
npm run make:mac-arm64
```

确认本地 macOS 安装包能正常生成后，再执行对应的 `release:*` 命令。

## 项目结构

```
src/
├── main.ts              # Electron 主进程入口
├── preload.ts           # Preload 脚本（IPC 桥接层）
├── renderer.tsx         # 渲染进程入口（React 挂载点）
├── index.css            # 全局样式（Tailwind base）
├── components/
│   ├── ui/              # shadcn 生成的组件
│   ├── sidebar-nav.tsx  # 侧边栏导航
│   ├── page-general.tsx # 通用设置页面
│   ├── page-appearance.tsx # 外观设置页面
│   └── settings-item.tsx   # 设置项组件
└── lib/
    └── utils.ts         # cn() 等工具函数

assets/
├── icon-codex-light.png # 通用图标
├── icon-codex-light.icns # macOS 图标
└── icon-codex-light.ico # Windows 图标
```

## 开发规范

### 样式

- 只用 Tailwind 工具类写样式，禁止编写任何 CSS 文件
- 使用 shadcn 语义色 Token，禁止使用 Tailwind 的具体颜色值
- 禁止 inline style
- 条件样式使用 `cn()` 工具函数

### 组件

- UI 原子组件只从 `src/components/ui/`（shadcn）取用
- 添加新 shadcn 组件：`npx shadcn add <component-name>`
- 统一使用 `lucide-react` 图标

### Electron

- 新功能先考虑放 Main Process，再通过 Preload 暴露给 Renderer
- 不要在 Renderer 直接使用 `require` 或 `fs`，必须通过 IPC 调用
- IPC Channel 使用 `kebab-case` 命名

更多规范请参考 [AGENTS.md](./AGENTS.md) 和 [DESIGN.md](./DESIGN.md)。

## 许可证

MIT

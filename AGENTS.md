# AGENTS.md

> 本文件面向所有 AI 编码助手（Claude、Cursor、Gemini、Kiro 等），描述项目技术栈、架构约定和编码规范。
> 在对本项目进行任何代码修改前，请先阅读并遵守以下规则。

---

## 项目概览

基于 **Electron** 的跨平台桌面端应用，渲染层使用 React + TypeScript，UI 使用 Tailwind CSS + shadcn/ui。

---

## 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 桌面运行时 | Electron | 43 |
| UI 框架 | React | 19 |
| 语言 | TypeScript | 5.8 |
| 构建工具 | Vite | 8 |
| 打包分发 | Electron Forge | 7 |
| 样式 | Tailwind CSS | v4 |
| 组件库 | shadcn/ui (base-nova) | — |
| UI 原语 | Radix UI / Base UI | — |
| 图标 | lucide-react | — |
| 字体 | Geist Variable | — |
| 样式工具 | clsx + tailwind-merge + CVA | — |

---

## 目录结构

```
src/
├── main.ts           # Electron Main Process 入口
├── preload.ts        # Preload 脚本（IPC 桥接层）
├── renderer.tsx      # Renderer 渲染进程入口（React 挂载点）
├── index.css         # 全局样式（Tailwind base）
├── components/
│   └── ui/           # shadcn 生成的组件（通过 CLI 管理，勿手动大改）
└── lib/
    └── utils.ts      # cn() 等工具函数
```

构建产物输出到 `.vite/`，打包产物输出到 `out/`。

---

## Electron 进程架构

### Main Process — `src/main.ts`
- 只能使用 Node.js API 和 Electron 主进程 API（`app`、`BrowserWindow`、`ipcMain` 等）
- 不能访问 DOM
- 文件系统、系统调用、敏感网络请求必须放在这里

### Preload — `src/preload.ts`
- 通过 `contextBridge.exposeInMainWorld` 向 Renderer 暴露 IPC 接口
- **禁止**直接把 `require` 或整个 Node API 暴露出去
- 所有暴露的方法必须有明确的 TypeScript 类型定义

### Renderer Process — `src/renderer.tsx` 及所有 React 组件
- 纯前端沙盒环境，**不能**直接调用 Node.js API
- 与 Main Process 通信只能通过 Preload 暴露的 `window.xxx` 接口
- 优先使用 `ipcRenderer.invoke` / `ipcMain.handle` 双向模式
- 单向推送用 `mainWindow.webContents.send` / `ipcRenderer.on`

### IPC Channel 命名
- 使用 `kebab-case`，如 `open-file-dialog`、`read-config`、`save-file`

---

## 编码规范

### 文件命名
- 所有文件名使用**小写 + 连字符**（kebab-case），禁止驼峰命名
- 组件文件：`user-profile.tsx`、`sidebar-nav.tsx`
- 工具文件：`format-date.ts`、`use-theme.ts`
- 页面文件：`settings-page.tsx`、`home-page.tsx`
- 常量/类型文件：`app-types.ts`、`ipc-channels.ts`

```
// ✅ 正确
src/components/user-profile.tsx
src/hooks/use-window-size.ts
src/lib/format-date.ts

// ❌ 错误
src/components/UserProfile.tsx
src/hooks/useWindowSize.ts
src/lib/formatDate.ts
```

### TypeScript
- 禁止隐式 `any`（`noImplicitAny: true`）
- 路径引用统一用 `@/` 别名，不写 `../../` 相对路径
- 组件文件用 `.tsx`，纯逻辑文件用 `.ts`

### React 组件
- 函数组件 + Hooks，不用 Class 组件
- 自定义业务组件放 `src/components/`（非 `ui/` 子目录）
- shadcn 组件通过 CLI 添加：`npx shadcn add <component-name>`

### 样式
- 优先 Tailwind 工具类
- 条件样式组合使用 `cn()` 工具（来自 `@/lib/utils`）
- 不引入额外 CSS-in-JS 方案

---

## 开发命令

```bash
npm start                # 启动开发环境
npm run lint             # ESLint 检查
npm run package          # 打包（不生成安装包）
npm run make             # 打包并生成安装包
npm run make:mac-arm64   # 生成 macOS ARM64 .dmg
```

---

## 安全约束

- `forge.config.ts` 中的 Fuses 配置（RunAsNode 禁用、Cookie 加密等）**不能随意修改**
- 新增 native 模块需确认 `@electron-forge/plugin-auto-unpack-natives` 能正确处理
- 应用已启用 ASAR 完整性校验

---

## AI 助手注意事项

1. **不要在 Renderer 直接用 `require` 或 `fs`**，必须通过 IPC 调用 Main Process
2. **不要修改 `src/components/ui/` 内的组件**，应扩展或组合，不要内联覆盖
3. **新功能先考虑放 Main Process**，再通过 Preload 暴露给 Renderer
4. **样式改动用 Tailwind 类**，不要新增 inline style 或 `.module.css`
5. **类型要完整**，尤其是 `contextBridge` 暴露的接口和 IPC 的 payload 类型

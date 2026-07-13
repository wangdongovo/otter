# DESIGN.md

> UI 设计与样式规范。所有界面开发必须严格遵守本文件，AI 助手在生成任何 UI 代码前请先阅读。

---

## 核心原则

1. **只用 Tailwind 工具类写样式**，禁止编写任何 CSS 文件（`.css`、`.module.css`、`styled-components`、CSS-in-JS 等）
2. **组件来源唯一**：UI 原子组件只从 `src/components/ui/`（shadcn）取用，不手写基础组件
3. **禁止 inline style**：不写 `style={{ color: 'red' }}` 这类内联样式
4. **CSS 变量由 shadcn 主题管理**，不自行在 `index.css` 中新增 CSS 变量

---

## 颜色系统

使用 shadcn 语义色 Token，**禁止使用 Tailwind 的具体颜色值**（如 `text-gray-500`、`bg-blue-600`）。

| Token | 用途 |
|-------|------|
| `bg-background` | 页面/容器背景 |
| `text-foreground` | 主要文字 |
| `bg-card` / `text-card-foreground` | 卡片背景/文字 |
| `bg-primary` / `text-primary-foreground` | 主操作色 |
| `bg-secondary` / `text-secondary-foreground` | 次级操作色 |
| `bg-muted` / `text-muted-foreground` | 弱化内容、辅助文字 |
| `bg-accent` / `text-accent-foreground` | 高亮/悬停状态 |
| `bg-destructive` / `text-destructive-foreground` | 危险/删除操作 |
| `border` | 默认边框色 |
| `ring` | 焦点环颜色 |

```tsx
// ✅ 正确
<p className="text-muted-foreground">提示文字</p>
<div className="bg-card border rounded-lg">...</div>

// ❌ 错误
<p className="text-gray-500">提示文字</p>
<div style={{ background: '#fff' }}>...</div>
```

---

## 排版

字体已全局配置为 **Geist Variable**，无需手动指定。

| 场景 | 类名 |
|------|------|
| 页面标题 | `text-2xl font-bold` 或 `text-3xl font-bold` |
| 区块标题 | `text-lg font-semibold` |
| 正文 | `text-sm`（默认）|
| 辅助/描述文字 | `text-sm text-muted-foreground` |
| 标签 | `text-xs text-muted-foreground` |

---

## 间距

使用 Tailwind 间距比例，**不写任意值**（如 `p-[13px]`）。

- 组件内部 padding：`p-4`、`px-4 py-2`
- 组件间距：`gap-2`、`gap-4`、`gap-6`
- 区块间距：`space-y-4`、`space-y-6`
- 页面边距：`p-6` 或 `p-8`

---

## 圆角

遵循 shadcn 变量，使用语义圆角类：

| 类名 | 说明 |
|------|------|
| `rounded-md` | 默认（按钮、输入框） |
| `rounded-lg` | 卡片、面板 |
| `rounded-full` | 头像、徽标 |

---

## 组件使用规范

### 按钮

只用 shadcn `Button` 组件，通过 `variant` 控制样式，不自定义按钮。

```tsx
import { Button } from '@/components/ui/button'

// 可用 variant
<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="link">Link</Button>

// 尺寸
<Button size="sm">小</Button>
<Button size="default">默认</Button>
<Button size="lg">大</Button>
<Button size="icon"><Icon /></Button>
```

### 表单元素

使用 shadcn 提供的 `Input`、`Select`、`Checkbox`、`Switch` 等，不手写 `<input>` 裸标签。

### 卡片

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>内容</CardContent>
</Card>
```

### 添加新 shadcn 组件

```bash
npx shadcn add <component-name>
# 组件自动生成到 src/components/ui/
```

**不要复制粘贴 shadcn 源码手动创建文件。**

---

## 图标

统一使用 `lucide-react`，与 shadcn 默认配置一致。

```tsx
import { Settings, X, ChevronRight } from 'lucide-react'

// 尺寸用 className 控制，不用 size prop 以外的方式
<Settings className="h-4 w-4" />
```

---

## 布局

- 整体布局使用 Flexbox（`flex`）或 Grid（`grid`），不用 `position: absolute` 做常规布局
- 全屏容器：`min-h-screen`
- 居中：`flex items-center justify-center`
- 响应式：优先 mobile-first，使用 `sm:`、`md:`、`lg:` 断点

---

## 暗色模式

shadcn CSS 变量已支持暗色模式，Tailwind 类中使用 `dark:` 前缀补充暗色覆盖，**不单独维护一套暗色 CSS**。

```tsx
// ✅ 依赖 shadcn token（自动适配暗色）
<div className="bg-background text-foreground">

// ⚠️ 需要手动暗色时才用 dark: 前缀
<div className="bg-white dark:bg-zinc-900">
```

---

## 条件样式

使用 `cn()` 工具函数（来自 `@/lib/utils`）组合条件类名，不拼接字符串。

```tsx
import { cn } from '@/lib/utils'

// ✅ 正确
<div className={cn('rounded-lg p-4', isActive && 'bg-accent', className)}>

// ❌ 错误
<div className={`rounded-lg p-4 ${isActive ? 'bg-accent' : ''}`}>
```

---

## 禁止清单

| 禁止行为 | 替代方案 |
|----------|----------|
| 新建 `.css` / `.module.css` 文件 | 全用 Tailwind 类 |
| 使用 `style={{}}` 内联样式 | Tailwind 类 |
| 使用具体颜色值（`text-red-500`） | shadcn 语义 Token |
| 手写 `<button>`、`<input>` 裸标签 | shadcn 组件 |
| 使用任意值（`w-[123px]`） | 标准间距比例 |
| 引入第三方 UI 库（antd、MUI 等） | 只用 shadcn + Tailwind |

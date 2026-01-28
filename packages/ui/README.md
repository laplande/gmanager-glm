# @gmanager/ui

<div align="center">

**React UI component library for GManager**

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Documentation

### Overview

`@gmanager/ui` is a comprehensive React component library built for GManager applications. It provides accessible, customizable, and beautiful UI components using Radix UI primitives and TailwindCSS.

### Installation

```bash
pnpm add @gmanager/ui
```

### Peer Dependencies

```json
{
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "@gmanager/shared": "workspace:*"
}
```

### Features

- **Accessibility**: WCAG 2.1 AA compliant components
- **Customization**: TailwindCSS for easy theming
- **Type Safety**: Full TypeScript support
- **Modern Design**: Clean, minimal aesthetic
- **Dark Mode**: Built-in dark theme support
- **Drag & Drop**: Field ordering with @dnd-kit
- **TOTP Support**: QR code generation and display

### Usage

#### Setup Styles

Import the component library styles in your app's entry point:

```typescript
// main.tsx
import '@gmanager/ui/styles.css';
```

#### Import Components

```typescript
import { Button, Input, Dialog } from '@gmanager/ui';
```

### Components

#### Button

Basic button component with variants.

```tsx
import { Button } from '@gmanager/ui';

export function MyComponent() {
  return (
    <Button variant="default">Click me</Button>
    <Button variant="destructive">Delete</Button>
    <Button variant="outline">Cancel</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
  );
}
```

**Props:**
```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}
```

#### Input

Text input with label and error states.

```tsx
import { Input } from '@gmanager/ui';

export function MyForm() {
  return (
    <Input
      type="email"
      placeholder="user@example.com"
      label="Email"
      error="Invalid email format"
      required
    />
  );
}
```

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}
```

#### Dialog

Modal dialog with overlay.

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader } from '@gmanager/ui';

export function MyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <h2>Dialog Title</h2>
        </DialogHeader>
        <p>Dialog content goes here.</p>
      </DialogContent>
    </Dialog>
  );
}
```

#### Select

Dropdown select component.

```tsx
import { Select, SelectTrigger, SelectContent, SelectItem } from '@gmanager/ui';

export function MySelect() {
  return (
    <Select value="option1" onValueChange={(value) => console.log(value)}>
      <SelectTrigger>
        <SelectValue placeholder="Select option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

#### Checkbox

Checkbox with label.

```tsx
import { Checkbox } from '@gmanager/ui';

export function MyCheckbox() {
  return (
    <Checkbox
      id="terms"
      label="I agree to the terms"
      checked={true}
      onCheckedChange={(checked) => console.log(checked)}
    />
  );
}
```

#### Toast

Notification toast.

```tsx
import { ToastProvider, Toast, ToastViewport } from '@gmanager/ui';
import { toast } from '@gmanager/ui';

export function MyApp() {
  return (
    <ToastProvider>
      <Button onClick={() => toast.success('Saved successfully!')}>
        Show Toast
      </Button>
      <ToastViewport />
    </ToastProvider>
  );
}
```

#### QRCode

QR code display for TOTP secrets.

```tsx
import { QRCode } from '@gmanager/ui';

export function MyQRCode() {
  return (
    <QRCode
      value="otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP"
      size={200}
      level="M"
    />
  );
}
```

**Props:**
```typescript
interface QRCodeProps {
  value: string;       // otpauth URL or TOTP secret
  size?: number;       // Size in pixels (default: 200)
  level?: 'L' | 'M' | 'Q' | 'H';  // Error correction level
}
```

#### DraggableList

Sortable list with drag & drop.

```tsx
import { DraggableList, DraggableItem } from '@gmanager/ui';

export function MyDraggableList() {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);

  return (
    <DraggableList
      items={items}
      onReorder={setItems}
      renderItem={(item, index) => (
        <DraggableItem id={item} index={index}>
          <div className="p-4 bg-white rounded shadow">
            {item}
          </div>
        </DraggableItem>
      )}
    />
  );
}
```

### Theming

#### Light Theme (Default)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --popover: 0 0% 100%;
  --popover-foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 221.2 83.2% 53.3%;
  --radius: 0.5rem;
}
```

#### Dark Theme

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
}
```

### Utility Functions

#### `cn()`

Merge TailwindCSS classes with clsx and tailwind-merge.

```typescript
import { cn } from '@gmanager/ui';

// Usage
className={cn(
  'base-class',
  isActive && 'active-class',
  'another-class'
)}
```

#### `toast()`

Show notification toasts.

```typescript
import { toast } from '@gmanager/ui';

// Success
toast.success('Account created successfully');

// Error
toast.error('Failed to delete account');

// Info
toast.info('Importing accounts...');

// Warning
toast.warning('Password is weak');

// Custom
toast({
  title: 'Custom Toast',
  description: 'With custom description',
  variant: 'default'
});
```

### Icons

Icons from Lucide React:

```tsx
import { Plus, Trash, Edit, Search } from '@gmanager/ui';

export function MyComponent() {
  return (
    <div>
      <Plus className="h-5 w-5" />
      <Trash className="h-5 w-5 text-red-500" />
      <Edit className="h-5 w-5" />
      <Search className="h-5 w-5" />
    </div>
  );
}
```

### Composition Patterns

#### Form with Validation

```tsx
import { Input, Button } from '@gmanager/ui';

export function AccountForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Invalid email');
      return;
    }
    // Submit...
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        type="email"
        label="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        required
      />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

#### Dialog with Form

```tsx
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, Input, Button } from '@gmanager/ui';

export function CreateAccountDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Account</DialogTitle>
        </DialogHeader>
        <form>
          <Input label="Email" required />
          <Input label="Password" type="password" />
          <Button type="submit">Create</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

#### Accessible Card Grid

```tsx
import { Button } from '@gmanager/ui';

export function AccountGrid({ accounts }: { accounts: Account[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => (
        <article
          key={account.id}
          className="p-4 bg-white rounded-lg shadow hover:shadow-md transition"
        >
          <h3 className="font-semibold">{account.email}</h3>
          <p className="text-sm text-muted-foreground">{account.year}</p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline">Edit</Button>
            <Button size="sm" variant="ghost">Delete</Button>
          </div>
        </article>
      ))}
    </div>
  );
}
```

### Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard Navigation**: All components fully keyboard accessible
- **ARIA Labels**: Proper ARIA attributes on interactive elements
- **Focus Management**: Clear focus indicators and logical tab order
- **Screen Reader**: Semantic HTML and ARIA descriptions
- **Color Contrast**: Minimum 4.5:1 contrast ratio

### Styling

#### TailwindCSS Integration

Components use TailwindCSS utility classes. Customize via `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... more colors
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
};
```

### Development

```bash
# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint
```

### Component Library Structure

```
packages/ui/src/
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Dialog.tsx
│   │   ├── Select.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Toast.tsx
│   │   └── ...
│   ├── account/
│   │   ├── AccountCard.tsx
│   │   ├── AccountForm.tsx
│   │   └── AccountList.tsx
│   └── auth/
│       ├── LoginForm.tsx
│       └── VaultSetup.tsx
├── lib/
│   ├── utils.ts          # cn() helper
│   └── toast.ts          # Toast API
├── styles/
│   └── globals.css       # Global styles
└── index.ts              # Barrel exports
```

### Best Practices

1. **Composition**: Compose components together rather than nesting
2. **Controlled Props**: Use controlled components for form inputs
3. **Error Boundaries**: Wrap components in error boundaries
4. **Loading States**: Show loading indicators during async operations
5. **Accessible Labels**: Always provide labels for form inputs

### Dependencies

**Direct Dependencies:**
- `react`: ^19.0.0
- `react-dom`: ^19.0.0
- `@radix-ui/react-*`: Radix UI primitives
- `@dnd-kit`: Drag & drop functionality
- `class-variance-authority`: Component variants
- `tailwind-merge`: Merge Tailwind classes
- `qrcode.react`: QR code generation
- `lucide-react`: Icon library

**Peer Dependencies:**
- `@gmanager/shared`: workspace:^
- `tailwindcss`: ^3.4.0

### License

MIT

---

<a name="中文"></a>

## 中文文档

### 概述

`@gmanager/ui` 是为 GManager 应用构建的综合 React 组件库。它使用 Radix UI 原语和 TailwindCSS 提供可访问、可定制和美观的 UI 组件。

### 安装

```bash
pnpm add @gmanager/ui
```

### 功能

- **可访问性**：WCAG 2.1 AA 合规组件
- **定制化**：TailwindCSS 轻松主题化
- **类型安全**：完整 TypeScript 支持
- **现代设计**：简洁、最小化美学
- **深色模式**：内置深色主题支持
- **拖放**：使用 @dnd-kit 进行字段排序
- **TOTP 支持**：二维码生成和显示

### 使用方法

#### 设置样式

在应用入口点导入组件库样式：

```typescript
import '@gmanager/ui/styles.css';
```

#### 导入组件

```typescript
import { Button, Input, Dialog } from '@gmanager/ui';
```

### 组件

[参见上方英文部分的详细组件文档]

主要组件：
- **Button** - 按钮组件
- **Input** - 输入框
- **Dialog** - 模态对话框
- **Select** - 下拉选择
- **Checkbox** - 复选框
- **Toast** - 通知提示
- **QRCode** - 二维码显示
- **DraggableList** - 可拖排序列表

### 主题

#### 亮色主题（默认）

[参见上方英文部分的 CSS 变量]

#### 深色主题

[参见上方英文部分的 CSS 变量]

### 工具函数

#### `cn()`

合并 TailwindCSS 类名

```typescript
import { cn } from '@gmanager/ui';

className={cn(
  'base-class',
  isActive && 'active-class'
)}
```

#### `toast()`

显示通知提示

```typescript
import { toast } from '@gmanager/ui';

toast.success('操作成功');
toast.error('操作失败');
```

### 可访问性

所有组件遵循 WCAG 2.1 AA 指南：
- 完全键盘导航
- 正确的 ARIA 标签
- 清晰的焦点指示器
- 屏幕阅读器支持
- 颜色对比度符合标准

### 开发

```bash
# 构建
pnpm build

# 测试
pnpm test

# 代码检查
pnpm lint
```

---

<div align="center">

**Package Version: 0.1.0**

**Last Updated: 2025-01-27**

</div>

# GManager Development Guide / 开发指南

<div align="center">

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Development Guide

### Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment Setup](#development-environment-setup)
3. [Project Structure](#project-structure)
4. [Code Organization](#code-organization)
5. [Testing Guidelines](#testing-guidelines)
6. [Building and Deployment](#building-and-deployment)
7. [Contributing Guidelines](#contributing-guidelines)
8. [Coding Standards](#coding-standards)
9. [Troubleshooting](#troubleshooting)

---

### Getting Started

#### Prerequisites

Before setting up the development environment, ensure you have the following installed:

**Required:**
- **Node.js**: >= 20.0.0 ([Download](https://nodejs.org/))
- **pnpm**: >= 9.0.0 (`npm install -g pnpm`)
- **Git**: Latest version

**For Desktop Development:**
- **Rust**: >= 1.70 ([Install](https://www.rust-lang.org/tools/install))
- **System Dependencies**:
  - **Linux**:
    ```bash
    sudo apt update
    sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev \
                     libayatana-appindicator3-dev librsvg2-dev
    ```
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: WebView2 Runtime (usually pre-installed on Windows 10+)

**Optional:**
- **VS Code**: Recommended IDE with extensions
- **Docker**: For containerized development

---

### Development Environment Setup

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gmanager-glm.git
cd gmanager-glm
```

#### 2. Install Dependencies

```bash
# Install all workspace dependencies
pnpm install
```

This will install dependencies for all packages and applications.

#### 3. Set Up Your IDE

**VS Code (Recommended):**

Install these extensions:
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Rust Analyzer
- Tauri
- Tailwind CSS IntelliSense

**Recommended VS Code Settings:**

Create `.vscode/settings.json`:
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "rust-analyzer.cargo.features": "all",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

#### 4. Verify Installation

```bash
# Check TypeScript compilation
pnpm --filter './packages/**' build

# Run tests
pnpm test

# Run linter
pnpm lint
```

---

### Project Structure

#### Workspace Layout

```
gmanager-glm/
├── apps/                    # Application implementations
│   ├── desktop/            # Tauri desktop app
│   │   ├── src/           # React frontend
│   │   ├── src-tauri/     # Rust backend
│   │   └── package.json
│   │
│   └── web/               # Express.js web app
│       ├── src/           # React frontend
│       ├── server/        # Express backend
│       └── package.json
│
├── packages/              # Shared packages
│   ├── shared/           # TypeScript types & constants
│   ├── crypto/           # Encryption utilities
│   ├── parser/           # Account parser
│   └── ui/               # UI components
│
├── docs/                 # Documentation
├── package.json          # Root config
└── pnpm-workspace.yaml   # Workspace config
```

#### Package Responsibilities

**@gmanager/shared**
- TypeScript interfaces for all domain entities
- Application-wide constants
- No runtime logic (types only)
- Imported by all other packages

**@gmanager/crypto**
- Cross-platform encryption utilities
- Web-compatible implementations
- No backend-specific code
- Used by both desktop and web

**@gmanager/parser**
- Account text parsing logic
- Field detection and classification
- Confidence scoring
- Pure functions, no side effects

**@gmanager/ui**
- Reusable React components
- TailwindCSS styling
- Radix UI primitives
- Design system tokens

---

### Code Organization

#### Desktop App Structure

**Frontend (apps/desktop/src)**

```
src/
├── api/                    # Tauri command wrappers
│   ├── accounts.ts        # Account API calls
│   ├── auth.ts            # Auth API calls
│   ├── groups.ts          # Group API calls
│   └── tags.ts            # Tag API calls
│
├── components/             # React components
│   ├── accounts/          # Account-related components
│   │   ├── AccountList.tsx
│   │   ├── AccountCard.tsx
│   │   └── AccountForm.tsx
│   ├── auth/              # Authentication components
│   │   ├── LoginForm.tsx
│   │   └── VaultSetup.tsx
│   └── ui/                # Basic UI components
│       ├── Button.tsx
│       └── Input.tsx
│
├── hooks/                  # Custom React hooks
│   ├── useAccounts.ts
│   ├── useAuth.ts
│   └── useTOTP.ts
│
├── i18n/                   # Internationalization
│   ├── en.json
│   └── zh.json
│
├── pages/                  # Page components
│   ├── Dashboard.tsx
│   ├── Accounts.tsx
│   └── Settings.tsx
│
├── stores/                 # Zustand stores
│   ├── authStore.ts
│   └── accountStore.ts
│
└── main.tsx               # Entry point
```

**Backend (apps/desktop/src-tauri/src)**

```
src/
├── main.rs                # Tauri app entry, command registration
├── lib.rs                 # Module declarations
├── auth.rs                # Vault & session management
├── accounts.rs            # Account CRUD operations
├── groups.rs              # Group management
├── tags.rs                # Tag management
├── crypto/                # Encryption module
│   ├── mod.rs
│   └── aes_gcm.rs
└── db/                    # Database module
    ├── mod.rs
    ├── models.rs
    └── schema.rs
```

#### Web App Structure

**Frontend (apps/web/src)**

Similar to desktop, but uses REST API instead of Tauri commands.

**Backend (apps/web/server)**

```
server/
├── index.ts               # Express server entry
├── routes/                # API routes
│   ├── auth.ts
│   ├── accounts.ts
│   ├── groups.ts
│   └── tags.ts
├── middleware/            # Express middleware
│   ├── auth.ts
│   └── errors.ts
├── database.ts            # SQLite connection
└── crypto.ts              # Server-side encryption
```

---

### Testing Guidelines

#### Test Structure

```bash
gmanager-glm/
├── packages/
│   ├── shared/
│   │   └── src/
│   │       └── types/
│   │           ├── account.test.ts
│   │           └── database.test.ts
│   ├── crypto/
│   │   └── src/
│   │       ├── encryption.test.ts
│   │       └── key-derivation.test.ts
│   └── parser/
│       └── src/
│           └── parser.test.ts
│
└── apps/
    ├── desktop/
    │   └── src/
    │       └── components/
    │           └── AccountForm.test.tsx
    └── web/
        └── src/
            └── components/
                └── AccountList.test.tsx
```

#### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/shared
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage

# Run tests for specific file
pnpm test packages/parser/src/parser.test.ts
```

#### Writing Tests

**Unit Tests (Vitest):**

```typescript
// packages/parser/src/parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseAccounts } from './parser';

describe('parseAccounts', () => {
  it('should parse account from text', () => {
    const text = `
      Email: user@example.com
      Password: secret123
      Year: 2024
    `;

    const accounts = parseAccounts(text);

    expect(accounts).toHaveLength(1);
    expect(accounts[0].email).toBe('user@example.com');
    expect(accounts[0].password).toBe('secret123');
    expect(accounts[0].year).toBe('2024');
  });

  it('should handle multiple accounts', () => {
    const text = `
      Email: user1@example.com
      Password: pass1

      Email: user2@example.com
      Password: pass2
    `;

    const accounts = parseAccounts(text);

    expect(accounts).toHaveLength(2);
  });

  it('should handle malformed data gracefully', () => {
    const text = 'invalid data';
    const accounts = parseAccounts(text);
    expect(accounts).toHaveLength(0);
  });
});
```

**Component Tests:**

```tsx
// apps/desktop/src/components/AccountForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AccountForm } from './AccountForm';

describe('AccountForm', () => {
  it('should render form fields', () => {
    render(<AccountForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should submit form data', () => {
    const handleSubmit = vi.fn();
    render(<AccountForm onSubmit={handleSubmit} />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' }
    });

    fireEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleSubmit).toHaveBeenCalledWith({
      email: 'user@example.com'
    });
  });
});
```

**Integration Tests (Rust):**

```rust
// apps/desktop/src-tauri/tests/accounts.rs
#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    #[test]
    fn test_create_account() {
        let db = Database::in_memory().unwrap();

        let account = db.create_account(CreateAccount {
            email: "test@example.com".to_string(),
            password: Some("secret".to_string()),
            // ... other fields
        }).unwrap();

        assert_eq!(account.email, "test@example.com");
    }

    #[test]
    fn test_encrypt_decrypt_field() {
        let plaintext = "sensitive_data";
        let key = derive_key("password", &salt);

        let encrypted = encrypt_field(plaintext, &key).unwrap();
        let decrypted = decrypt_field(&encrypted, &key).unwrap();

        assert_eq!(plaintext, decrypted);
    }
}
```

#### Test Coverage Goals

- **Packages**: 80%+ coverage
- **Components**: 70%+ coverage
- **Critical paths**: 90%+ coverage (crypto, auth)

---

### Building and Deployment

#### Development Builds

**Desktop:**

```bash
cd apps/desktop
pnpm dev
```

This opens the Tauri dev window with hot reload.

**Web:**

```bash
cd apps/web
pnpm dev
```

Starts Vite dev server at `http://localhost:5173`.

#### Production Builds

**Desktop:**

```bash
cd apps/desktop

# Build for current platform
pnpm tauri build

# Build for specific target
pnpm tauri build --target x86_64-pc-windows-msvc  # Windows
pnpm tauri build --target x86_64-apple-darwin      # macOS Intel
pnpm tauri build --target aarch64-apple-darwin     # macOS Apple Silicon
pnpm tauri build --target x86_64-unknown-linux-gnu  # Linux
```

Output: `src-tauri/target/release/bundle/`

**Web:**

```bash
cd apps/web

# Build for production
pnpm build

# Preview production build
pnpm preview
```

Output: `dist/` folder

#### Build All

```bash
# From root directory
pnpm build
```

This builds all packages and applications.

---

### Contributing Guidelines

#### Workflow

1. **Fork and Clone**

```bash
git clone https://github.com/yourusername/gmanager-glm.git
cd gmanager-glm
```

2. **Create Branch**

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

3. **Make Changes**

- Follow coding standards (see below)
- Add tests for new features
- Update documentation
- Ensure all tests pass

4. **Commit Changes**

```bash
git add .
git commit -m "feat: add account search functionality"
```

**Commit Message Format:**

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or tooling changes

**Examples:**
```
feat(accounts): add bulk delete functionality

fix(parser): handle empty lines in account text

docs(readme): update installation instructions

test(crypto): add tests for AES-256-GCM encryption
```

5. **Push and Create PR**

```bash
git push origin feature/your-feature-name
```

Create a Pull Request on GitHub with:
- Clear title and description
- Reference related issues
- Screenshots for UI changes (if applicable)

#### Pull Request Checklist

- [ ] Tests pass locally
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] Commit messages follow format
- [ ] No merge conflicts
- [ ] PR description clear and complete

#### Code Review Process

1. Automated checks run (CI/CD)
2. Maintainer reviews code
3. Feedback addressed
4. Approval received
5. Merged into main branch

---

### Coding Standards

#### TypeScript

**Style Guide:**

```typescript
// Use interfaces for object shapes
interface Account {
  id: string;
  email: string;
  password?: string;
}

// Use type for unions/aliases
type AccountStatus = 'active' | 'archived';

// Use const assertions
const CONFIG = {
  maxAccounts: 1000,
  timeout: 30000,
} as const;

// Use async/await over promises
async function getAccount(id: string): Promise<Account> {
  const response = await fetch(`/api/accounts/${id}`);
  return response.json();
}

// Use destructuring
function createAccount({ email, password }: CreateAccountInput) {
  // ...
}

// Use template literals for multi-line strings
const html = `
  <div class="account">
    <span>${email}</span>
  </div>
`;
```

**Best Practices:**

- Prefer `const` over `let` (use `let` only when reassignment needed)
- Use explicit return types for exported functions
- Avoid `any` - use `unknown` if type is truly unknown
- Use strict null checks
- Prefer functional programming over mutable state

#### Rust

**Style Guide:**

```rust
// Use snake_case for variables and functions
let account_id = "uuid";

// Use CamelCase for types and structs
struct Account {
    id: String,
    email: String,
}

// Use SCREAMING_SNAKE_CASE for constants
const MAX_ACCOUNTS: usize = 1000;

// Use Result for error handling
fn create_account(email: String) -> Result<Account, DbError> {
    // ...
}

// Use ? for error propagation
fn get_account(id: &str) -> Result<Account, DbError> {
    let account = db.query(id)?;
    Ok(account)
}

// Use pattern matching
match account.status {
    Status::Active => println!("Active"),
    Status::Archived => println!("Archived"),
}
```

#### React

**Component Structure:**

```tsx
// 1. Imports
import { useState, useEffect } from 'react';
import { Button } from '@gmanager/ui';

// 2. Types/Interfaces
interface AccountFormProps {
  onSubmit: (data: AccountData) => void;
  initialData?: AccountData;
}

// 3. Component function
export function AccountForm({ onSubmit, initialData }: AccountFormProps) {
  // 4. Hooks
  const [email, setEmail] = useState(initialData?.email || '');
  const [password, setPassword] = useState('');

  // 5. Event handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ email, password });
  };

  // 6. Effects
  useEffect(() => {
    // Load data on mount
  }, []);

  // 7. Render
  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

**Best Practices:**

- Use function components with hooks
- Keep components small and focused
- Use TypeScript for all props
- Prefer custom hooks for reusable logic
- Use memo for expensive renders
- Avoid inline functions in render

#### Git Conventions

**Branch Naming:**

- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation
- `test/` - Test updates
- `chore/` - Tooling/config changes

**Commit Message Format:**

```
feat(scope): description

fix(scope): description

docs(scope): description
```

---

### Troubleshooting

#### Common Issues

**1. pnpm Install Fails**

```bash
# Clear cache
pnpm store prune

# Remove node_modules
rm -rf node_modules **/node_modules

# Reinstall
pnpm install
```

**2. Tauri Build Fails (Linux)**

```bash
# Install missing dependencies
sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev

# Clean build
cd apps/desktop
cargo clean
pnpm tauri build
```

**3. TypeScript Errors**

```bash
# Regenerate type definitions
cd packages/shared
pnpm build

# Check for circular dependencies
npx madge --circular --extensions ts,tsx packages/*/src
```

**4. Rust Compile Errors**

```bash
# Update Rust toolchain
rustup update stable

# Clean build
cd apps/desktop/src-tauri
cargo clean
cargo build
```

**5. Hot Reload Not Working**

```bash
# Restart Vite dev server
cd apps/desktop
pnpm dev

# Clear Vite cache
rm -rf node_modules/.vite
```

#### Debugging

**Desktop:**

```bash
# Enable debug logs
cd apps/desktop
TAURI_DEBUG=1 pnpm dev

# View Rust logs
# Check terminal/console
```

**Web:**

```bash
# Enable debug mode
cd apps/web
DEBUG=* pnpm dev
```

#### Getting Help

- **Documentation**: Check `/docs` folder
- **Issues**: [GitHub Issues](https://github.com/yourusername/gmanager-glm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/gmanager-glm/discussions)
- **Email**: support@gmanager.app

---

<a name="中文"></a>

## 中文开发指南

### 目录

1. [快速开始](#快速开始-中文)
2. [开发环境设置](#开发环境设置-中文)
3. [项目结构](#项目结构-中文)
4. [代码组织](#代码组织-中文)
5. [测试指南](#测试指南-中文)
6. [构建和部署](#构建和部署-中文)
7. [贡献指南](#贡献指南-中文)
8. [编码规范](#编码规范-中文)
9. [故障排除](#故障排除-中文)

---

### 快速开始 (中文)

[参见上方英文部分的详细说明]

**基本步骤：**
1. 安装 Node.js 20+ 和 pnpm
2. 克隆仓库
3. 运行 `pnpm install`
4. 运行 `pnpm dev` 启动开发服务器

---

### 开发环境设置 (中文)

#### 前置要求

**必需：**
- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Git

**桌面开发：**
- Rust >= 1.70
- 系统依赖（根据操作系统）

#### IDE 配置

推荐使用 VS Code，安装以下扩展：
- ESLint
- Prettier
- Rust Analyzer
- Tauri
- Tailwind CSS IntelliSense

---

### 项目结构 (中文)

```
gmanager-glm/
├── apps/               # 应用实现
│   ├── desktop/       # Tauri 桌面应用
│   └── web/           # Express Web 应用
├── packages/          # 共享包
│   ├── shared/        # TypeScript 类型
│   ├── crypto/        # 加密工具
│   ├── parser/        # 账户解析器
│   └── ui/            # UI 组件
└── docs/              # 文档
```

---

### 代码组织 (中文)

#### 桌面应用结构

**前端：**
- `api/` - Tauri 命令封装
- `components/` - React 组件
- `hooks/` - 自定义 Hooks
- `stores/` - Zustand 状态管理
- `pages/` - 页面组件

**后端：**
- `main.rs` - 入口点
- `auth.rs` - 认证
- `accounts.rs` - 账户操作
- `crypto/` - 加密模块
- `db/` - 数据库层

---

### 测试指南 (中文)

#### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
cd packages/shared
pnpm test

# 监视模式
pnpm test --watch

# 覆盖率报告
pnpm test --coverage
```

#### 编写测试

[参见上方英文部分的示例代码]

---

### 构建和部署 (中文)

#### 开发构建

**桌面：**
```bash
cd apps/desktop
pnpm dev
```

**Web：**
```bash
cd apps/web
pnpm dev
```

#### 生产构建

**桌面：**
```bash
cd apps/desktop
pnpm tauri build
```

**Web：**
```bash
cd apps/web
pnpm build
```

---

### 贡献指南 (中文)

#### 工作流程

1. Fork 并克隆仓库
2. 创建分支（`feature/` 或 `fix/`）
3. 进行更改
4. 编写测试
5. 提交更改（遵循提交消息格式）
6. 推送并创建 Pull Request

#### 提交消息格式

```
<type>(<scope>): <description>

类型：
- feat: 新功能
- fix: 修复 bug
- docs: 文档更改
- style: 代码风格
- refactor: 重构
- test: 测试
- chore: 构建/工具
```

#### Pull Request 检查清单

- [ ] 本地测试通过
- [ ] 新功能添加测试
- [ ] 更新文档
- [ ] 提交消息符合格式
- [ ] 无合并冲突
- [ ] PR 描述清晰完整

---

### 编码规范 (中文)

[参见上方英文部分的详细规范]

#### TypeScript

- 使用接口定义对象形状
- 使用类型定义联合/别名
- 优先使用 `const` 而非 `let`
- 避免 `any`，使用 `unknown`
- 启用严格空检查

#### React

- 使用函数组件和 Hooks
- 保持组件小而专注
- 所有 props 使用 TypeScript
- 优先使用自定义 hooks
- 使用 memo 优化性能

---

### 故障排除 (中文)

#### 常见问题

**1. pnpm 安装失败**

```bash
# 清除缓存
pnpm store prune
rm -rf node_modules **/node_modules
pnpm install
```

**2. Tauri 构建失败 (Linux)**

```bash
sudo apt install libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev
cargo clean
pnpm tauri build
```

**3. TypeScript 错误**

```bash
# 重新生成类型定义
cd packages/shared
pnpm build
```

#### 获取帮助

- 文档：`/docs` 文件夹
- Issues：GitHub Issues
- Discussions：GitHub Discussions
- 邮箱：support@gmanager.app

---

<div align="center">

**Happy Coding! / 祝您编码愉快！**

**Last Updated: 2025-01-27**

</div>

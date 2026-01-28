# GManager / GLM 账户管理系统

<div align="center">

**GManager** - A secure, cross-platform GLM account management system

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Documentation

### Overview

**GManager** is a professional account management system designed for GLM (General Language Model) accounts. It provides secure storage, management, and organization of multiple GLM accounts with advanced features like batch operations, TOTP/2FA support, and flexible categorization.

### Key Features

#### 🔒 Security
- **AES-256-GCM Encryption**: All sensitive data (emails, passwords, TOTP secrets) encrypted at rest
- **Master Password Protection**: Single master password unlocks your entire vault
- **Zero-Knowledge Architecture**: Encryption keys never stored, only derived from your password
- **Secure Session Management**: Automatic session timeout and secure key handling

#### 📦 Account Management
- **Smart Import Parser**: Automatically parse account information from text files
- **Bulk Operations**: Create, edit, delete multiple accounts at once
- **Advanced Search**: Filter by email, group, tags, year, or custom fields
- **Field Customization**: Drag-and-drop field editor for custom account layouts
- **Import Tracking**: Maintains link to original import source

#### 🏷️ Organization
- **Groups**: Organize accounts into hierarchical groups with color coding
- **Tags**: Flexible multi-tag labeling system for accounts
- **Custom Field Order**: Per-account field display ordering
- **Batch Operations**: Apply changes to multiple accounts simultaneously

#### 🔐 2FA/TOTP Support
- **TOTP Generation**: Built-in time-based one-time password generator
- **QR Code Display**: Visual QR code representation for easy mobile app scanning
- **Multiple 2FA Accounts**: Support for multiple TOTP secrets per account
- **Auto-Refresh**: Automatic TOTP code refresh with countdown timer

#### 📊 Data Management
- **SQLite Database**: Fast, reliable local data storage
- **Audit Logging**: Complete operation history tracking
- **Statistics**: Dashboard with account distribution analytics
- **Data Export**: Export accounts in various formats

#### 🎨 User Experience
- **Dark/Light Theme**: Full theme support with automatic detection
- **Internationalization**: Multi-language support (i18n ready)
- **Responsive Design**: Works on desktop and web browsers
- **Real-time Updates**: Instant UI updates across components

### Tech Stack

#### Desktop Application
- **Frontend**: React 19 + TypeScript + Vite
- **Desktop Framework**: Tauri 2.x (Rust backend)
- **UI Library**: TailwindCSS + Custom component library
- **Database**: SQLite (via rusqlite)
- **Encryption**: Ring crypto library (AES-256-GCM)
- **State Management**: Zustand
- **Internationalization**: i18next + react-i18next

#### Web Application
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Express.js + Node.js
- **UI Library**: TailwindCSS + Shared component library
- **State Management**: Zustand + TanStack React Query
- **Database**: SQLite (via better-sqlite3)
- **Encryption**: Web Crypto API (AES-256-GCM)

#### Shared Packages
- **@gmanager/shared**: TypeScript types, interfaces, constants
- **@gmanager/crypto**: Cross-platform encryption utilities
- **@gmanager/parser**: Account text parser with field detection
- **@gmanager/ui**: Reusable UI component library

### Architecture

#### Monorepo Structure
```
gmanager-glm/
├── apps/
│   ├── desktop/          # Tauri desktop application
│   └── web/              # Web application (Express + React)
├── packages/
│   ├── shared/           # Shared types and utilities
│   ├── crypto/           # Encryption utilities
│   ├── parser/           # Account text parser
│   └── ui/               # UI component library
├── docs/                 # Documentation
└── package.json          # Root package.json
```

#### Key Design Decisions

1. **Monorepo**: Shared codebase between desktop and web versions
2. **Type Safety**: Full TypeScript coverage with strict mode
3. **Security First**: Encryption by default for all sensitive fields
4. **Cross-Platform**: Native desktop apps (Windows, macOS, Linux) + Web
5. **Performance**: Rust backend for crypto operations, SQLite for fast queries
6. **Developer Experience**: Hot reload, strict typing, comprehensive tests

### Installation

#### Prerequisites

- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0
- **Rust**: >= 1.70 (for desktop builds)
- **System Dependencies**:
  - Linux: `libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`
  - macOS: Xcode Command Line Tools
  - Windows: WebView2 Runtime (usually pre-installed)

#### Clone Repository

```bash
git clone https://github.com/yourusername/gmanager-glm.git
cd gmanager-glm
```

#### Install Dependencies

```bash
pnpm install
```

### Development

#### Desktop Application

```bash
# Development mode with hot reload
cd apps/desktop
pnpm dev

# Open Tauri dev tools
# Application will open automatically
```

#### Web Application

```bash
# Start backend server
cd apps/web
pnpm dev

# Application available at http://localhost:3000
```

#### Run All Apps

```bash
# From root directory
pnpm dev
```

### Building

#### Desktop Application

```bash
cd apps/desktop

# Build for current platform
pnpm tauri build

# Build for specific platform
pnpm tauri build --target x86_64-pc-windows-msvc  # Windows
pnpm tauri build --target x86_64-apple-darwin      # macOS Intel
pnpm tauri build --target aarch64-apple-darwin     # macOS Apple Silicon
pnpm tauri build --target x86_64-unknown-linux-gnu  # Linux
```

Output directory: `apps/desktop/src-tauri/target/release/bundle/`

#### Web Application

```bash
cd apps/web

# Production build
pnpm build

# Preview production build
pnpm preview
```

Output directory: `apps/web/dist/`

#### Build Everything

```bash
# From root directory
pnpm build
```

### Usage

#### First Time Setup

1. **Launch Application**: Open GManager desktop or web app
2. **Create Master Password**: Choose a strong master password
3. **Import Accounts**: Paste or import your account data
4. **Organize**: Create groups and tags to organize accounts
5. **Enable 2FA**: Add TOTP secrets for accounts with 2FA

#### Importing Accounts

**Text Format Example**:
```
Email: user1@example.com
Password: pass123
Recovery Email: backup@example.com
TOTP Secret: JBSWY3DPEHPK3PXP
Year: 2024
Country: US

Email: user2@example.com
Password: pass456
TOTP Secret: KRSXG5DSNFWWO2TQ
```

**Steps**:
1. Click "Import" button
2. Paste account text
3. Review parsed accounts in preview
4. Adjust field mappings if needed
5. Click "Import" to save

#### Managing Accounts

**View Accounts**:
- All accounts displayed in main list
- Click account to view details
- Use search/filter to narrow down
- Select multiple for batch operations

**Edit Account**:
- Click edit icon on account row
- Modify fields as needed
- Custom field order via drag-and-drop
- Assign to groups and tags
- Save changes

**Delete Account**:
- Select account(s)
- Click delete button
- Confirm deletion

#### Using TOTP

1. Add TOTP secret to account (from 2FA setup)
2. TOTP code auto-generates every 30 seconds
3. Click code to copy to clipboard
4. Scan QR code with mobile authenticator app

#### Batch Operations

1. Select multiple accounts using checkboxes
2. Click batch operations button
3. Choose operation (change group, add tags, delete)
4. Apply changes to all selected accounts

### Screenshots

#### Desktop Application
- Main dashboard with account list
- Account detail view with TOTP
- Batch operations interface
- Settings and preferences

#### Web Application
- Responsive web interface
- Account management dashboard
- Group and tag management
- Statistics and analytics

### Testing

```bash
# Run all tests
pnpm test

# Run tests for specific package
cd packages/shared
pnpm test

# Run tests with coverage
pnpm test --coverage

# Run linting
pnpm lint

# Format code
pnpm format
```

### Contributing

We welcome contributions! Please see [DEVELOPMENT.md](./docs/DEVELOPMENT.md) for guidelines.

#### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test thoroughly
4. Commit changes: `git commit -m 'Add amazing feature'`
5. Push to branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

### Documentation

- [Architecture](./docs/ARCHITECTURE.md) - Technical architecture details
- [API Reference](./docs/API.md) - Complete API documentation
- [Development Guide](./docs/DEVELOPMENT.md) - Developer setup and guidelines
- [Package Documentation](./packages/README.md) - Package-specific docs

### Security

- **Never commit encryption keys or passwords**
- **Use environment variables for sensitive config**
- **Report security vulnerabilities privately**
- **Follow secure coding practices**

See [SECURITY.md](./SECURITY.md) for details.

### License

MIT License - see [LICENSE](./LICENSE) file for details

### Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/gmanager-glm/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/gmanager-glm/discussions)
- **Email**: support@gmanager.app

### Roadmap

#### Version 0.2 (Q2 2025)
- [ ] Cloud sync support
- [ ] Biometric authentication (desktop)
- [ ] Import from password managers (1Password, Bitwarden)
- [ ] Advanced search with regex

#### Version 0.3 (Q3 2025)
- [ ] Mobile apps (iOS, Android)
- [ ] Browser extension
- [ ] Team/family sharing
- [ ] Audit log export

#### Version 1.0 (Q4 2025)
- [ ] Self-hosted cloud sync
- [ ] Plugin system
- [ ] Custom themes
- [ ] Full API documentation

### Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

<a name="中文"></a>

## 中文文档

### 项目概述

**GManager** 是一个专为 GLM（通用语言模型）账户设计的专业账户管理系统。它提供安全的存储、管理和组织多个 GLM 账户的功能，具有批量操作、TOTP/2FA 支持和灵活分类等高级功能。

### 主要特性

#### 🔒 安全性
- **AES-256-GCM 加密**：所有敏感数据（邮箱、密码、TOTP 密钥）静态加密
- **主密码保护**：单一主密码解锁整个保险库
- **零知识架构**：加密密钥永不存储，仅从密码派生
- **安全会话管理**：自动会话超时和安全的密钥处理

#### 📦 账户管理
- **智能导入解析器**：自动从文本文件解析账户信息
- **批量操作**：一次性创建、编辑、删除多个账户
- **高级搜索**：按邮箱、分组、标签、年份或自定义字段筛选
- **字段自定义**：拖放式字段编辑器，自定义账户布局
- **导入跟踪**：维护到原始导入来源的链接

#### 🏷️ 组织管理
- **分组**：将账户组织到带颜色编码的分层组中
- **标签**：灵活的多标签标签系统
- **自定义字段顺序**：每个账户的字段显示顺序
- **批量操作**：同时将更改应用于多个账户

#### 🔐 2FA/TOTP 支持
- **TOTP 生成**：内置基于时间的一次性密码生成器
- **二维码显示**：可视化二维码表示，便于移动应用扫描
- **多 2FA 账户**：每个账户支持多个 TOTP 密钥
- **自动刷新**：自动 TOTP 代码刷新和倒计时器

#### 📊 数据管理
- **SQLite 数据库**：快速、可靠的本地数据存储
- **审计日志**：完整的操作历史跟踪
- **统计信息**：包含账户分布分析的仪表板
- **数据导出**：以各种格式导出账户

#### 🎨 用户体验
- **深色/浅色主题**：完全主题支持和自动检测
- **国际化**：多语言支持（i18n 就绪）
- **响应式设计**：适用于桌面和 Web 浏览器
- **实时更新**：跨组件即时 UI 更新

### 技术栈

#### 桌面应用
- **前端**：React 19 + TypeScript + Vite
- **桌面框架**：Tauri 2.x（Rust 后端）
- **UI 库**：TailwindCSS + 自定义组件库
- **数据库**：SQLite（通过 rusqlite）
- **加密**：Ring 加密库（AES-256-GCM）
- **状态管理**：Zustand
- **国际化**：i18next + react-i18next

#### Web 应用
- **前端**：React 19 + TypeScript + Vite
- **后端**：Express.js + Node.js
- **UI 库**：TailwindCSS + 共享组件库
- **状态管理**：Zustand + TanStack React Query
- **数据库**：SQLite（通过 better-sqlite3）
- **加密**：Web Crypto API（AES-256-GCM）

#### 共享包
- **@gmanager/shared**：TypeScript 类型、接口、常量
- **@gmanager/crypto**：跨平台加密工具
- **@gmanager/parser**：账户文本解析器
- **@gmanager/ui**：可重用的 UI 组件库

### 安装

#### 前置要求

- **Node.js**：>= 20.0.0
- **pnpm**：>= 9.0.0
- **Rust**：>= 1.70（用于桌面构建）
- **系统依赖**：
  - Linux: `libwebkit2gtk-4.0-dev libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev`
  - macOS: Xcode Command Line Tools
  - Windows: WebView2 Runtime（通常预装）

#### 克隆仓库

```bash
git clone https://github.com/yourusername/gmanager-glm.git
cd gmanager-glm
```

#### 安装依赖

```bash
pnpm install
```

### 开发

#### 桌面应用

```bash
# 带热重载的开发模式
cd apps/desktop
pnpm dev

# 打开 Tauri 开发工具
# 应用将自动打开
```

#### Web 应用

```bash
# 启动后端服务器
cd apps/web
pnpm dev

# 应用访问地址：http://localhost:3000
```

#### 运行所有应用

```bash
# 从根目录
pnpm dev
```

### 构建

#### 桌面应用

```bash
cd apps/desktop

# 为当前平台构建
pnpm tauri build

# 为特定平台构建
pnpm tauri build --target x86_64-pc-windows-msvc  # Windows
pnpm tauri build --target x86_64-apple-darwin      # macOS Intel
pnpm tauri build --target aarch64-apple-darwin     # macOS Apple Silicon
pnpm tauri build --target x86_64-unknown-linux-gnu  # Linux
```

输出目录：`apps/desktop/src-tauri/target/release/bundle/`

#### Web 应用

```bash
cd apps/web

# 生产构建
pnpm build

# 预览生产构建
pnpm preview
```

输出目录：`apps/web/dist/`

### 使用指南

#### 首次设置

1. **启动应用**：打开 GManager 桌面或 Web 应用
2. **创建主密码**：选择一个强主密码
3. **导入账户**：粘贴或导入您的账户数据
4. **组织**：创建分组和标签来组织账户
5. **启用 2FA**：为具有 2FA 的账户添加 TOTP 密钥

#### 导入账户

**文本格式示例**：
```
邮箱: user1@example.com
密码: pass123
恢复邮箱: backup@example.com
TOTP 密钥: JBSWY3DPEHPK3PXP
年份: 2024
国家: US

邮箱: user2@example.com
密码: pass456
TOTP 密钥: KRSXG5DSNFWWO2TQ
```

**步骤**：
1. 点击"导入"按钮
2. 粘贴账户文本
3. 在预览中查看解析的账户
4. 如需调整字段映射
5. 点击"导入"保存

#### 管理账户

**查看账户**：
- 所有账户显示在主列表中
- 点击账户查看详细信息
- 使用搜索/筛选缩小范围
- 选择多个进行批量操作

**编辑账户**：
- 点击账户行上的编辑图标
- 根据需要修改字段
- 通过拖放自定义字段顺序
- 分配到分组和标签
- 保存更改

**删除账户**：
- 选择账户
- 点击删除按钮
- 确认删除

#### 使用 TOTP

1. 将 TOTP 密钥添加到账户（从 2FA 设置）
2. TOTP 代码每 30 秒自动生成
3. 点击代码复制到剪贴板
4. 使用移动身份验证应用扫描二维码

#### 批量操作

1. 使用复选框选择多个账户
2. 点击批量操作按钮
3. 选择操作（更改分组、添加标签、删除）
4. 将更改应用于所有选定的账户

### 测试

```bash
# 运行所有测试
pnpm test

# 运行特定包的测试
cd packages/shared
pnpm test

# 运行测试并生成覆盖率报告
pnpm test --coverage

# 运行代码检查
pnpm lint

# 格式化代码
pnpm format
```

### 贡献

我们欢迎贡献！请参阅 [DEVELOPMENT.md](./docs/DEVELOPMENT.md) 了解指南。

### 文档

- [架构](./docs/ARCHITECTURE.md) - 技术架构详情
- [API 参考](./docs/API.md) - 完整的 API 文档
- [开发指南](./docs/DEVELOPMENT.md) - 开发者设置和指南
- [包文档](./packages/README.md) - 特定包的文档

### 安全性

- **永远不要提交加密密钥或密码**
- **使用环境变量配置敏感信息**
- **私下报告安全漏洞**
- **遵循安全编码实践**

### 许可证

MIT 许可证 - 详见 [LICENSE](./LICENSE) 文件

### 支持

- **问题反馈**：[GitHub Issues](https://github.com/yourusername/gmanager-glm/issues)
- **讨论**：[GitHub Discussions](https://github.com/yourusername/gmanager-glm/discussions)
- **邮箱**：support@gmanager.app

### 路线图

#### 0.2 版本（2025 年第二季度）
- [ ] 云同步支持
- [ ] 生物识别身份验证（桌面）
- [ ] 从密码管理器导入（1Password、Bitwarden）
- [ ] 高级搜索与正则表达式

#### 0.3 版本（2025 年第三季度）
- [ ] 移动应用（iOS、Android）
- [ ] 浏览器扩展
- [ ] 团队/家庭共享
- [ ] 审计日志导出

#### 1.0 版本（2025 年第四季度）
- [ ] 自托管云同步
- [ ] 插件系统
- [ ] 自定义主题
- [ ] 完整的 API 文档

---

<div align="center">

**Built with ❤️ by the GManager team**

</div>

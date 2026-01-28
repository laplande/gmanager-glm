# GManager Documentation Index / 文档索引

<div align="center">

**Complete documentation for the GManager project**

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Documentation Index

### Getting Started

📖 **[README.md](../README.md)** - Project overview, features, installation, and basic usage

**Quick Links:**
- Project description and key features
- Tech stack overview
- Installation instructions
- Development setup
- Build instructions
- Usage examples

### Architecture & Design

🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and design decisions

**Contents:**
- System overview and architecture principles
- Monorepo structure explanation
- Desktop vs Web architecture comparison
- Database schema and entity relationships
- Encryption strategy (AES-256-GCM)
- Key design decisions and rationale
- Data flow diagrams
- Security considerations and threat model

**Best For:**
- Understanding the big picture
- Learning how components interact
- Understanding security architecture
- Making architectural decisions

### API Documentation

🔌 **[API.md](./API.md)** - Complete API reference

**Contents:**
- Desktop Tauri commands
- Web REST API endpoints
- TypeScript interfaces
- Request/response formats
- Error handling
- Authentication flow

**Best For:**
- Integrating with the API
- Understanding data structures
- Implementing features
- Debugging API calls

### Development Guide

👨‍💻 **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Developer setup and guidelines

**Contents:**
- Development environment setup
- Project structure and file organization
- Code organization patterns
- Testing guidelines (unit, integration, e2e)
- Building and deployment
- Contributing guidelines
- Coding standards (TypeScript, Rust, React)
- Troubleshooting common issues

**Best For:**
- New contributors
- Setting up development environment
- Writing code for the project
- Running tests
- Building and deploying

### Package Documentation

#### @gmanager/shared

📦 **[packages/shared/README.md](../packages/shared/README.md)** - Type definitions

**Contents:**
- Account types
- Database types
- Crypto types
- Application constants
- Type usage examples

#### @gmanager/crypto

🔐 **[packages/crypto/README.md](../packages/crypto/README.md)** - Encryption utilities

**Contents:**
- AES-256-GCM encryption/decryption
- Key derivation (PBKDF2)
- Password validation
- Security best practices
- Browser compatibility

#### @gmanager/parser

📝 **[packages/parser/README.md](../packages/parser/README.md)** - Account parser

**Contents:**
- Text parsing API
- Field detection
- Confidence scoring
- Supported formats
- Performance metrics

#### @gmanager/ui

🎨 **[packages/ui/README.md](../packages/ui/README.md)** - Component library

**Contents:**
- Component catalog
- Usage examples
- Theming guide
- Accessibility features
- Composition patterns

---

### Documentation Structure

```
gmanager-glm/
├── README.md                 # Project overview (English + 中文)
├── docs/
│   ├── index.md             # This file
│   ├── ARCHITECTURE.md      # Technical architecture
│   ├── API.md               # API reference
│   └── DEVELOPMENT.md       # Developer guide
└── packages/
    ├── shared/README.md     # Shared types docs
    ├── crypto/README.md     # Encryption docs
    ├── parser/README.md     # Parser docs
    └── ui/README.md         # Component library docs
```

---

### Quick Reference

#### For Users

| Want to... | Read This |
|------------|-----------|
| Install GManager | [README.md - Installation](../README.md#installation) |
| Use GManager | [README.md - Usage](../README.md#usage) |
| Import accounts | [README.md - Importing Accounts](../README.md#importing-accounts) |
| Manage TOTP | [README.md - Using TOTP](../README.md#using-totp) |
| Build from source | [README.md - Building](../README.md#building) |

#### For Developers

| Want to... | Read This |
|------------|-----------|
| Set up dev environment | [DEVELOPMENT.md - Getting Started](./DEVELOPMENT.md#getting-started) |
| Understand architecture | [ARCHITECTURE.md - Overview](./ARCHITECTURE.md#overview) |
- Use API | [API.md - Overview](./API.md#overview) |
| Contribute code | [DEVELOPMENT.md - Contributing](./DEVELOPMENT.md#contributing-guidelines) |
| Write tests | [DEVELOPMENT.md - Testing](./DEVELOPMENT.md#testing-guidelines) |
| Build apps | [DEVELOPMENT.md - Building](./DEVELOPMENT.md#building-and-deployment) |
| Use components | [packages/ui/README.md](../packages/ui/README.md) |
| Parse accounts | [packages/parser/README.md](../packages/parser/README.md) |
| Encrypt data | [packages/crypto/README.md](../packages/crypto/README.md) |

---

### Learning Path

#### Beginner (New to GManager)

1. Start with [README.md](../README.md) to understand what GManager is
2. Read [ARCHITECTURE.md - Overview](./ARCHITECTURE.md#overview) for system architecture
3. Follow [DEVELOPMENT.md - Getting Started](./DEVELOPMENT.md#getting-started) to set up environment
4. Explore [API.md - Authentication](./API.md#authentication-api) to understand auth flow

#### Intermediate (Contributing)

1. Complete beginner path
2. Read [ARCHITECTURE.md - Design Decisions](./ARCHITECTURE.md#key-design-decisions)
3. Study [DEVELOPMENT.md - Code Organization](./DEVELOPMENT.md#code-organization)
4. Review [DEVELOPMENT.md - Coding Standards](./DEVELOPMENT.md#coding-standards)
5. Learn package APIs in [packages/](../packages/)

#### Advanced (Deep Dive)

1. Complete intermediate path
2. Study [ARCHITECTURE.md - Security](./ARCHITECTURE.md#security-architecture)
3. Review [ARCHITECTURE.md - Encryption Strategy](./ARCHITECTURE.md#encryption-strategy)
4. Analyze [API.md](./API.md) for complete API reference
5. Read source code with architecture context

---

### Conventions

#### Language

All documentation is bilingual (English and Chinese):
- English first, followed by Chinese section
- Code examples use English
- Technical terms kept in English

#### Format

- Markdown format
- Code blocks with syntax highlighting
- Tables for structured data
- Diagrams in ASCII art
- Links with descriptive text

#### Versioning

Documentation matches code version:
- Current: v0.1.0
- Last updated: 2025-01-27
- Changelog: [CHANGELOG.md](../CHANGELOG.md)

---

### Contributing to Documentation

#### Guidelines

1. **Keep it bilingual**: Add both English and Chinese
2. **Be specific**: Use concrete examples
3. **Stay current**: Update with code changes
4. **Link liberally**: Cross-reference related docs
5. **Proofread**: Check for clarity and accuracy

#### Process

1. Create documentation branch: `git checkout -b docs/topic-name`
2. Edit relevant `.md` files
3. Add examples where helpful
4. Update both languages
5. Submit PR with "docs" label

---

<a name="中文"></a>

## 中文文档索引

### 快速开始

📖 **[README.md](../README.md)** - 项目概述、功能、安装和基本使用

**快速链接：**
- 项目描述和主要功能
- 技术栈概述
- 安装说明
- 开发设置
- 构建说明
- 使用示例

### 架构与设计

🏗️ **[ARCHITECTURE.md](./ARCHITECTURE.md)** - 技术架构和设计决策

**内容：**
- 系统概述和架构原则
- Monorepo 结构说明
- 桌面与 Web 架构对比
- 数据库架构和实体关系
- 加密策略（AES-256-GCM）
- 关键设计决策和理由
- 数据流图
- 安全考虑和威胁模型

**最适合：**
- 理解大局
- 学习组件交互方式
- 了解安全架构
- 做架构决策

### API 文档

🔌 **[API.md](./API.md)** - 完整 API 参考

**内容：**
- 桌面 Tauri 命令
- Web REST API 端点
- TypeScript 接口
- 请求/响应格式
- 错误处理
- 认证流程

**最适合：**
- 集成 API
- 理解数据结构
- 实现功能
- 调试 API 调用

### 开发指南

👨‍💻 **[DEVELOPMENT.md](./DEVELOPMENT.md)** - 开发者设置和指南

**内容：**
- 开发环境设置
- 项目结构和文件组织
- 代码组织模式
- 测试指南（单元、集成、端到端）
- 构建和部署
- 贡献指南
- 编码规范（TypeScript、Rust、React）
- 常见问题故障排除

**最适合：**
- 新贡献者
- 设置开发环境
- 为项目编写代码
- 运行测试
- 构建和部署

### 包文档

#### @gmanager/shared

📦 **[packages/shared/README.md](../packages/shared/README.md)** - 类型定义

**内容：**
- 账户类型
- 数据库类型
- 加密类型
- 应用常量
- 类型使用示例

#### @gmanager/crypto

🔐 **[packages/crypto/README.md](../packages/crypto/README.md)** - 加密工具

**内容：**
- AES-256-GCM 加密/解密
- 密钥派生（PBKDF2）
- 密码验证
- 安全最佳实践
- 浏览器兼容性

#### @gmanager/parser

📝 **[packages/parser/README.md](../packages/parser/README.md)** - 账户解析器

**内容：**
- 文本解析 API
- 字段检测
- 置信度评分
- 支持的格式
- 性能指标

#### @gmanager/ui

🎨 **[packages/ui/README.md](../packages/ui/README.md)** - 组件库

**内容：**
- 组件目录
- 使用示例
- 主题指南
- 可访问性功能
- 组合模式

---

### 快速参考

#### 面向用户

| 想要... | 阅读这个 |
|---------|----------|
| 安装 GManager | [README.md - 安装](../README.md#installation) |
| 使用 GManager | [README.md - 使用指南](../README.md#usage) |
| 导入账户 | [README.md - 导入账户](../README.md#importing-accounts) |
| 管理 TOTP | [README.md - 使用 TOTP](../README.md#using-totp) |
| 从源代码构建 | [README.md - 构建](../README.md#building) |

#### 面向开发者

| 想要... | 阅读这个 |
|---------|----------|
| 设置开发环境 | [DEVELOPMENT.md - 快速开始](./DEVELOPMENT.md#getting-started) |
| 理解架构 | [ARCHITECTURE.md - 概述](./ARCHITECTURE.md#overview-中文) |
| 使用 API | [API.md - 概览](./API.md#api-概览-中文) |
| 贡献代码 | [DEVELOPMENT.md - 贡献指南](./DEVELOPMENT.md#贡献指南-中文) |
| 编写测试 | [DEVELOPMENT.md - 测试指南](./DEVELOPMENT.md#测试指南-中文) |
| 构建应用 | [DEVELOPMENT.md - 构建和部署](./DEVELOPMENT.md#构建和部署-中文) |
| 使用组件 | [packages/ui/README.md](../packages/ui/README.md) |
| 解析账户 | [packages/parser/README.md](../packages/parser/README.md) |
| 加密数据 | [packages/crypto/README.md](../packages/crypto/README.md) |

---

### 学习路径

#### 初学者（GManager 新手）

1. 从 [README.md](../README.md) 开始，了解 GManager 是什么
2. 阅读 [ARCHITECTURE.md - 概述](./ARCHITECTURE.md#概述-中文) 了解系统架构
3. 按照 [DEVELOPMENT.md - 快速开始](./DEVELOPMENT.md#快速开始-中文) 设置环境
4. 探索 [API.md - 认证](./API.md#认证-api-中文) 了解认证流程

#### 中级（贡献者）

1. 完成初学者路径
2. 阅读 [ARCHITECTURE.md - 设计决策](./ARCHITECTURE.md#关键设计决策-中文)
3. 学习 [DEVELOPMENT.md - 代码组织](./DEVELOPMENT.md#代码组织-中文)
4. 审查 [DEVELOPMENT.md - 编码规范](./DEVELOPMENT.md#编码规范-中文)
5. 学习 [packages/](../packages/) 中的包 API

#### 高级（深入理解）

1. 完成中级路径
2. 研究 [ARCHITECTURE.md - 安全架构](./ARCHITECTURE.md#安全架构-中文)
3. 审查 [ARCHITECTURE.md - 加密策略](./ARCHITECTURE.md#加密策略-中文)
4. 分析 [API.md](./API.md) 获取完整 API 参考
5. 结合架构上下文阅读源代码

---

### 约定

#### 语言

所有文档都是双语的（英文和中文）：
- 英文在前，后跟中文部分
- 代码示例使用英文
- 技术术语保留英文

#### 格式

- Markdown 格式
- 带语法高亮的代码块
- 表格用于结构化数据
- ASCII 艺术图表
- 带描述性文本的链接

#### 版本控制

文档与代码版本匹配：
- 当前版本：v0.1.0
- 最后更新：2025-01-27
- 更新日志：[CHANGELOG.md](../CHANGELOG.md)

---

### 贡献文档

#### 指南

1. **保持双语**：同时添加英文和中文
2. **具体明确**：使用具体示例
3. **保持最新**：随代码更改更新
4. **广泛链接**：交叉引用相关文档
5. **校对**：检查清晰度和准确性

#### 流程

1. 创建文档分支：`git checkout -b docs/topic-name`
2. 编辑相关 `.md` 文件
3. 在有帮助的地方添加示例
4. 更新两种语言
5. 提交 PR 并标记 "docs" 标签

---

<div align="center">

**Need help?**

- 📧 Email: support@gmanager.app
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/gmanager-glm/discussions)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/gmanager-glm/issues)

**Last Updated: 2025-01-27**

</div>

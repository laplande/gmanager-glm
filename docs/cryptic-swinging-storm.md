# GManager - Google账号管理软件设计方案

## 项目概述

跨平台Google账号管理工具，支持Windows/Linux/Web，具备智能导入、加密存储、便捷管理等功能。

---

## 技术架构

### 桌面端
- **框架**: Tauri 2.0 (Rust后端 + React前端)
- **前端**: React 18 + TypeScript + TailwindCSS
- **状态管理**: Zustand
- **UI组件**: Radix UI (无障碍友好)
- **数据库**: SQLite (通过 rusqlite)
- **加密**: AES-256-GCM (通过 ring 库)

### Web端
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite (通过 better-sqlite3)
- **认证**: JWT + 主密码派生密钥
- **前端**: 与桌面端共享React代码

### 共享代码
```
/packages
  /ui          # React组件库 (桌面/Web共用)
  /parser      # 账号字符串解析器 (纯TS)
  /crypto      # 加密工具 (Web端用)
/apps
  /desktop     # Tauri桌面应用
  /web         # Node.js Web服务
```

---

## 数据库设计

### 核心表结构

```sql
-- 原始记录表 (永不修改，用于还原)
CREATE TABLE raw_imports (
  id TEXT PRIMARY KEY,
  raw_text TEXT NOT NULL,           -- 原始字符串
  source_type TEXT NOT NULL,        -- 'file'|'text'|'database'
  source_name TEXT,                 -- 文件名/来源标识
  imported_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 账号主表
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  raw_import_id TEXT REFERENCES raw_imports(id),
  email TEXT NOT NULL,              -- 加密存储
  password TEXT,                    -- 加密存储
  recovery_email TEXT,              -- 加密存储
  totp_secret TEXT,                 -- 加密存储
  year TEXT,
  notes TEXT,                       -- 加密存储
  group_id TEXT REFERENCES groups(id),
  field_order TEXT,                 -- JSON: 字段顺序映射
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分组表 (互斥，一个账号只能属于一个分组)
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,                       -- 显示颜色
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 标签表
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 账号-标签关联表 (多对多)
CREATE TABLE account_tags (
  account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
  tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (account_id, tag_id)
);

-- 操作历史表
CREATE TABLE operation_logs (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  action TEXT NOT NULL,             -- 'import'|'update'|'delete'|'field_adjust'|'group_change'|'tag_add'|'tag_remove'
  details TEXT,                     -- JSON: 操作详情
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 会话撤销栈 (内存优先，持久化备份)
CREATE TABLE undo_stack (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL,
  undo_data TEXT NOT NULL,          -- JSON: 撤销所需数据
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 加密策略
- 主密码通过 PBKDF2 派生 256-bit 密钥
- 敏感字段 (email, password, recovery_email, totp_secret, notes) 使用 AES-256-GCM 加密
- 每个字段独立 IV，存储格式: `base64(iv + ciphertext + tag)`

---

## 核心功能模块

### 1. 智能导入解析器

**解析策略:**
```typescript
interface ParsedAccount {
  email: string;
  password?: string;
  recoveryEmail?: string;
  totpSecret?: string;
  year?: string;
  country?: string;
  unknown: string[];  // 无法识别的字段
  confidence: number; // 0-1 置信度
}

// 分隔符检测优先级
const DELIMITERS = ['----', '|', '密码：', ':', '\t', ' '];

// 字段识别规则
const FIELD_PATTERNS = {
  email: /^[a-zA-Z0-9._%+-]+@(gmail\.com|google\.com)$/i,
  recoveryEmail: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
  totpSecret: /^[A-Z2-7]{16,32}$/i,  // Base32 格式
  year: /^(19|20)\d{2}$/,
  country: /^(India|China|USA|...)$/i,  // 常见国家列表
};
```

**导入流程:**
1. 用户粘贴/上传文本
2. 自动检测分隔符，解析每行
3. 表格预览显示，字段类型可拖拽调整
4. 低置信度行高亮警告
5. 用户确认后批量导入

### 2. 字段调整交互

**拖拽标签块设计:**
```
原始: steinlicht...@gmail.com | Zhh10@666888 | txkmni6hhs...
      ├─────────────────────┤ ├────────────┤ ├────────────┤
      [📧 邮箱]              [🔑 密码]       [🔐 2FA密钥]

      ↕ 拖拽可交换位置，实时显示调整前后对比
```

**批量调整:**
- 框选多行 → 右键"应用相同字段顺序"
- 支持 Ctrl+Z / Ctrl+Y 撤销还原 (会话内50步)

### 3. 2FA 验证码模块

**实时刷新策略:**
```typescript
// 每秒更新一次所有可见账号的TOTP
useEffect(() => {
  const interval = setInterval(() => {
    visibleAccounts.forEach(acc => {
      if (acc.totpSecret) {
        acc.currentCode = generateTOTP(acc.totpSecret);
        acc.remainingSeconds = 30 - (Math.floor(Date.now() / 1000) % 30);
      }
    });
  }, 1000);
  return () => clearInterval(interval);
}, [visibleAccounts]);
```

**QR码生成:**
- 格式: `otpauth://totp/Google:${email}?secret=${secret}&issuer=Google`
- 使用 qrcode.react 生成可扫描二维码

### 4. 列表UI设计

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔍 搜索...                    [分组▼] [标签▼] [导入] [导出]         │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ ☐ example@gmail.com │ ●●●●●● │ 2FA: 123456 ⏱28s │ 📋 │ [工作] │ │
│ │   └ 辅助: backup@xx.com     └ 2024 └ 备注: VIP账号              │ │
│ ├─────────────────────────────────────────────────────────────────┤ │
│ │ ☐ another@gmail.com │ ●●●●●● │ 无2FA          │ 📋 │ [个人]   │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                           [显示滚动条，高对比深色主题]               │
└─────────────────────────────────────────────────────────────────────┘
```

**交互细节:**
- 点击任意字段 → 复制到剪贴板 + toast提示
- 悬停密码 → 显示明文
- 右键 → 上下文菜单 (编辑/删除/移动分组/添加标签)
- 拖拽框选 → 批量操作工具栏出现

### 5. 主题系统

```typescript
// 跟随系统 + 手动切换
const theme = useSystemTheme(); // 'light' | 'dark'
// TailwindCSS dark mode class策略
```

---

## 项目结构

```
gmanager/
├── packages/
│   ├── ui/                    # 共享UI组件库
│   │   ├── components/
│   │   │   ├── AccountList/
│   │   │   ├── ImportPreview/
│   │   │   ├── FieldEditor/
│   │   │   ├── TOTPDisplay/
│   │   │   └── ...
│   │   ├── hooks/
│   │   └── styles/
│   ├── parser/                # 账号解析器
│   │   ├── delimiter.ts
│   │   ├── fieldDetector.ts
│   │   └── index.ts
│   └── shared/                # 共享类型和工具
│       ├── types/
│       ├── crypto/
│       └── i18n/
├── apps/
│   ├── desktop/               # Tauri应用
│   │   ├── src/               # React前端
│   │   ├── src-tauri/         # Rust后端
│   │   │   ├── src/
│   │   │   │   ├── db/        # SQLite操作
│   │   │   │   ├── crypto/    # AES加密
│   │   │   │   └── main.rs
│   │   │   └── Cargo.toml
│   │   └── package.json
│   └── web/                   # Web服务
│       ├── src/
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── index.ts
│       └── package.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 实施阶段

### Phase 1: 基础框架 (MVP)
1. 初始化 monorepo (pnpm workspace)
2. 搭建 Tauri + React 项目骨架
3. 实现主密码认证 + SQLite加密存储
4. 基础账号CRUD功能

### Phase 2: 核心导入功能
5. 智能字符串解析器
6. 导入预览表格UI
7. 拖拽字段调整交互
8. 批量调整 + 撤销还原

### Phase 3: 完善管理功能
9. 分组和标签系统
10. 搜索和筛选
11. 框选批量操作
12. 操作历史记录

### Phase 4: 2FA和导出
13. TOTP生成 + 实时刷新
14. QR码显示
15. 数据库导出
16. 自定义格式文本导出

### Phase 5: Web端
17. Node.js后端API
18. 前端代码复用适配
19. JWT认证
20. 部署文档

### Phase 6: 优化和国际化
21. 中英双语i18n
22. 深色/浅色主题完善
23. 性能优化
24. 用户文档

---

## 同步功能建议 (后续开发)

推荐方案: **WebDAV + 端到端加密**

- 用户配置WebDAV服务器 (Nextcloud/坚果云等)
- 本地数据库导出为加密文件，上传同步
- 其他设备下载后解密合并
- 冲突解决: 以时间戳最新为准，保留冲突副本

优点: 无需自建服务器，利用现有云盘，数据始终加密

---

## 验证计划

1. **单元测试**: 解析器、加密模块的Jest测试
2. **集成测试**: 导入→存储→导出完整流程
3. **手动测试**:
   - 各种格式字符串导入识别准确性
   - 批量操作和撤销还原
   - 2FA验证码与Google Authenticator对比
4. **跨平台测试**: Windows/Linux桌面端 + Chrome/Firefox Web端

---

## 关键文件清单

| 文件 | 用途 |
|------|------|
| `apps/desktop/src-tauri/src/db/mod.rs` | SQLite数据库操作 |
| `apps/desktop/src-tauri/src/crypto/mod.rs` | AES-256加密 |
| `packages/parser/src/index.ts` | 账号字符串智能解析 |
| `packages/ui/src/components/ImportPreview/` | 导入预览表格 |
| `packages/ui/src/components/FieldEditor/` | 拖拽字段调整 |
| `packages/ui/src/components/AccountList/` | 主列表视图 |
| `apps/web/src/routes/api.ts` | Web端API路由 |

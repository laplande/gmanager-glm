# @gmanager/shared

<div align="center">

**Shared TypeScript types, interfaces, and constants for GManager**

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Documentation

### Overview

`@gmanager/shared` provides the foundational TypeScript types, interfaces, and constants used across all GManager packages and applications. It contains no runtime logic, only type definitions.

### Installation

```bash
# In workspace packages
pnpm add @gmanager/shared

# Install globally
pnpm add -w @gmanager/shared
```

### Usage

```typescript
// Import all types
import type { Account, Group, Tag } from '@gmanager/shared';

// Import specific type category
import type { Account, ParsedAccount } from '@gmanager/shared/types/account';
import type { Group, Tag } from '@gmanager/shared/types/database';

// Import constants
import { MAX_ACCOUNTS, SESSION_TIMEOUT } from '@gmanager/shared/constants';
```

### Available Types

#### Account Types (`types/account.ts`)

```typescript
// Parsed account from text input
interface ParsedAccount {
  email: string;
  password?: string;
  recoveryEmail?: string;
  totpSecret?: string;
  year?: string;
  country?: string;
  unknown: string[];
  confidence: number;
}

// Persisted account entity
interface Account {
  id: string;
  rawImportId?: string;
  email: string;
  password?: string;
  recoveryEmail?: string;
  totpSecret?: string;
  year?: string;
  notes?: string;
  groupId?: string;
  fieldOrder?: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

// Account with joined data
interface AccountWithTags extends Account {
  tags: Tag[];
  group?: Group;
}

// Field definitions
interface AccountField {
  name: string;
  label: string;
  sensitive: boolean;
  required: boolean;
  type: 'email' | 'password' | 'text' | 'secret' | 'number' | 'select';
  order: number;
}
```

#### Database Types (`types/database.ts`)

```typescript
// Raw import record
interface RawImport {
  id: string;
  rawText: string;
  sourceType: 'file' | 'text' | 'database';
  sourceName?: string;
  importedAt: string;
}

// Group entity
interface Group {
  id: string;
  name: string;
  color?: string;
  sortOrder: number;
  createdAt: string;
}

// Tag entity
interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

// Account-tag junction
interface AccountTag {
  accountId: string;
  tagId: string;
  assignedAt: string;
}

// Operation log
interface OperationLog {
  id: string;
  accountId?: string;
  action: 'import' | 'update' | 'delete' | 'field_adjust' | 'group_change' | 'tag_add' | 'tag_remove';
  details?: Record<string, unknown>;
  createdAt: string;
}
```

#### Crypto Types (`types/crypto.ts`)

```typescript
// Encryption algorithms
type EncryptionAlgorithm = 'aes-256-gcm' | 'chacha20-poly1305';

// Key derivation functions
type KdfType = 'argon2id' | 'pbkdf2';

// Encrypted data payload
interface EncryptedData {
  algorithm: EncryptionAlgorithm;
  iv: string;
  ciphertext: string;
  authTag?: string;
}

// Key derivation params
interface KdfParams {
  type: KdfType;
  salt: string;
  iterations?: number;
  memory?: number;
  parallelism?: number;
  keyLength: number;
}

// Master key container
interface MasterKey {
  id: string;
  encryptedKey: EncryptedData;
  kdfParams: KdfParams;
  createdAt: string;
  hint?: string;
}

// Password validation
interface PasswordValidation {
  valid: boolean;
  error?: string;
  strength: 0 | 1 | 2 | 3 | 4;
  strengthLabel: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
}
```

### Constants

```typescript
// App configuration
const APP_NAME = 'GManager';
const APP_VERSION = '0.1.0';

// Database
const DB_NAME = 'gmanager.db';
const MAX_ACCOUNTS = 10000;

// Session
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Encryption
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 256; // bits
const SALT_LENGTH = 16; // bytes
const NONCE_LENGTH = 12; // bytes

// Pagination
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

// Validation
const MIN_PASSWORD_LENGTH = 12;
const MAX_EMAIL_LENGTH = 254;
const MAX_NOTE_LENGTH = 10000;

// Parser
const ACCOUNT_DELIMITERS = ['---', '===', '\n\n'];
const FIELD_DELIMITERS = [':', '=', '-'];

// UI
const DEBOUNCE_DELAY = 300;
const TOAST_DURATION = 3000;
```

### Package Exports

```typescript
// Main export
export * from './src/index';

// Category exports
export * from './src/types/account';
export * from './src/types/database';
export * from './src/types/crypto';
export * from './src/constants';
```

### Development

```bash
# Build types
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

### Peer Dependencies

None (types-only package)

---

<a name="中文"></a>

## 中文文档

### 概述

`@gmanager/shared` 提供所有 GManager 包和应用使用的基础 TypeScript 类型、接口和常量。它不包含运行时逻辑，仅包含类型定义。

### 安装

```bash
# 在工作区包中
pnpm add @gmanager/shared

# 全局安装
pnpm add -w @gmanager/shared
```

### 使用

```typescript
// 导入所有类型
import type { Account, Group, Tag } from '@gmanager/shared';

// 导入特定类型类别
import type { Account, ParsedAccount } from '@gmanager/shared/types/account';
import type { Group, Tag } from '@gmanager/shared/types/database';

// 导入常量
import { MAX_ACCOUNTS, SESSION_TIMEOUT } from '@gmanager/shared/constants';
```

### 可用类型

[参见上方英文部分的详细类型定义]

主要类型类别：
- **账户类型** - `types/account.ts`
- **数据库类型** - `types/database.ts`
- **加密类型** - `types/crypto.ts`

### 常量

[参见上方英文部分的完整常量列表]

主要常量类别：
- 应用配置
- 数据库设置
- 会话管理
- 加密参数
- 分页设置
- 验证规则

### 开发

```bash
# 构建类型
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint
```

---

<div align="center">

**Package Version: 0.1.0**

**Last Updated: 2025-01-27**

</div>

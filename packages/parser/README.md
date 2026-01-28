# @gmanager/parser

<div align="center">

**Smart account text parser for GManager**

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Documentation

### Overview

`@gmanager/parser` provides intelligent parsing of GLM account information from raw text. It automatically detects delimiters, classifies field types, and provides confidence scoring for robust data extraction.

### Installation

```bash
pnpm add @gmanager/parser
```

### Features

- **Automatic Delimiter Detection**: Supports colon, equals, dash, and more
- **Smart Field Classification**: Identifies emails, passwords, TOTP secrets, years, countries
- **Confidence Scoring**: Rates parsing confidence (0-1) for each account
- **Multi-Format Support**: Handles various text formats
- **Error Recovery**: Gracefully handles malformed data
- **Zero Dependencies**: Lightweight, pure TypeScript

### Usage

#### Basic Parsing

```typescript
import { parseAccounts } from '@gmanager/parser';

const text = `
Email: user1@example.com
Password: secret123
TOTP Secret: JBSWY3DPEHPK3PXP
Year: 2024

Email: user2@example.com
Password: pass456
Country: US
`;

const accounts = parseAccounts(text);

console.log(accounts);
// [
//   {
//     email: 'user1@example.com',
//     password: 'secret123',
//     totpSecret: 'JBSWY3DPEHPK3PXP',
//     year: '2024',
//     country: undefined,
//     unknown: [],
//     confidence: 0.95
//   },
//   {
//     email: 'user2@example.com',
//     password: 'pass456',
//     totpSecret: undefined,
//     year: undefined,
//     country: 'US',
//     unknown: [],
//     confidence: 0.90
//   }
// ]
```

#### Advanced Options

```typescript
import { parseAccounts, type ParserOptions } from '@gmanager/parser';

const options: ParserOptions = {
  minConfidence: 0.7,      // Filter by confidence threshold
  strictMode: false,       // Allow partial matches
  customFields: {          // Custom field mappings
    'api_key': 'apiKey',
    'endpoint': 'endpoint'
  }
};

const accounts = parseAccounts(text, options);
```

#### Single Account Parsing

```typescript
import { parseAccount } from '@gmanager/parser';

const accountText = `
Email: admin@example.com
Password: admin123
Recovery: backup@example.com
`;

const account = parseAccount(accountText);
console.log(account.email); // 'admin@example.com'
```

#### Validation

```typescript
import { isValidAccount, filterValidAccounts } from '@gmanager/parser';

const accounts = parseAccounts(text);

// Check if account is valid
const valid = isValidAccount(accounts[0]);
console.log(valid); // true/false

// Filter valid accounts only
const validAccounts = filterValidAccounts(accounts);
```

#### Statistics

```typescript
import { parseAccounts, getParseStats } from '@gmanager/parser';

const accounts = parseAccounts(text);
const stats = getParseStats(accounts);

console.log(stats);
// {
//   total: 100,
//   valid: 95,
//   invalid: 5,
//   averageConfidence: 0.87,
//   confidenceDistribution: {
//     high: 70,    // > 0.8
//     medium: 20,  // 0.5 - 0.8
//     low: 10      // < 0.5
//   }
// }
```

### API Reference

#### `parseAccounts(text, options?)`

Parses multiple accounts from text.

```typescript
function parseAccounts(
  text: string,
  options?: ParserOptions
): ParsedAccount[]
```

**Parameters:**
- `text`: Raw text containing account data
- `options`: Optional parser settings

**Returns:** Array of `ParsedAccount` objects

**Example:**
```typescript
const accounts = parseAccounts(text, { minConfidence: 0.8 });
```

#### `parseAccount(text)`

Parses a single account from text.

```typescript
function parseAccount(text: string): ParsedAccount | null
```

**Parameters:**
- `text`: Text containing single account data

**Returns:** `ParsedAccount` or `null` if parsing fails

**Example:**
```typescript
const account = parseAccount(text);
if (account) {
  console.log(account.email);
}
```

#### `isValidAccount(account)`

Checks if an account meets validity criteria.

```typescript
function isValidAccount(account: ParsedAccount): boolean
```

**Parameters:**
- `account`: Parsed account to validate

**Returns:** `true` if account has required fields

**Criteria:**
- Must have email
- Confidence score >= 0.5
- At least one field parsed

**Example:**
```typescript
if (isValidAccount(account)) {
  // Save to database
}
```

#### `filterValidAccounts(accounts)`

Filters array to valid accounts only.

```typescript
function filterValidAccounts(accounts: ParsedAccount[]): ParsedAccount[]
```

**Example:**
```typescript
const validAccounts = filterValidAccounts(allAccounts);
```

#### `getParseStats(accounts)`

Calculates parsing statistics.

```typescript
function getParseStats(accounts: ParsedAccount[]): ParseStats
```

**Returns:** Statistics object with counts and distribution

**Example:**
```typescript
const stats = getParseStats(accounts);
console.log(`Valid: ${stats.valid}/${stats.total}`);
```

### Types

```typescript
interface ParsedAccount {
  email: string;
  password?: string;
  recoveryEmail?: string;
  totpSecret?: string;
  year?: string;
  country?: string;
  unknown: string[];      // Unparsed fields
  confidence: number;     // 0-1 score
}

interface ParserOptions {
  minConfidence?: number;  // Filter threshold (default: 0)
  strictMode?: boolean;    // Require all fields (default: false)
  customFields?: Record<string, string>;  // Custom mappings
}

interface ParseStats {
  total: number;
  valid: number;
  invalid: number;
  averageConfidence: number;
  confidenceDistribution: {
    high: number;   // > 0.8
    medium: number; // 0.5 - 0.8
    low: number;    // < 0.5
  };
}
```

### Supported Field Types

The parser automatically detects and classifies these fields:

| Field Name | Aliases | Type |
|-----------|---------|------|
| Email | email, mail, username, user | Email |
| Password | password, pass, pwd | Password |
| Recovery Email | recovery, backup, recovery_email | Email |
| TOTP Secret | totp, 2fa, two_factor, mfa | Secret |
| Year | year, created, registered | Number |
| Country | country, region, location | Text |
| Notes | notes, comment, description | Text |

**Field Detection Rules:**

**Email:**
- Contains `@` symbol
- Valid domain format
- Example: `user@example.com`

**Password:**
- Minimum 4 characters
- Can contain any characters
- Example: `MyP@ssw0rd123`

**TOTP Secret:**
- Base32 encoded (A-Z, 2-7, =)
- Length 16-32 characters
- Example: `JBSWY3DPEHPK3PXP`

**Year:**
- 4-digit number
- Range 2000-2030
- Example: `2024`

**Country:**
- 2-letter ISO code or full name
- Example: `US`, `United States`

### Supported Delimiters

The parser automatically detects these delimiters:

**Field Delimiters:**
- Colon: `Email: user@example.com`
- Equals: `Email = user@example.com`
- Dash: `Email - user@example.com`
- Space: `Email user@example.com`

**Record Delimiters:**
- Triple dash: `---`
- Triple equals: `===`
- Double newline: `\n\n`

### Confidence Scoring

Confidence scores indicate parsing reliability:

| Score | Quality | Description |
|-------|---------|-------------|
| 0.9 - 1.0 | Excellent | All fields detected, standard format |
| 0.7 - 0.9 | Good | Most fields detected, minor issues |
| 0.5 - 0.7 | Fair | Some fields detected, non-standard format |
| 0.3 - 0.5 | Poor | Few fields detected, unusual format |
| 0.0 - 0.3 | Very Poor | Minimal data, heavily malformed |

**Factors Affecting Score:**
- Number of fields detected
- Field type confidence
- Format standard compliance
- Unknown fields count

### Examples

#### Standard Format

```
Email: user@example.com
Password: secret123
Recovery Email: backup@example.com
TOTP Secret: JBSWY3DPEHPK3PXP
Year: 2024
Country: US
```

**Result:** Confidence 0.98 (Excellent)

#### Minimal Format

```
user@example.com
secret123
```

**Result:** Confidence 0.60 (Fair)
- Email detected
- Password detected (no label)

#### Unusual Format

```
Account: user@example.com
Pass: secret123
2FA: JBSWY3DPEHPK3PXP
Created: 2024
```

**Result:** Confidence 0.85 (Good)

#### Malformed Format

```
user@example.com
some random text
more text
```

**Result:** Confidence 0.35 (Poor)
- Only email detected
- Rest unparsed

### Error Handling

The parser gracefully handles errors:

```typescript
import { parseAccounts } from '@gmanager/parser';

// Empty input
const accounts = parseAccounts('');
// Returns: []

// Invalid format
const accounts = parseAccounts('not valid account data');
// Returns: [{
//   email: '',
//   unknown: ['not valid account data'],
//   confidence: 0.1
// }]

// Mixed valid/invalid
const text = `
Email: valid@example.com
Password: secret123

invalid data here
`;

const accounts = parseAccounts(text);
// Returns: [
//   { email: 'valid@example.com', confidence: 0.95 },
//   { email: '', unknown: ['invalid data here'], confidence: 0.2 }
// ]
```

### Performance

**Typical Performance:**

| Input Size | Parse Time | Throughput |
|------------|------------|------------|
| 10 accounts | 1-2ms | ~5-10k accounts/sec |
| 100 accounts | 10-20ms | ~5-10k accounts/sec |
| 1000 accounts | 100-200ms | ~5-10k accounts/sec |

### Development

```bash
# Build
pnpm build

# Test
pnpm test

# Test with coverage
pnpm test --coverage

# Lint
pnpm lint
```

### Testing

```typescript
import { describe, it, expect } from 'vitest';
import { parseAccounts } from '@gmanager/parser';

describe('parseAccounts', () => {
  it('should parse standard format', () => {
    const text = `
      Email: user@example.com
      Password: secret123
    `;

    const accounts = parseAccounts(text);
    expect(accounts).toHaveLength(1);
    expect(accounts[0].email).toBe('user@example.com');
    expect(accounts[0].password).toBe('secret123');
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
});
```

### Dependencies

**Peer Dependencies:**
- `@gmanager/shared`: For shared types

**Direct Dependencies:** None

### License

MIT

---

<a name="中文"></a>

## 中文文档

### 概述

`@gmanager/parser` 提供智能 GLM 账户信息文本解析。它自动检测分隔符、分类字段类型，并提供置信度评分以实现强大的数据提取。

### 安装

```bash
pnpm add @gmanager/parser
```

### 功能

- **自动分隔符检测**：支持冒号、等号、破折号等
- **智能字段分类**：识别邮箱、密码、TOTP 密钥、年份、国家
- **置信度评分**：为每个账户评分（0-1）
- **多格式支持**：处理各种文本格式
- **错误恢复**：优雅处理格式错误的数据
- **零依赖**：轻量级纯 TypeScript

### 使用方法

[参见上方英文部分的详细示例]

### API 参考

[参见上方英文部分的完整 API 文档]

主要函数：
- `parseAccounts()` - 解析多个账户
- `parseAccount()` - 解析单个账户
- `isValidAccount()` - 验证账户有效性
- `filterValidAccounts()` - 过滤有效账户
- `getParseStats()` - 获取解析统计

### 支持的字段类型

[参见上方英文部分]

### 置信度评分

| 分数 | 质量 | 描述 |
|------|------|------|
| 0.9 - 1.0 | 优秀 | 检测到所有字段，标准格式 |
| 0.7 - 0.9 | 良好 | 检测到大多数字段 |
| 0.5 - 0.7 | 一般 | 检测到部分字段 |
| 0.3 - 0.5 | 较差 | 检测到少量字段 |
| 0.0 - 0.3 | 很差 | 极少数据 |

### 性能

| 输入大小 | 解析时间 | 吞吐量 |
|----------|----------|--------|
| 10 个账户 | 1-2ms | ~5-10k 账户/秒 |
| 100 个账户 | 10-20ms | ~5-10k 账户/秒 |
| 1000 个账户 | 100-200ms | ~5-10k 账户/秒 |

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

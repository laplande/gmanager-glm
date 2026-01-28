# @gmanager/crypto

<div align="center">

**Cross-platform encryption utilities for GManager**

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Documentation

### Overview

`@gmanager/crypto` provides web-compatible encryption utilities using the Web Crypto API. It implements AES-256-GCM encryption for securing sensitive account data.

### Installation

```bash
pnpm add @gmanager/crypto
```

### Features

- **AES-256-GCM Encryption**: Industry-standard authenticated encryption
- **Key Derivation**: PBKDF2 with configurable parameters
- **Web Compatible**: Uses native Web Crypto API
- **Type Safe**: Full TypeScript support
- **Zero Dependencies**: No external crypto libraries

### Usage

#### Basic Encryption/Decryption

```typescript
import { encrypt, decrypt } from '@gmanager/crypto';

// Generate a random key
const key = await generateKey();

// Encrypt data
const encrypted = await encrypt('sensitive data', key);
console.log(encrypted);
// {
//   algorithm: 'aes-256-gcm',
//   iv: 'base64-encoded-iv',
//   ciphertext: 'base64-encoded-ciphertext',
//   authTag: 'base64-encoded-tag'
// }

// Decrypt data
const decrypted = await decrypt(encrypted, key);
console.log(decrypted); // 'sensitive data'
```

#### Key Derivation

```typescript
import { deriveKey } from '@gmanager/crypto';

// Derive key from password
const key = await deriveKey('my-master-password', {
  salt: crypto.getRandomValues(new Uint8Array(16)),
  iterations: 100000,
  keyLength: 256
});
```

#### Password Validation

```typescript
import { validatePassword } from '@gmanager/crypto';

const result = validatePassword('MyP@ssw0rd123');

if (!result.valid) {
  console.error(result.error); // 'Password too short'
}

console.log(result.strength); // 4
console.log(result.strengthLabel); // 'strong'
```

### API Reference

#### `encrypt(plaintext, key)`

Encrypts plaintext using AES-256-GCM.

```typescript
function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedData>
```

**Parameters:**
- `plaintext`: The string to encrypt
- `key`: CryptoKey for AES-GCM

**Returns:** Promise resolving to `EncryptedData`

**Example:**
```typescript
const encrypted = await encrypt('secret data', key);
```

#### `decrypt(encryptedData, key)`

Decrypts encrypted data.

```typescript
function decrypt(
  encryptedData: EncryptedData,
  key: CryptoKey
): Promise<string>
```

**Parameters:**
- `encryptedData`: The encrypted data object
- `key`: CryptoKey for AES-GCM

**Returns:** Promise resolving to decrypted string

**Throws:** Error if decryption fails

**Example:**
```typescript
const decrypted = await decrypt(encrypted, key);
```

#### `generateKey()`

Generates a random AES-256-GCM key.

```typescript
function generateKey(): Promise<CryptoKey>
```

**Returns:** Promise resolving to CryptoKey

**Example:**
```typescript
const key = await generateKey();
```

#### `deriveKey(password, params)`

Derives a key from password using PBKDF2.

```typescript
function deriveKey(
  password: string,
  params: {
    salt: Uint8Array;
    iterations?: number;
    keyLength?: number;
  }
): Promise<CryptoKey>
```

**Parameters:**
- `password`: Master password
- `params`: Derivation parameters
  - `salt`: Salt for key derivation
  - `iterations`: Number of iterations (default: 100000)
  - `keyLength`: Key length in bits (default: 256)

**Returns:** Promise resolving to CryptoKey

**Example:**
```typescript
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await deriveKey('my-password', { salt, iterations: 100000 });
```

#### `validatePassword(password)`

Validates password strength.

```typescript
function validatePassword(
  password: string
): PasswordValidation
```

**Parameters:**
- `password`: Password to validate

**Returns:** `PasswordValidation` object

**Example:**
```typescript
const result = validatePassword('MyP@ssw0rd');
console.log(result.strengthLabel); // 'fair'
```

#### `exportKey(key, format)`

Exports a key in specified format.

```typescript
function exportKey(
  key: CryptoKey,
  format: 'raw' | 'jwk'
): Promise<Uint8Array | JsonWebKey>
```

**Example:**
```typescript
const rawKey = await exportKey(key, 'raw');
```

#### `importKey(keyData, format)`

Imports a key from data.

```typescript
function importKey(
  keyData: Uint8Array | JsonWebKey,
  format: 'raw' | 'jwk'
): Promise<CryptoKey>
```

**Example:**
```typescript
const key = await importKey(rawKey, 'raw');
```

### Types

```typescript
interface EncryptedData {
  algorithm: 'aes-256-gcm';
  iv: string;          // Base64 encoded IV
  ciphertext: string;   // Base64 encoded ciphertext
  authTag?: string;     // Base64 encoded auth tag
}

interface PasswordValidation {
  valid: boolean;
  error?: string;
  strength: 0 | 1 | 2 | 3 | 4;
  strengthLabel: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
}
```

### Security Considerations

#### Key Storage

**Never store keys in:**
- `localStorage`
- `sessionStorage`
- Cookies
- URL parameters

**Always store keys in:**
- Memory variables (cleared on logout)
- Secure buffers (wiped after use)

#### Best Practices

1. **Use Strong Passwords**: Minimum 12 characters, mixed case, numbers, symbols
2. **Unique IV**: Never reuse initialization vectors
3. **Salt Storage**: Store salt alongside encrypted data
4. **Key Rotation**: Change master password periodically
5. **Error Handling**: Don't leak sensitive info in error messages

### Performance

**Typical Performance:**

| Operation | Time | Notes |
|-----------|------|-------|
| Key derivation | 50-100ms | Intentionally slow (security) |
| Encrypt (512 bytes) | 2-5ms | Depends on hardware |
| Decrypt (512 bytes) | 2-5ms | Depends on hardware |

### Browser Compatibility

Supported browsers:
- Chrome 67+
- Firefox 78+
- Safari 12.1+
- Edge 79+

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

### Examples

#### Complete Workflow

```typescript
import {
  deriveKey,
  encrypt,
  decrypt,
  exportKey,
  importKey
} from '@gmanager/crypto';

// 1. Derive key from password
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await deriveKey('master-password', { salt });

// 2. Export key for storage (optional)
const rawKey = await exportKey(key, 'raw');

// 3. Encrypt data
const encrypted = await encrypt('sensitive data', key);

// 4. Store encrypted data + salt
// (Store salt and encrypted data, never the key)

// 5. Later: Re-derive key from password
const key2 = await importKey(rawKey, 'raw');

// 6. Decrypt data
const decrypted = await decrypt(encrypted, key2);
console.log(decrypted); // 'sensitive data'
```

#### Password Strength Checker

```typescript
import { validatePassword } from '@gmanager/crypto';

function checkPassword(password: string) {
  const result = validatePassword(password);

  if (!result.valid) {
    console.error('Invalid password:', result.error);
    return false;
  }

  console.log('Password strength:', result.strengthLabel);
  console.log('Strength score:', result.strength, '/ 4');

  return result.strength >= 3; // Require at least 'good'
}

// Usage
checkPassword('weak'); // Invalid or weak
checkPassword('MyStr0ng!Pass'); // Strong
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

`@gmanager/crypto` 提供使用 Web Crypto API 的跨平台加密工具。它实现了 AES-256-GCM 加密以保护敏感账户数据。

### 安装

```bash
pnpm add @gmanager/crypto
```

### 功能

- **AES-256-GCM 加密**：行业标准认证加密
- **密钥派生**：可配置参数的 PBKDF2
- **Web 兼容**：使用原生 Web Crypto API
- **类型安全**：完整 TypeScript 支持
- **零依赖**：无外部加密库

### 使用方法

[参见上方英文部分的详细示例]

主要函数：
- `encrypt()` - 加密数据
- `decrypt()` - 解密数据
- `generateKey()` - 生成随机密钥
- `deriveKey()` - 从密码派生密钥
- `validatePassword()` - 验证密码强度

### API 参考

[参见上方英文部分的完整 API 文档]

### 安全考虑

#### 密钥存储

**永远不要将密钥存储在：**
- localStorage
- sessionStorage
- Cookies
- URL 参数

**始终将密钥存储在：**
- 内存变量（登出时清除）
- 安全缓冲区（使用后擦除）

#### 最佳实践

1. **使用强密码**：最少 12 个字符，混合大小写、数字、符号
2. **唯一 IV**：永远不要重用初始化向量
3. **盐值存储**：将盐值与加密数据一起存储
4. **密钥轮换**：定期更改主密码
5. **错误处理**：不要在错误消息中泄露敏感信息

### 性能

**典型性能：**

| 操作 | 时间 | 说明 |
|------|------|------|
| 密钥派生 | 50-100ms | 故意慢速（安全性） |
| 加密（512 字节） | 2-5ms | 取决于硬件 |
| 解密（512 字节） | 2-5ms | 取决于硬件 |

### 浏览器兼容性

支持的浏览器：
- Chrome 67+
- Firefox 78+
- Safari 12.1+
- Edge 79+

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

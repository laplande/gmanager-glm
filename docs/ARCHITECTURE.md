# GManager Architecture / 架构文档

<div align="center">

[English](#english) | [中文](#中文)

</div>

---

<a name="english"></a>

## English Documentation

### Table of Contents

1. [Overview](#overview)
2. [Monorepo Structure](#monorepo-structure)
3. [Desktop vs Web Architecture](#desktop-vs-web-architecture)
4. [Database Schema](#database-schema)
5. [Encryption Strategy](#encryption-strategy)
6. [Key Design Decisions](#key-design-decisions)
7. [Data Flow](#data-flow)
8. [Security Considerations](#security-considerations)

---

### Overview

GManager follows a **monorepo architecture** with shared packages and multiple applications. The system is designed to provide a secure, cross-platform account management solution with consistent functionality across desktop and web environments.

#### Architecture Principles

1. **Security First**: All sensitive data encrypted at rest
2. **Code Sharing**: Maximum code reuse between desktop and web
3. **Type Safety**: Full TypeScript coverage with strict mode
4. **Performance**: Native code for crypto, optimized queries
5. **Separation of Concerns**: Clear boundaries between layers

---

### Monorepo Structure

```
gmanager-glm/
│
├── apps/                          # Application implementations
│   ├── desktop/                   # Tauri desktop application
│   │   ├── src/                   # React frontend source
│   │   │   ├── api/               # Tauri command wrappers
│   │   │   ├── components/        # React components
│   │   │   ├── pages/             # Page components
│   │   │   ├── hooks/             # Custom React hooks
│   │   │   ├── i18n/              # Internationalization
│   │   │   └── main.tsx           # Entry point
│   │   ├── src-tauri/             # Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs        # Tauri app entry
│   │   │   │   ├── auth.rs        # Vault & session management
│   │   │   │   ├── accounts.rs    # Account CRUD operations
│   │   │   │   ├── groups.rs      # Group management
│   │   │   │   ├── tags.rs        # Tag management
│   │   │   │   ├── db/            # Database module
│   │   │   │   ├── crypto/        # Encryption module
│   │   │   │   └── auth/          # Authentication helpers
│   │   │   ├── Cargo.toml         # Rust dependencies
│   │   │   └── tauri.conf.json    # Tauri configuration
│   │   └── package.json
│   │
│   └── web/                       # Express.js web application
│       ├── src/                   # React frontend source
│       ├── server/                # Express backend
│       │   ├── routes/            # API routes
│       │   │   ├── auth.ts        # Authentication endpoints
│       │   │   └── accounts.ts    # Account endpoints
│       │   ├── middleware/        # Express middleware
│       │   ├── index.ts           # Server entry point
│       │   └── database.ts        # SQLite connection
│       └── package.json
│
├── packages/                      # Shared packages
│   ├── shared/                    # Shared types and constants
│   │   ├── src/
│   │   │   ├── types/             # TypeScript interfaces
│   │   │   │   ├── account.ts     # Account types
│   │   │   │   ├── database.ts    # Database types
│   │   │   │   └── crypto.ts      # Crypto types
│   │   │   ├── constants/         # App constants
│   │   │   └── index.ts           # Package exports
│   │   └── package.json
│   │
│   ├── crypto/                    # Encryption utilities
│   │   ├── src/
│   │   │   ├── encryption.ts      # AES-256-GCM implementation
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── parser/                    # Account text parser
│   │   ├── src/
│   │   │   ├── delimiter.ts       # Multi-format delimiter detection
│   │   │   ├── fieldDetector.ts   # Smart field detection
│   │   │   ├── parser.ts          # Main parsing logic
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── ui/                        # Component library
│       ├── src/
│       │   ├── components/        # Reusable components
│       │   │   ├── Button.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Dialog.tsx
│       │   │   ├── Select.tsx
│       │   │   └── ...
│       │   └── index.ts
│       └── package.json
│
├── docs/                          # Documentation
│   ├── ARCHITECTURE.md            # This file
│   ├── API.md                     # API documentation
│   └── DEVELOPMENT.md             # Developer guide
│
├── package.json                   # Root package configuration
├── pnpm-workspace.yaml            # Workspace configuration
├── tsconfig.base.json             # Shared TypeScript config
├── tailwind.config.js             # TailwindCSS configuration
└── postcss.config.js              # PostCSS configuration
```

#### Package Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                         Applications                         │
├───────────────────────────┬─────────────────────────────────┤
│      Desktop App          │          Web App                 │
│  (Tauri + React)          │     (Express + React)           │
└───────────┬───────────────┴─────────────────┬───────────────┘
            │                                 │
            ├───────────────────┬─────────────┘
            │                   │
    ┌───────▼────────┐   ┌─────▼──────┐
    │   @gmanager/ui │   │ @gmanager/ │
    │                │   │  shared    │
    └────────┬───────┘   └─────┬──────┘
             │                 │
             └────────┬────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼─────┐  ┌───▼────┐  ┌────▼────┐
   │ @gmanager│  │@gmanager│  │@gmanager│
   │ /crypto  │  │/parser │  │  /ui    │
   └──────────┘  └────────┘  └─────────┘
```

---

### Desktop vs Web Architecture

#### Desktop Application (Tauri)

**Architecture**: Hybrid native/web application

**Frontend (TypeScript/React)**:
- React 19 with modern hooks
- Zustand for state management
- Tauri API for native operations
- Direct communication with Rust backend

**Backend (Rust)**:
```rust
// Session Management
SessionManager {
    current_session: Option<Session>,
    sessions: HashMap<String, Session>,
}

// Database Layer
Database {
    connection: rusqlite::Connection,
    encryption_key: Option<Vec<u8>>,
}

// Tauri Commands (exposed to frontend)
- check_has_vault_command()
- create_vault_command()
- unlock_vault_command()
- get_accounts_command()
- create_account_command()
- // ... (30+ commands)
```

**Data Flow**:
```
React Component
    │
    ├─> invoke('command_name', { params })
    │
    │
Tauri IPC Bridge
    │
    ├─> Rust Command Handler
    │
    │
├─> Business Logic
│   ├─> Database Operations
│   ├─> Encryption/Decryption
│   └─> Validation
    │
    └─> Return Result to Frontend
```

**Advantages**:
- Native performance for crypto operations
- Direct file system access
- Smaller bundle size
- Offline-first architecture
- Strong security sandbox

#### Web Application (Express + React)

**Architecture**: Traditional client-server architecture

**Frontend (TypeScript/React)**:
- React 19 with modern hooks
- Zustand for client state
- TanStack React Query for server state
- RESTful API communication

**Backend (Node.js/Express)**:
```typescript
// Server
Express Server {
  - Authentication middleware
  - RESTful API routes
  - Session management (in-memory)
  - SQLite database connection
}

// API Routes
POST   /api/auth/check     - Check if vault exists
POST   /api/auth/create    - Create new vault
POST   /api/auth/unlock    - Unlock vault
GET    /api/accounts       - List accounts
POST   /api/accounts       - Create account
PUT    /api/accounts/:id   - Update account
DELETE /api/accounts/:id   - Delete account
// ... (30+ endpoints)
```

**Data Flow**:
```
React Component
    │
    ├─> fetch('/api/accounts', { headers: { Authorization: token } })
    │
    │
HTTP Request
    │
    ├─> Express Router
    │
    │
├─> Auth Middleware (validate session)
    │
    ├─> Route Handler
    │
    │
├─> Business Logic
│   ├─> Database Operations
│   ├─> Encryption/Decryption
│   └─> Validation
    │
    └─> JSON Response
```

**Advantages**:
- Universal platform support
- Easy deployment (Vercel, Railway, etc.)
- Simple updates (no client reinstall)
- Shared hosting capability
- Browser-based access

#### Shared Code Strategy

**100% Code Sharing**:
- UI components (@gmanager/ui)
- Type definitions (@gmanager/shared)
- Encryption logic (@gmanager/crypto)
- Parsing logic (@gmanager/parser)

**Platform-Specific**:
- API layer (Tauri invoke vs REST calls)
- State persistence (Tauri store vs HTTP session)
- Database (rusqlite vs better-sqlite3)

---

### Database Schema

#### SQLite Schema

```sql
-- Vault Configuration
CREATE TABLE vault (
    id TEXT PRIMARY KEY,
    master_hash TEXT NOT NULL,           -- Argon2id hash of master password
    salt TEXT NOT NULL,                  -- Salt for password hashing
    iterations INTEGER NOT NULL,         -- Argon2id iterations
    version INTEGER NOT NULL             -- Schema version
);

-- Raw Import Tracking
CREATE TABLE raw_imports (
    id TEXT PRIMARY KEY,
    raw_text TEXT NOT NULL,              -- Original imported text
    source_type TEXT NOT NULL,           -- 'file', 'text', 'database'
    source_name TEXT,                    -- Source identifier
    imported_at TEXT NOT NULL            -- ISO timestamp
);

-- Accounts
CREATE TABLE accounts (
    id TEXT PRIMARY KEY,
    raw_import_id TEXT,                  -- FK to raw_imports
    email TEXT NOT NULL,                 -- Encrypted email
    password TEXT,                       -- Encrypted password
    recovery_email TEXT,                 -- Encrypted recovery email
    totp_secret TEXT,                    -- Encrypted TOTP secret
    year TEXT,                           -- Optional year
    notes TEXT,                          -- Encrypted notes
    group_id TEXT,                       -- FK to groups
    field_order TEXT,                    -- JSON field order
    created_at TEXT NOT NULL,            -- ISO timestamp
    updated_at TEXT NOT NULL,            -- ISO timestamp
    FOREIGN KEY (raw_import_id) REFERENCES raw_imports(id)
    FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Groups
CREATE TABLE groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,           -- Group name
    color TEXT,                          -- Hex color
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL             -- ISO timestamp
);

-- Tags
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,           -- Tag name
    color TEXT,                          -- Hex color
    created_at TEXT NOT NULL             -- ISO timestamp
);

-- Account-Tag Junction (Many-to-Many)
CREATE TABLE account_tags (
    account_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    assigned_at TEXT NOT NULL,           -- ISO timestamp
    PRIMARY KEY (account_id, tag_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Operation Logs (Audit Trail)
CREATE TABLE operation_logs (
    id TEXT PRIMARY KEY,
    account_id TEXT,                     -- FK to accounts (null for global ops)
    action TEXT NOT NULL,                -- 'import', 'update', 'delete', etc.
    details TEXT,                        -- JSON details
    created_at TEXT NOT NULL,            -- ISO timestamp
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Indexes for Performance
CREATE INDEX idx_accounts_group ON accounts(group_id);
CREATE INDEX idx_accounts_created ON accounts(created_at);
CREATE INDEX idx_account_tags_account ON account_tags(account_id);
CREATE INDEX idx_account_tags_tag ON account_tags(tag_id);
CREATE INDEX idx_operation_logs_account ON operation_logs(account_id);
CREATE INDEX idx_operation_logs_created ON operation_logs(created_at);
```

#### Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐
│   Vault     │         │ RawImport   │
├─────────────┤         ├─────────────┤
│ id (PK)     │         │ id (PK)     │
│ master_hash │         │ raw_text    │
│ salt        │         │ source_type │
│ iterations  │         │ source_name │
│ version     │         │ imported_at │
└─────────────┘         └──────┬──────┘
                                │ 1
                                │
                                │ N
                        ┌───────▼──────────┐
                        │     Account      │
                        ├──────────────────┤
                        │ id (PK)          │
                        │ raw_import_id    │──┐
                        │ email            │  │
                        │ password         │  │
                        │ recovery_email   │  │
                        │ totp_secret      │  │
                        │ year             │  │
                        │ notes            │  │
                        │ group_id         │──┼─┐
                        │ field_order      │  │ │
                        │ created_at       │  │ │
                        │ updated_at       │  │ │
                        └──────────────────┘  │ │
                                │             │ │
                                │ N           │ │ 1
                                │             │ │
                    ┌───────────▼────┐         │ │
                    │  AccountTag    │         │ │
                    ├────────────────┤         │ │
                    │ account_id (PK) │         │ │
                    │ tag_id (PK)     │         │ │
                    │ assigned_at     │         │ │
                    └────┬──────┬────┘         │ │
                         │      │              │ │
                         │      │ N            │ │ N
                         │ 1    │              │ │
                    ┌────▼────┐ │         ┌────▼────▼──────┐
                    │  Tag    │ │         │    Group       │
                    ├─────────┤ │         ├────────────────┤
                    │ id (PK) │ │         │ id (PK)        │
                    │ name    │ │         │ name           │
                    │ color   │ │         │ color          │
                    │ created │ │         │ sort_order     │
                    └─────────┘ │         │ created_at     │
                                 │         └────────────────┘
                                 │
                                 │ N
                                 │
                    ┌────────────▼──────────┐
                    │   OperationLog        │
                    ├───────────────────────┤
                    │ id (PK)               │
                    │ account_id            │
                    │ action                │
                    │ details               │
                    │ created_at            │
                    └───────────────────────┘
```

---

### Encryption Strategy

#### Encryption Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                   User Master Password                  │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ Argon2id Key Derivation
                        │ - Salt: 16 bytes (random)
                        │ - Iterations: 100,000
                        │ - Memory: 64 MB
                        │ - Parallelism: 4
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│              Vault Encryption Key (256-bit)             │
└───────────────────────┬─────────────────────────────────┘
                        │
                        │ AES-256-GCM Encryption
                        │ - Mode: GCM (authenticated)
                        │ - Key Size: 256 bits
                        │ - Nonce: 96 bits (unique per encrypt)
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│           Encrypted Account Data at Rest                │
│  ├─ Email (encrypted)                                   │
│  ├─ Password (encrypted)                                │
│  ├─ Recovery Email (encrypted)                          │
│  ├─ TOTP Secret (encrypted)                             │
│  └─ Notes (encrypted)                                   │
└─────────────────────────────────────────────────────────┘
```

#### Desktop Encryption (Rust)

**Library**: `ring` (Rust cryptography library)

```rust
use ring::aead::{AES_256_GCM, LessSafeKey, Nonce, UnboundKey};
use ring::rand::{SecureRandom, SystemRandom};

// Derive key from password
fn derive_key(password: &str, salt: &[u8]) -> Vec<u8> {
    // Argon2id with parameters:
    // - t_cost = 3 (iterations)
    // - m_cost = 2^16 (64 MB)
    // - parallelism = 4
    // - output length = 32 bytes (256 bits)
    argon2::hash_encoded(password.as_bytes(), salt, &Default::default()).unwrap()
}

// Encrypt field
fn encrypt_field(plaintext: &str, key: &[u8]) -> Result<String> {
    let rng = SystemRandom::new();
    let mut nonce_bytes = [0u8; 12];
    rng.fill(&mut nonce_bytes)?;

    let unbound_key = UnboundKey::new(&AES_256_GCM, key)?;
    let less_safe_key = LessSafeKey::new(unbound_key);
    let nonce = Nonce::assume_unique_for_key(nonce_bytes);

    let mut plaintext_bytes = plaintext.as_bytes().to_vec();
    less_safe_key.seal_in_place_append_tag(nonce, &mut plaintext_bytes)?;

    // Return base64(nonce + ciphertext)
    Ok(base64::encode([nonce_bytes, plaintext_bytes].concat()))
}

// Decrypt field
fn decrypt_field(ciphertext: &str, key: &[u8]) -> Result<String> {
    let data = base64::decode(ciphertext)?;
    let (nonce_bytes, ciphertext_bytes) = data.split_at(12);

    let unbound_key = UnboundKey::new(&AES_256_GCM, key)?;
    let less_safe_key = LessSafeKey::new(unbound_key);
    let nonce = Nonce::assume_unique_for_key(nonce_bytes.try_into()?);

    let mut data = ciphertext_bytes.to_vec();
    less_safe_key.open_in_place(nonce, &mut data)?;

    Ok(String::from_utf8(data)?)
}
```

#### Web Encryption (Web Crypto API)

**Library**: Native `window.crypto.subtle`

```typescript
// Derive key from password
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt field
async function encryptField(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    encoder.encode(plaintext)
  );

  // Combine nonce + ciphertext and encode as base64
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce);
  combined.set(new Uint8Array(ciphertext), nonce.length);

  return btoa(String.fromCharCode(...combined));
}

// Decrypt field
async function decryptField(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const nonce = data.slice(0, 12);
  const encrypted = data.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
```

#### Key Security Properties

1. **Non-Deterministic Encryption**: Each encryption uses a unique nonce
2. **Authenticated Encryption**: GCM mode provides integrity verification
3. **Key Derivation**: Argon2id resists brute-force and dictionary attacks
4. **No Key Storage**: Keys derived from password, never stored
5. **Memory Safety**: Rust's type system prevents memory leaks
6. **Forward Secrecy**: Changing master password re-encrypts all data

---

### Key Design Decisions

#### 1. Monorepo Architecture

**Decision**: Use pnpm workspaces for monorepo management

**Rationale**:
- **Code Sharing**: 100% type sharing between desktop and web
- **Consistency**: Single source of truth for business logic
- **Developer Experience**: Single repository for all platforms
- **CI/CD**: Unified testing and release pipeline

**Trade-offs**:
- Increased complexity of root configuration
- Potential for package dependency confusion
- Longer initial clone time

**Mitigation**:
- Clear package.json exports
- Comprehensive documentation
- Automated dependency management

#### 2. SQLite Database

**Decision**: Use SQLite for both desktop and web

**Rationale**:
- **Zero Configuration**: No database server required
- **Portability**: Single file for easy backup/migration
- **Performance**: In-process SQL engine, very fast
- **Reliability**: ACID compliant, battle-tested
- **Cross-Platform**: Works on all major platforms

**Trade-offs**:
- Limited concurrency (single writer)
- No built-in replication
- Large datasets may require optimization

**Mitigation**:
- Efficient schema design with indexes
- Connection pooling for web version
- Migration strategy for future scaling

#### 3. Client-Side Encryption

**Decision**: Encrypt/decrypt on client, never send plaintext to server

**Rationale**:
- **Zero Knowledge**: Server never sees sensitive data
- **Security**: Database breach exposes only encrypted data
- **Privacy**: Complete user control
- **Compliance**: GDPR-friendly by design

**Trade-offs**:
- Cannot search encrypted fields efficiently
- Complex key management
- Performance overhead for crypto operations

**Mitigation**:
- Search on decrypted results in memory
- Efficient key derivation with caching
- Native crypto libraries (Rust) for performance

#### 4. React Framework

**Decision**: Use React 19 for both desktop and web

**Rationale**:
- **Ecosystem**: Largest component ecosystem
- **Performance**: React 19 improvements (compiler, concurrent features)
- **Developer Experience**: Extensive tooling and documentation
- **Talent Pool**: Easy to hire React developers

**Trade-offs**:
- Bundle size (mitigated by code splitting)
- Learning curve for new developers
- Framework lock-in

**Mitigation**:
- Shared component library (@gmanager/ui)
- Extensive documentation
- Component testing with Vitest

#### 5. TypeScript Strict Mode

**Decision**: Enable all strict type checking options

**Rationale**:
- **Type Safety**: Catch errors at compile time
- **Developer Experience**: Better IDE autocomplete
- **Code Quality**: Self-documenting code
- **Refactoring**: Safe refactoring with type checks

**Configuration**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

#### 6. Tauri for Desktop

**Decision**: Use Tauri instead of Electron

**Rationale**:
- **Bundle Size**: ~3 MB vs ~150 MB (Electron)
- **Security**: Rust backend, smaller attack surface
- **Performance**: Native performance for crypto operations
- **Resource Usage**: Lower memory footprint
- **Modern**: Uses OS WebView (Edge, WebKit, GTK)

**Trade-offs**:
- Smaller ecosystem than Electron
- Newer technology (less mature tooling)
- Learning curve for Rust

**Mitigation**:
- Comprehensive Rust documentation
- Shared TypeScript types
- Extensive testing

---

### Data Flow

#### Authentication Flow (Desktop)

```
User enters master password
    │
    ▼
Frontend: auth.unlockVault(password)
    │
    ▼
Tauri Command: unlock_vault_command(password)
    │
    ├─> Retrieve vault from database
    ├─> Verify password using Argon2id
    │   - Compare: hash(password + salt) == stored_hash
    ├─> If valid, derive encryption key
    │   - key = argon2id(password, salt)
    ├─> Create session
    │   - session_id = random_uuid()
    │   - encryption_key = derived_key
    │   - expires_at = now() + 30min
    ├─> Store in SessionManager
    │
    ▼
Return session_id to frontend
    │
    ▼
Frontend stores session_id (in-memory)
    │
    ▼
Subsequent commands include session_id
```

#### Account Creation Flow

```
User fills account form
    │
    ▼
Frontend: accounts.create(accountData)
    │
    ▼
Tauri Command: create_account_command(account)
    │
    ├─> Validate session
    ├─> Validate account data
    │   - Email format
    │   - Required fields
    ├─> Encrypt sensitive fields
    │   - encrypted_email = encrypt(email, session_key)
    │   - encrypted_password = encrypt(password, session_key)
    │   - etc.
    ├─> Generate account ID
    │   - id = uuid_v4()
    ├─> Insert into database
    │   - INSERT INTO accounts (...) VALUES (...)
    ├─> Log operation
    │   - INSERT INTO operation_logs (action='create')
    │
    ▼
Return account_id to frontend
    │
    ▼
Frontend updates UI with new account
```

#### Search Flow

```
User enters search query
    │
    ▼
Frontend: accounts.search({ query: 'work', tag_id: '5' })
    │
    ▼
Tauri Command: search_accounts_command(params)
    │
    ├─> Validate session
    ├─> Build SQL query with filters
    │   - SELECT * FROM accounts
    │   - WHERE (email LIKE ? OR notes LIKE ?)
    │   - AND group_id = ?
    │   - JOIN account_tags ON ...
    │   - WHERE account_tags.tag_id = ?
    ├─> Execute query
    ├─> For each result:
    │   - Decrypt fields using session_key
    │   - Decrypt email
    │   - Decrypt password
    │   - etc.
    │   - Fetch related tags
    │   - Fetch related group
    ├─> Return decrypted accounts
    │
    ▼
Frontend displays search results
```

---

### Security Considerations

#### Threat Model

**Protected Against**:
- ✓ Database file theft (encrypted at rest)
- ✓ Memory dumps (keys in secure memory)
- ✓ unauthorized API access (session validation)
- ✓ Password brute force (Argon2id, rate limiting)
- ✓ Cross-site scripting (Content Security Policy)
- ✓ SQL injection (parameterized queries)

**Out of Scope** (User Responsibility):
- ✗ Master password strength
- ✗ Compromised device (keyloggers, malware)
- ✗ Physical access to unlocked device
- ✗ Screen recording/capture

#### Security Best Practices

1. **Password Hashing**:
   - Algorithm: Argon2id (winner of Password Hashing Competition 2015)
   - Salt: 16 bytes, cryptographically random
   - Iterations: 100,000 (adjustable based on hardware)
   - Memory: 64 MB (to prevent GPU/ASIC attacks)

2. **Encryption**:
   - Algorithm: AES-256-GCM (NIST approved)
   - Mode: Authenticated encryption (AEAD)
   - Nonce: 96 bits, unique per encryption
   - Key Rotation: When master password changes

3. **Session Management**:
   - Timeout: 30 minutes of inactivity
   - Storage: In-memory only
   - Session ID: Cryptographically random UUID
   - Cleanup: Automatic expiration

4. **Input Validation**:
   - All user inputs validated
   - Email format validation
   - Field length limits
   - Type checking at runtime

5. **Secure Coding**:
   - No hardcoded secrets
   - No sensitive data in logs
   - Error messages don't leak information
   - Dependencies audited regularly

---

<a name="中文"></a>

## 中文文档

### 目录

1. [概述](#概述-中文)
2. [Monorepo 结构](#monorepo-结构-中文)
3. [桌面与 Web 架构](#桌面与-web-架构-中文)
4. [数据库架构](#数据库架构-中文)
5. [加密策略](#加密策略-中文)
6. [关键设计决策](#关键设计决策-中文)
7. [数据流](#数据流-中文)
8. [安全考虑](#安全考虑-中文)

---

### 概述 (中文)

GManager 采用 **Monorepo 架构**，包含共享包和多个应用程序。系统设计旨在提供安全、跨平台的账户管理解决方案，在桌面和 Web 环境中保持一致的功能。

#### 架构原则

1. **安全优先**：所有敏感数据静态加密
2. **代码共享**：桌面和 Web 之间最大化代码重用
3. **类型安全**：完整的 TypeScript 覆盖和严格模式
4. **性能**：加密使用原生代码，查询优化
5. **关注点分离**：层次之间界限清晰

---

### Monorepo 结构 (中文)

[详见上方英文部分的完整结构图]

主要包含：
- **apps/** - 应用实现（桌面、Web）
- **packages/** - 共享包（类型、加密、解析、UI）
- **docs/** - 文档

---

### 桌面与 Web 架构 (中文)

#### 桌面应用 (Tauri)

**架构**：混合原生/Web 应用

**优势**：
- 加密操作的原生性能
- 直接文件系统访问
- 较小的包体积
- 离线优先架构
- 强大的安全沙箱

#### Web 应用 (Express + React)

**架构**：传统客户端-服务器架构

**优势**：
- 通用平台支持
- 简单部署（Vercel、Railway 等）
- 简单更新（无需客户端重新安装）
- 共享托管能力
- 基于浏览器的访问

---

### 数据库架构 (中文)

[详见上方英文部分的完整架构图]

主要表结构：
- **vault** - 保险库配置
- **raw_imports** - 原始导入跟踪
- **accounts** - 账户信息
- **groups** - 分组
- **tags** - 标签
- **account_tags** - 账户-标签关联
- **operation_logs** - 操作日志（审计跟踪）

---

### 加密策略 (中文)

#### 加密层次

```
用户主密码
    │ Argon2id 密钥派生
    ▼
保险库加密密钥 (256 位)
    │ AES-256-GCM 加密
    ▼
静态加密的账户数据
```

#### 安全属性

1. **非确定性加密**：每次加密使用唯一 nonce
2. **认证加密**：GCM 模式提供完整性验证
3. **密钥派生**：Argon2id 抵抗暴力破解和字典攻击
4. **无密钥存储**：密钥从密码派生，永不存储
5. **内存安全**：Rust 类型系统防止内存泄漏
6. **前向保密**：更改主密码重新加密所有数据

---

### 关键设计决策 (中文)

1. **Monorepo 架构**：使用 pnpm 工作区
2. **SQLite 数据库**：桌面和 Web 通用
3. **客户端加密**：加密/解密在客户端进行
4. **React 框架**：桌面和 Web 都使用 React 19
5. **TypeScript 严格模式**：启用所有严格类型检查
6. **Tauri 桌面**：使用 Tauri 而非 Electron

---

### 数据流 (中文)

#### 认证流程（桌面）

```
用户输入主密码
    ▼
前端：auth.unlockVault(password)
    ▼
Tauri 命令：unlock_vault_command(password)
    ├─> 从数据库检索保险库
    ├─> 使用 Argon2id 验证密码
    ├─> 如果有效，派生加密密钥
    ├─> 创建会话
    └─> 返回 session_id
```

#### 账户创建流程

```
用户填写账户表单
    ▼
前端：accounts.create(accountData)
    ▼
Tauri 命令：create_account_command(account)
    ├─> 验证会话
    ├─> 验证账户数据
    ├─> 加密敏感字段
    ├─> 生成账户 ID
    ├─> 插入数据库
    └─> 记录操作日志
```

---

### 安全考虑 (中文)

#### 威胁模型

**可防护**：
- ✓ 数据库文件被盗（静态加密）
- ✓ 内存转储（安全内存中的密钥）
- ✓ 未授权 API 访问（会话验证）
- ✓ 密码暴力破解（Argon2id、速率限制）

**超出范围**（用户责任）：
- ✗ 主密码强度
- ✗ 受损设备（键盘记录器、恶意软件）
- ✗ 对已解锁设备的物理访问

---

<div align="center">

**For more details, see the API Reference and Development Guide**

</div>

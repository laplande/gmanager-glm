# Windows 桌面应用构建指南 | Windows Desktop Build Guide

本指南介绍如何在 Windows 平台上构建 GManager 桌面应用程序。

This guide explains how to build the GManager desktop application on Windows platform.

---

## 目录 | Table of Contents

- [前置条件 | Prerequisites](#前置条件--prerequisites)
- [环境准备 | Environment Setup](#环境准备--environment-setup)
- [克隆和依赖安装 | Clone and Dependencies](#克隆和依赖安装--clone-and-dependencies)
- [构建流程 | Build Process](#构建流程--build-process)
- [构建产物 | Build Artifacts](#构建产物--build-artifacts)
- [常见问题 | Troubleshooting](#常见问题--troubleshooting)
- [验证构建 | Build Verification](#验证构建--build-verification)

---

## 前置条件 | Prerequisites

### 必需软件 | Required Software

#### 1. Node.js 20+

**下载安装:**

```powershell
# 访问官网下载
https://nodejs.org/

# 或使用 winget 安装
winget install OpenJS.NodeJS.LTS

# 验证安装
node --version  # 应该 >= 20.0.0
npm --version
```

#### 2. pnpm 包管理器

**安装:**

```powershell
# 使用 npm 全局安装
npm install -g pnpm

# 验证安装
pnpm --version  # 应该 >= 9.0.0
```

#### 3. Rust 工具链

**安装 rustup (Rust 安装器):**

```powershell
# 访问官网下载 rustup-init.exe
https://rustup.rs/

# 或直接下载
https://win.rustup.rs/x86_64

# 运行安装器，选择默认选项 (1)
# 安装完成后重启 PowerShell

# 验证安装
rustc --version  # 应该 >= 1.70
cargo --version
```

**配置 Rust 工具链:**

```powershell
# 安装 MSVC 目标
rustup default stable-msvc

# 更新到最新版本
rustup update
```

#### 4. Visual Studio Build Tools 2022

**下载安装:**

```powershell
# 访问 Visual Studio 下载页面
https://visualstudio.microsoft.com/downloads/

# 下载 "Build Tools for Visual Studio 2022"
https://aka.ms/vs/17/release/vs_BuildTools.exe
```

**必需的工作负载:**

在 Visual Studio Installer 中，选择安装以下组件：

- ✅ **C++ 桌面开发 (Desktop development with C++)**
  - MSVC v143 - VS 2022 C++ x64/x86 生成工具
  - Windows 11 SDK (最新版本)
  - C++ CMake tools for Windows

**验证安装:**

```powershell
# 检查 MSVC 编译器
cl.exe
# 应该显示 Microsoft C/C++ Optimizing Compiler 版本信息

# 检查 Windows SDK
dir "C:\Program Files (x86)\Windows Kits\10\Include"
```

#### 5. WebView2 Runtime (通常已预装)

**检查是否已安装:**

```powershell
# WebView2 通常在 Windows 10/11 中预装
# 检查注册表
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
```

**如果未安装，下载:**

```powershell
# 访问下载页面
https://developer.microsoft.com/microsoft-edge/webview2/
```

---

## 环境准备 | Environment Setup

### 配置环境变量

```powershell
# 确保以下路径在 PATH 中：
# - C:\Users\<YourName>\.cargo\bin (Rust)
# - C:\Program Files\nodejs\ (Node.js)
# - Visual Studio Build Tools 路径

# 查看当前 PATH
$env:PATH
```

### 验证所有前置条件

```powershell
# 运行完整检查
node --version      # >= 20.0.0
pnpm --version      # >= 9.0.0
rustc --version     # >= 1.70
cargo --version
cl.exe              # 应显示 MSVC 版本
```

---

## 克隆和依赖安装 | Clone and Dependencies

### 1. 克隆代码库

```powershell
# 克隆项目
git clone https://github.com/yourusername/gmanager-glm.git
cd gmanager-glm

# 或使用 SSH
git clone git@github.com:yourusername/gmanager-glm.git
cd gmanager-glm
```

### 2. 安装依赖

```powershell
# 安装所有工作区依赖
pnpm install

# 等待安装完成（首次安装可能需要 3-5 分钟）
```

### 3. 构建共享包

**重要:** 在构建桌面应用之前，必须先构建共享包。

```powershell
# 方法 1: 构建所有共享包（推荐）
pnpm --filter './packages/**' build

# 方法 2: 手动按顺序构建各个包
cd packages/shared
pnpm build
cd ../crypto
pnpm build
cd ../parser
pnpm build
cd ../ui
pnpm build
cd ../../
```

**验证构建成功:**

```powershell
# 检查构建产物
dir packages/shared/dist
dir packages/crypto/dist
dir packages/parser/dist
dir packages/ui/dist
```

---

## 构建流程 | Build Process

### 开发模式构建

```powershell
# 进入桌面应用目录
cd apps/desktop

# 启动开发模式（带热重载）
pnpm tauri dev

# 应用将自动打开，前端运行在 http://localhost:1420
```

### 生产环境构建

```powershell
# 确保在 apps/desktop 目录
cd apps/desktop

# 执行 Tauri 构建
pnpm tauri build

# 构建过程说明：
# 1. TypeScript 编译 (tsc)
# 2. Vite 前端构建
# 3. Rust 后端编译（release 模式）
# 4. 打包安装程序（MSI + NSIS）
```

**构建时间估计:**

- 首次构建: 10-15 分钟（包含 Rust 依赖编译）
- 后续构建: 3-5 分钟（增量编译）

### 构建指定目标平台

```powershell
# Windows x64 (默认)
pnpm tauri build --target x86_64-pc-windows-msvc

# Windows x86 (32位)
rustup target add i686-pc-windows-msvc
pnpm tauri build --target i686-pc-windows-msvc

# Windows ARM64
rustup target add aarch64-pc-windows-msvc
pnpm tauri build --target aarch64-pc-windows-msvc
```

### 仅构建前端（不打包）

```powershell
# 如果只需要构建前端
cd apps/desktop
pnpm build

# 输出到 apps/desktop/dist/
```

---

## 构建产物 | Build Artifacts

### 输出目录结构

```
apps/desktop/src-tauri/target/release/
├── bundle/
│   ├── msi/              # Windows MSI 安装包
│   │   └── GManager_0.1.0_x64_en-US.msi
│   └── nsis/             # NSIS 安装程序
│       └── GManager_0.1.0_x64-setup.exe
└── GManager.exe          # 独立可执行文件（未打包）
```

### 各安装包说明

#### MSI 安装包

```powershell
# 位置
apps/desktop/src-tauri/target/release/bundle/msi/GManager_0.1.0_x64_en-US.msi

# 特点
- Windows Installer 标准格式
- 支持企业部署
- 可通过组策略分发
- 适合公司环境

# 安装
双击 .msi 文件或运行:
msiexec /i GManager_0.1.0_x64_en-US.msi
```

#### NSIS 安装程序

```powershell
# 位置
apps/desktop/src-tauri/target/release/bundle/nsis/GManager_0.1.0_x64-setup.exe

# 特点
- 现代安装向导
- 体积更小
- 自定义安装选项
- 适合个人用户

# 安装
双击 .exe 文件运行安装向导
```

#### 独立可执行文件

```powershell
# 位置
apps/desktop/src-tauri/target/release/GManager.exe

# 特点
- 无需安装
- 便携版本
- 适合测试和便携使用
- 需要 WebView2 运行时

# 运行
直接双击或命令行运行:
.\GManager.exe
```

---

## 常见问题 | Troubleshooting

### 问题 1: Rust 编译错误

**错误信息:**
```
error: linker `link.exe` not found
```

**解决方案:**

```powershell
# 确保已安装 Visual Studio Build Tools
# 重新运行 rustup 设置
rustup default stable-msvc

# 验证 MSVC 工具链
rustup toolchain list
# 应该显示: stable-x86_64-pc-windows-msvc (default)

# 检查 link.exe 是否可用
where link.exe
```

### 问题 2: WebView2 依赖错误

**错误信息:**
```
WebView2 runtime not found
```

**解决方案:**

```powershell
# 下载并安装 WebView2 Evergreen Runtime
# https://developer.microsoft.com/microsoft-edge/webview2/

# 或使用 winget 安装
winget install Microsoft.EdgeWebView2Runtime

# 验证安装
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
```

### 问题 3: 图标文件错误

**错误信息:**
```
failed to bundle project: failed to build app bundle: invalid icon file
```

**解决方案:**

```powershell
# 检查图标文件是否存在
cd apps/desktop/src-tauri
dir icons\

# 应该包含:
# - icon.ico (Windows)
# - 32x32.png
# - 128x128.png
# - 128x128@2x.png

# 如果缺失，从项目根目录复制或重新生成
```

### 问题 4: pnpm 依赖安装失败

**错误信息:**
```
ERR_PNPM_PEER_DEP_ISSUES
```

**解决方案:**

```powershell
# 清理缓存并重新安装
pnpm store prune
rm -r node_modules
rm pnpm-lock.yaml
pnpm install

# 或使用强制选项
pnpm install --force
```

### 问题 5: Tauri CLI 未找到

**错误信息:**
```
'tauri' is not recognized as an internal or external command
```

**解决方案:**

```powershell
# 确保使用 pnpm tauri 而不是直接使用 tauri
pnpm tauri build

# 或全局安装 Tauri CLI
cargo install tauri-cli

# 验证安装
cargo tauri --version
```

### 问题 6: 内存不足错误

**错误信息:**
```
FATAL ERROR: Reached heap limit Allocation failed
```

**解决方案:**

```powershell
# 增加 Node.js 内存限制
$env:NODE_OPTIONS="--max-old-space-size=4096"

# 然后重新构建
pnpm tauri build
```

### 问题 7: 权限错误

**错误信息:**
```
Access denied / Permission denied
```

**解决方案:**

```powershell
# 以管理员身份运行 PowerShell
# 右键点击 PowerShell -> "以管理员身份运行"

# 或临时禁用防病毒软件（某些会阻止 Rust 编译）
```

### 问题 8: 构建时间过长

**优化方案:**

```powershell
# 1. 使用增量编译（默认启用）
# 2. 添加 Cargo 并行编译配置
# 在 %USERPROFILE%\.cargo\config.toml 中添加:
# [build]
# jobs = 4  # 根据 CPU 核心数调整

# 3. 使用 SSD 硬盘存储项目
# 4. 排除项目目录于防病毒扫描
```

---

## 验证构建 | Build Verification

### 测试安装包

```powershell
# 1. 测试 MSI 安装包
cd apps/desktop/src-tauri/target/release/bundle/msi
.\GManager_0.1.0_x64_en-US.msi

# 2. 测试 NSIS 安装程序
cd ../nsis
.\GManager_0.1.0_x64-setup.exe

# 3. 测试独立可执行文件
cd ../../
.\GManager.exe
```

### 检查应用功能

安装或运行应用后，验证以下功能：

- [ ] 应用成功启动
- [ ] 窗口大小和布局正常
- [ ] 主密码设置功能
- [ ] 账户导入功能
- [ ] 数据加密/解密
- [ ] TOTP 生成功能
- [ ] 数据库读写
- [ ] 主题切换
- [ ] 应用设置保存

### 检查文件签名（可选）

```powershell
# 查看可执行文件信息
Get-AuthenticodeSignature .\GManager.exe

# 如果需要代码签名，使用证书工具
# signtool sign /f certificate.pfx /p password GManager.exe
```

---

## 高级构建选项 | Advanced Build Options

### 自定义构建配置

编辑 `apps/desktop/src-tauri/tauri.conf.json`:

```json
{
  "bundle": {
    "active": true,
    "targets": ["msi", "nsis"],  // 只构建特定格式
    "windows": {
      "certificateThumbprint": null,  // 代码签名证书指纹
      "digestAlgorithm": "sha256",
      "timestampUrl": ""
    }
  }
}
```

### 调试构建

```powershell
# 构建 debug 版本（包含调试符号）
pnpm tauri build --debug

# 输出到 target/debug/bundle/
```

### 清理构建缓存

```powershell
# 清理 Rust 构建缓存
cd apps/desktop/src-tauri
cargo clean

# 清理前端构建
cd ..
rm -r dist

# 清理所有 node_modules
cd ../../
pnpm clean  # 使用根目录定义的 clean 脚本
```

---

## 构建检查清单 | Build Checklist

在发布前确保完成以下检查：

### 环境检查
- [ ] Node.js >= 20.0.0
- [ ] pnpm >= 9.0.0
- [ ] Rust >= 1.70
- [ ] Visual Studio Build Tools 已安装
- [ ] WebView2 Runtime 已安装

### 代码检查
- [ ] 所有测试通过: `pnpm test`
- [ ] 代码检查通过: `pnpm lint`
- [ ] TypeScript 编译无错误
- [ ] 共享包已构建

### 构建检查
- [ ] 构建成功完成
- [ ] MSI 安装包生成
- [ ] NSIS 安装程序生成
- [ ] 可执行文件正常运行
- [ ] 应用版本号正确
- [ ] 图标显示正常

### 功能检查
- [ ] 应用正常启动
- [ ] 数据加密正常
- [ ] 数据库操作正常
- [ ] UI 渲染正常
- [ ] 所有核心功能可用

---

## 相关资源 | Resources

### 官方文档

- [Tauri 官方文档](https://tauri.app/v1/guides/)
- [Tauri Windows 构建指南](https://tauri.app/v1/guides/building/windows)
- [Rust 安装指南](https://www.rust-lang.org/tools/install)
- [Node.js 下载](https://nodejs.org/)
- [pnpm 文档](https://pnpm.io/)

### 项目文档

- [项目 README](/README.md)
- [开发指南](/docs/DEVELOPMENT.md)
- [架构文档](/docs/ARCHITECTURE.md)
- [API 文档](/docs/API.md)

### 问题反馈

如果遇到本指南未涵盖的问题：

- 提交 Issue: [GitHub Issues](https://github.com/yourusername/gmanager-glm/issues)
- 查看讨论: [GitHub Discussions](https://github.com/yourusername/gmanager-glm/discussions)

---

## 版本历史 | Version History

- **v0.1.0** (2025-01) - 初始版本
  - 基础构建流程
  - MSI 和 NSIS 安装包支持
  - 常见问题解决方案

---

**最后更新 | Last Updated**: 2025-01-28

**维护者 | Maintainer**: GManager Team

# Apply Desk 2.1 Implementation Report

## 实现范围

- IndexedDB 主存储、离线同步队列、版本号、tombstone 和冲突记录。
- Web Crypto AES-256-GCM 恢复密钥、加密云记录与加密备份。
- Supabase `encrypted_records` / `encrypted_files`、RLS 与 Realtime 迁移。
- PWA manifest、标准图标、更新缓存、iPhone 安全区与触控适配。
- Capacitor iOS 工程与固定 Bundle ID。
- GitHub Actions 生产环境变量门禁与重写后的 README。

## 数据与接口变化

核心岗位由 localStorage 迁移至 IndexedDB `jobs`；新增 `syncQueue`、`conflicts`、`settings` 等对象仓库。云同步使用加密 payload，不上传岗位正文的明文。

## 验证与已知限制

测试和构建结果记录在 `docs/06-testing/TEST-REPORT.md`。Supabase 项目创建、生产迁移、GitHub 可见性切换及 Apple 真机签名需要账户持有人完成。iOS Keychain 原生桥接和附件分块上传在外部账户配置后进行真机验收。

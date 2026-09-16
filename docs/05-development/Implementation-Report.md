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
# Apply Desk 2.3 增量实现

## Apply Desk 2.5 General 面试训练

- 面试页现在默认显示通用动态训练中心，不要求已有真实面试。
- 内置混合题库与分类题库，支持星标待练、收藏复练、答案记录和练习日期。
- 真实面试岗位仍保留在下方，后续可接入岗位专属面经。
- 验证：`npm test` 9 项通过，`npm run build` 成功。

## 本次范围

- 增补仓库执行边界与私密记忆规则：`AGENTS.md`、`MEMORY.md`。
- README 更新为 2.3，补充 Mac 原生端、每日队列、链接收件箱和隐私边界说明。
- 增加轻量列表/面板渐入、同步状态呼吸和交互反馈动效，并兼容减少动态效果设置。

## 验证

- `npm test`：9 tests passed。
- `npm run build`：成功；仅保留既有 chunk size warning。

## 未完成

- Mac 原生 target 仍需在 Xcode 中创建/签名；当前仓库已有 iPhone Capacitor 工程。
- 每日自动抓取、系统通知和多来源链接解析需要后续服务端/原生能力接入。

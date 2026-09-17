# Apply Desk 3.2 Implementation Report

## 3.2 补充实现

- 新增四平台私有岗位收件表和独立可撤销采集令牌；Safari 扩展不会保存凭据或执行投递。
- 同步改为“先拉取、再推送、再校验”；缺恢复密钥时保留数据并给出可诊断状态。
- 增加加密基准简历上传/解密下载的数据层和材料库入口。
- 已部署 Supabase migration `009_portal_inbox.sql` 和 `job-source-ingest` 函数。
- 验证：11 个单元测试通过，生产构建通过。

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

## macOS 独立 App

- 新增原生 `WKWebView` macOS 外壳，避免 Capacitor/Cordova 的 Mac Catalyst 二进制不兼容。
- `npm run mac:build` 将相对路径构建产物打包为 `Apply Desk.app` 并使用本机 ad-hoc 签名。
- 已验证 arm64 可执行文件和签名；独立 App 已安装至 `/Applications/Apply Desk.app`。

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
# Apply Desk 3.1 · 岗位采集与 Safari 连接实现记录

## 本次范围

- 新增 Supabase 私有公开岗位缓存、采集批次记录、JobsDB Safari 收件箱和可撤销采集设备令牌。
- 新增 `job-discovery`（公开 Greenhouse/Lever）与 `job-source-ingest`（Safari JobsDB）Edge Functions。
- App 在启动、回到前台和手动刷新时导入公开候选及 JobsDB 收件箱；不会覆盖已有岗位。
- 首页增加采集状态；设置页增加 Safari 配对与 JobsDB 打开入口。
- 新增 iPhone/Mac 每日 08:05 本地提醒，及可构建的 Safari Web Extension Xcode 工程。

## 安全边界

- 采集设备令牌可过期和撤销；令牌只留在 Safari 扩展的沙盒存储。JobsDB 密码、Cookie、验证码及投递动作不进入扩展、Supabase 或 Git。
- 公开岗位信息存私有 Supabase 表；用户材料和投递历史继续走客户端 AES 加密记录。
- 采集器不会提交申请、发邮件、填写真实性声明或绕过站点验证。

## 验证

- `npm test`、`npm run build`、`npm run ios:sync` 与 `npm run mac:build` 已执行。
- Safari Xcode target 以无签名 Debug 配置构建；正式安装仍需在 Xcode 选择个人 Team。
- Supabase 迁移、Vault 机密、函数部署和 cron 激活需要连接实际 Supabase 项目后执行；cron 使用独立的 `job_discovery_cron_token`，不复用服务角色密钥。

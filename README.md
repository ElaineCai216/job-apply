# Apply Desk 2.3 · 私人求职指挥中心

本地优先的个人求职工作台：岗位、逐岗简历、Personal Statement、内推、邮件、跟进与面试准备。离线可完整使用，联网后可将客户端加密数据同步到只允许本人登录的 Supabase。

## 在线网站

正式入口：[https://elainecai216.github.io/job-apply/](https://elainecai216.github.io/job-apply/)

无 Supabase 配置时网站以本地模式运行；配置 Secrets 后启用私有云同步。仓库只保存代码和空白模板，禁止提交简历、联系方式、投递记录、内推码或密钥。

## 电脑本地运行

需要 Node.js 22。`file://` 直接双击 `index.html` 不受支持。

```bash
npm install
cp .env.example .env.local
npm start
```

浏览器打开终端显示的 `http://localhost:5173/job-apply/`。局域网地址仅在电脑开机、服务运行且手机与电脑处于同一网络时有效。

## iPhone 使用

### PWA 主屏幕版

1. 使用 Safari 打开正式 HTTPS 网站。
2. 点击分享 → 添加到主屏幕。
3. 从主屏幕打开 Apply Desk；离线数据保存在该设备的 IndexedDB。

### Xcode 自签原生版

```bash
npm run ios:sync
npm run ios:open
```

在 Xcode 的 Signing & Capabilities 选择个人 Team，连接 iPhone 后运行。Bundle ID 为 `com.elaine.applydesk`。免费 Apple ID 签名通常需要定期续签。

### Mac 原生版

Mac 端与 iPhone 共用同一套加密数据和业务逻辑，使用系统钥匙串解锁。构建 Mac App 需要在 Xcode 中选择 macOS target，并使用同一 Apple ID 签名；免费签名可能需要定期重新安装。

## 私有同步配置

1. 新建 Supabase 项目。
2. 依次执行 `supabase/migrations/001_apply_desk.sql` 和 `002_encrypted_local_first.sql`。
3. 在 SQL Editor 插入唯一允许的 163 登录邮箱；真实邮箱不要写进仓库。
4. Authentication 启用 Email OTP，将正式网站、localhost 和 `com.elaine.applydesk://login-callback` 加入 Redirect URLs。
5. 将 `.env.example` 三项写入本地 `.env.local` 和 GitHub Actions Secrets。
6. 首次登录在“设置”创建恢复密钥并离线保存；新设备必须导入同一密钥。

云端仅存用户 ID、记录 ID、版本、时间戳和 AES-256-GCM 密文。恢复密钥只保存在设备本地，遗失后服务器无法恢复内容。

## 数据与迁移

- IndexedDB 是主数据源；断网、登录过期或 Supabase 暂时不可用时仍能工作。
- 每次编辑进入同步队列；同版本并发修改写入冲突区，不静默覆盖。
- 删除使用 tombstone，避免旧设备将记录重新上传。
- 设置页可预览并导入旧 `localStorage` 数据，成功前不会删除旧数据。
- 设置页可导出客户端加密 JSON 备份。
- 当前中英文基准简历由本人从设备选择后写入私有材料库，PDF 本体不进入公开仓库。

## 安全边界

- 自动化停在最终提交或邮件发送前。
- 生成材料只能重组真实资料，未核实内容必须标记待确认。
- 浏览器扩展只抓取 JD、读取已审核材料及保存草稿，不提供最终提交接口。
- `.env*`、`private/`、简历文件和构建产物均由忽略规则隔离。
- 执行边界见 [`AGENTS.md`](AGENTS.md)，私密记忆规则见 [`MEMORY.md`](MEMORY.md)；后者不保存密码、恢复密钥或完整内推码。

## 交互说明

- 首页提供大陆、香港、邮箱三类每日队列、待审核和截止提醒；每天最多各 10 份，合格岗位不足时不凑数。
- 岗位链接、共享文档、小红书和微信公众号链接可从 App 内进入来源收件箱。
- 列表、指标和同步状态使用轻量动效；开启系统“减少动态效果”后自动降级。

## 验证

```bash
npm test
npm run build
npm run ios:sync
```

发布流程见 `docs/09-release/`；实现状态见 `docs/05-development/Implementation-Report.md`。

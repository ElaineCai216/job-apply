# Apply Desk 3.0 · 私人求职工作台

本地优先的个人求职工作台：岗位、逐岗简历、Personal Statement、内推、邮件、跟进、面试训练与复盘。离线可完整使用；连接 Supabase 后，手机、Mac 与网页使用同一份客户端加密数据。

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

Mac 端使用独立的原生 macOS WebView 外壳，不依赖不兼容的 Mac Catalyst 插件。它复用同一套 React 资源，可在关闭 Xcode 后从“应用程序”直接打开。

```bash
npm run mac:build
```

构建产物为 `macos/build/Apply Desk.app`；拖入“应用程序”即可安装。本机构建使用 ad-hoc 签名，首次打开如被 macOS 拦截，在 Finder 中右键 App 并选择“打开”。

## 私有同步配置

1. 新建 Supabase 项目。
2. 依次执行 `supabase/migrations/001_apply_desk.sql`、`002_encrypted_local_first.sql` 和 `003_apply_desk_3_records.sql`。
3. 在 SQL Editor 插入唯一允许的 163 登录邮箱；真实邮箱不要写进仓库。
4. Authentication 启用 Email OTP，将正式网站、localhost 和 `com.elaine.applydesk://login-callback` 加入 Redirect URLs。
5. 将 `.env.example` 三项写入本地 `.env.local` 和 GitHub Actions Secrets。
6. 首次登录在“设置”创建恢复密钥并离线保存；新设备必须导入同一密钥。

### AI 面试助手（DeepSeek）

AI 面试追问通过 Supabase Edge Function 调用，密钥不进入浏览器、iPhone、Mac App、日志或 Git：

```bash
supabase secrets set DEEPSEEK_API_KEY='在本机终端粘贴，不要写进仓库'
supabase functions deploy interview-coach
```

函数源码位于 `supabase/functions/interview-coach/index.ts`。它会先验证登录用户和白名单，再调用 DeepSeek；发送给模型的内容仅限你在当前练习中主动选择的题目、回答和必要岗位背景。请不要在回答中粘贴密码、验证码、身份证件或恢复密钥。

云端仅存用户 ID、记录 ID、版本、时间戳和 AES-256-GCM 密文。恢复密钥只保存在设备本地，遗失后服务器无法恢复内容。

## 数据与迁移

- IndexedDB 是主数据源；断网、登录过期或 Supabase 暂时不可用时仍能工作。
- 岗位、材料、表单答案、题库、面经来源、练习记录、复盘与来源收件箱每次编辑都会进入同步队列；同版本并发修改写入冲突区，不静默覆盖。
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

- 首页提供实习、香港秋招、大陆三类每日队列，各最多 10 份；同一岗位只会被计入一栏，合格岗位不足时不凑数。
- 岗位链接、共享文档、小红书和微信公众号链接可从 App 内进入来源收件箱。
- 面试页默认从今日 5 题开始，支持星标、收藏、语音转写、AI 连续追问和“题目 → 回答 → 追问 → 证据缺口 → 下次改法 → 复习日期”的复盘。
- 列表、卡片、保存和切换使用轻量动效；开启系统“减少动态效果”后自动降级。

## 招聘网站与最终投递边界

- JobsDB 只使用你在浏览器中亲自完成登录后的会话；不要在聊天、App 或仓库保存密码。
- App 可以收集公开 JD、整理材料与填写到最终确认前；最终提交、邮件发送、真实性声明、敏感问卷及验证码均由你逐份完成。

## 验证

```bash
npm test
npm run build
npm run ios:sync
```

发布流程见 `docs/09-release/`；实现状态见 `docs/05-development/Implementation-Report.md`。

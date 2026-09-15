# Apply Desk 2.0 实现报告

## 已实现

- React + Vite 高密度个人求职指挥中心。
- 指挥中心、全部岗位、材料库、面试、设置五个工作区。
- 单一岗位记录贯穿发现、材料、审核、填表、确认、投递、跟进和面试。
- 定制简历、Personal Statement、内推与邮件材料门禁。
- 旧版 localStorage 数据预览、URL 去重与保留原数据迁移。
- Supabase 邮箱登录、RLS、私有 Storage、Realtime 数据接口。
- DOCX 与 PDF 独立生成。
- 扩展岗位抓取消息接口；没有最终提交接口。
- 香港优先求职规则中的保险销售、招聘人事、毕业前全职过滤测试。

## 配置与发布

1. 在 Supabase SQL Editor 执行 `supabase/migrations/001_apply_desk.sql`。
2. 在 SQL Editor 以管理员身份执行 `insert into public.allowed_users(email) values ('你的登录邮箱');`；不要把真实邮箱写进仓库。
3. 将 `.env.example` 三项配置为 GitHub Actions / 本地环境变量。
4. Supabase Authentication 中启用 Email OTP，并把 Pages URL 加入 Redirect URLs。
4. 运行 `npm install && npm test && npm run build`。

## 安全

- 公开仓库没有个人资料、简历、内推码或真实密钥。
- 所有云端记录由 `auth.uid() = user_id` 的 RLS 控制。
- 文件桶为私有桶，路径第一段必须是当前用户 UUID。
- 最终提交和邮件发送不在扩展及网页接口范围内。

## 待外部配置

- 创建或连接 Supabase 项目并提供公开 URL、anon key 与允许登录邮箱。
- 在 Supabase 控制台执行数据库迁移。
- GitHub Pages 构建需要配置环境变量后才能启用真实云模式；未配置时可使用本机预览。

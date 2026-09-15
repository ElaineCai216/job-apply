# Apply Desk 2.1 Test Report

- 单元测试：2026-09-16，2 个测试文件、9 项测试全部通过。
- Web 构建：Vite 7.3.6 生产构建成功；文档生成模块存在大于 500kB 的非阻断体积警告。
- iOS 同步：Capacitor iOS 工程同步成功，识别 Secure Storage、Preferences 和 Share 三个插件。
- 安全扫描：检查仓库无 PDF、真实 `.env`、恢复密钥和本机绝对路径。
- 依赖审计：Capacitor CLI 的 `xcode → uuid` 间接开发依赖有 3 项 moderate 公告；生产网页不打包 CLI，暂不使用破坏性强制升级。
- 外部待验收：GitHub Pages HTTP 200、Supabase RLS/Realtime、iPhone 真机安装和跨设备冲突。

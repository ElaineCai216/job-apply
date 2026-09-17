# BUG-005 · Mac App 无法创建 Safari JobsDB 配对

- 级别：P1。
- 现象：已登录 Apply Desk 的 Mac 原生 App 在“连接 Safari JobsDB”点击配对后显示泛化失败提示，且没有创建采集设备记录。
- 根因：原生 WebView 在调用 Edge Function 时可能只发送匿名 key；函数需要当前用户的访问令牌来验证白名单，导致配对被拒绝。
- 修复：点击配对时先读取 Supabase 当前会话，并将 access token 显式作为 `Authorization` 请求头发送；无会话时要求重新登录，并显示可操作的错误说明。
- 验证：前端构建、Mac App 重建；重新登录后应能创建一条 `collector_devices` 记录并显示一次性配对码。
- 回滚：恢复 Functions invoke 的隐式认证调用即可，但原生 App 可能再次出现匿名令牌问题。

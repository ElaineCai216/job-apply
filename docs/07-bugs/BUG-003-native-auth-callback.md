# BUG-003 · 原生 App 验证后回到浏览器

- 现象：iPhone 和 Mac 的魔法链接按网页 URL 回调，验证后浏览器登录，原生 App 会话没有更新。
- 根因：登录请求固定使用 `location.origin + location.pathname`；未注册原生 URL scheme，也未将回调令牌交给原生 Supabase 会话。
- 修复：iPhone 使用 `com.elaine.applydesk://login-callback`，Mac 使用 `applydesk://login-callback`；iOS 监听 `appUrlOpen` 并设置/交换会话，Mac 将系统 deep link 转发到 WebView。
- 验证：单元测试覆盖 implicit 与 PKCE 回调；iOS 和 Mac 重新构建后需各验证一次真实魔法链接。

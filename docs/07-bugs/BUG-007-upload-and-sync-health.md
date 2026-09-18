# BUG-007：Mac 上传文件无响应与同步冲突重复累积

- 级别：P1
- 根因：Mac WKWebView 未实现系统文件面板；Service Worker 错误拦截跨域 Supabase 请求；同步用客户端时间与云端时间不等直接判冲突，且使用时间戳生成重复 ID。
- 修复：Mac App 使用 `NSOpenPanel` 打开 PDF/DOCX；Service Worker 仅缓存同源请求；冲突 ID 按记录版本与云端更新时间固定去重，健康面板显示唯一冲突数。
- 数据保护：不删除已有本地记录、云端记录或历史冲突副本。
- 验证：11 个单元测试通过；Vite 构建和 Mac App 打包通过；替换后的 App 代码签名验证通过。

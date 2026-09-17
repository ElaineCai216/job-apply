# BUG-004 · Safari 扩展与宿主 App 签名不一致

- 级别：P1。
- 现象：构建或运行 `Apply Desk Safari` 时，Xcode 提示嵌入的扩展二进制没有和宿主 App 使用同一证书签名。
- 根因：自动生成的 Safari Web Extension 项目只为宿主 target 写入了 `DEVELOPMENT_TEAM`，扩展 target 的 Debug/Release 配置没有 Team；Xcode 因而可能选择另一张证书或未签名扩展。
- 修复：为 `Apply Desk Safari Extension` 的 Debug 与 Release 配置写入与宿主一致的 Team，并继续使用 Automatic signing；bundle identifier 保持在宿主 `com.elaine.applydesk.safari` 的子命名空间。
- 验证：无签名构建验证两个 target 的依赖关系；在用户的 Xcode 中选择同一 Team 后，以实际签名构建再次验证。
- 回滚：移除扩展 target 的两项 `DEVELOPMENT_TEAM` 设置即可恢复生成器初始状态。

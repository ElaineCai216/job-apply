# 投递台 · Apply Desk

个人求职申请管理后台。把「简历档案 → 投递台账 → 预览确认 → 最终提交 → 跟进提醒」整个求职流程收在一个本地网页里。

纯静态网站（HTML + CSS + 原生 JS，零依赖），数据存在浏览器 `localStorage`，可导出/导入 JSON 备份。

## 在线访问

本站已部署到 GitHub Pages：**[https://elainecai216.github.io/job-apply/](https://elainecai216.github.io/job-apply/)**

## 功能

- **总览**：统计卡片 + 看板（待投递 / 待确认 / 已投递 / 跟进中 / 已结束，支持拖拽改阶段）+ 需要跟进的提醒
- **投递台账**：搜索、筛选、新增/编辑/删除投递记录；每条记录有「填写 → 预览 → 确认 → 提交」的确认门流程记录
- **简历档案**：结构化编辑个人信息、经历、教育、技能、语言、内推码、简历版本
- **设置**：深色模式、提醒阈值、导入/导出 JSON、示例数据

## 本地运行

无需安装任何依赖，任意静态服务器即可：

```bash
cd job-apply-web
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000
```

也可以直接双击 `index.html` 使用（所有功能都基于浏览器本地存储）。

## 部署到 GitHub Pages

1. 把代码推到 GitHub 仓库（公开仓库即可免费托管）
2. 仓库 Settings → Pages → Source 选择 `Deploy from a branch` → 分支 `main` / 根目录
3. 数分钟后即可通过 `https://<用户名>.github.io/<仓库名>/` 访问

## 数据说明

所有数据只保存在你的浏览器里，不上传任何服务器。请定期用「设置 → 导出 JSON」备份。

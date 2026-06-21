# Remix 课程路径对照表

维护「`remix/` 路径 → 学习单元 → 课程 slug」映射，避免 seed 重复或遗漏。

> 源码只读参考：`remix/`（与 learn 应用隔离，不参与 build）

## 单元与课程顺序

| order | slug | 单元 | 主要 remix 路径 |
|------:|------|------|-----------------|
| 0 | `site-01-repo-map` | 单元 1 · 项目地图 | `app/`、`app/entry.server.tsx`、`app/utils/cloudflare-env.server.ts` |
| 1 | `site-02-root-shell` | 单元 1 · 项目地图 | `app/root.tsx` |
| 2 | `site-03-entry-server` | 单元 2 · App Shell | `app/entry.server.tsx` |
| 3 | `site-04-theme-system` | 单元 2 · App Shell | `app/utils/theme.server.ts`、`app/root.tsx` |
| 4 | `site-05-shell-errors` | 单元 2 · App Shell | `app/components/transitions/`、`app/components/error/` |
| 5 | `site-06-file-routing` | 单元 3 · 路由基础 | `app/routes/`、`app/routes/_index.tsx`、`app/routes/api.nemesis.ts` |
| 6 | `site-07-nested-layouts` | 单元 3 · 路由基础 | `app/routes/game.tsx`、`app/routes/game.$platform.tsx` |
| 7 | `site-08-home-landing` | 单元 4 · 内容页面 | `app/routes/_index.tsx`、`app/components/home/` |
| 8 | `site-09-gallery-updates` | 单元 4 · 内容页面 | `app/routes/gallery.tsx`、`updates.tsx`、`cv.tsx`、`anime.tsx` |
| 9 | `site-10-chat-page` | 单元 4 · 内容页面 | `app/routes/chat.tsx`、`app/components/nemesis/chat/` |
| 10 | `site-11-ui-header` | 单元 5 · 组件与交互 | `app/components/ui/Header.tsx` |
| 11 | `site-12-client-boundary` | 单元 5 · 组件与交互 | `app/components/common/ClientOnly.tsx`、`.client.tsx` |
| 12 | `site-13-frontend-state` | 单元 5 · 组件与交互 | `app/hooks/useNemesisChat.client.ts` |
| 13 | `site-14-loader-read` | 单元 6 · 数据加载 | `app/root.tsx`、`app/lib/db.server.ts` |
| 14 | `site-15-action-write` | 单元 6 · 数据加载 | `app/root.tsx`、`app/routes/api.nemesis.ts` |
| 15 | `site-16-auth-session` | 单元 7 · 认证与守门 | `app/lib/auth.server.ts`、`app/routes/api.auth.$.ts` |
| 16 | `site-17-guards-rate-limit` | 单元 7 · 认证与守门 | `app/services/nemesis-guard.server.ts` |
| 17 | `site-18-nemesis-api-chain` | 单元 8 · Nemesis 与数据 | `app/routes/api.nemesis.ts`、`app/services/nemesis.server.ts` |
| 18 | `site-19-nemesis-sse-gateway` | 单元 8 · Nemesis 与数据 | `app/lib/nemesis-sse.server.ts`、`nemesis-ai-gateway.server.ts`、`app/nemesis/` |
| 19 | `site-20-d1-errors-capstone` | 单元 8 · Nemesis 与数据 | `app/lib/db.server.ts`、`migrations/`、`app/routes/messages.tsx` |

每门课 **6 关** × 3 题 ≈ **120 关 / 360 题**（项目课）。

## Remix 能力模块（`remixModules.ts`）

| module id | 标签 | 典型路径 |
|-----------|------|----------|
| `repo-map` | 仓库与运行环境 | `app/`、`utils/cloudflare-env.server.ts` |
| `shell-root` | Root 与 App Shell | `app/root.tsx` |
| `shell-entry` | Entry Server | `app/entry.server.tsx` |
| `shell-theme` | 全局主题 | `theme.server.ts`、`root.tsx` |
| `shell-errors` | 过渡与错误边界 | `components/transitions/`、`error/` |
| `routes-core` | 文件路由基础 | `app/routes/` |
| `routes-nested` | 嵌套路由 | `game.tsx`、`game.$platform.tsx` |
| `routes-home` | 首页落地页 | `_index.tsx`、`components/home/` |
| `routes-content` | 内容展示页 | `gallery`、`updates` 等 |
| `routes-chat` | 聊天页面 | `chat.tsx`、Nemesis 客户端 |
| `ui-header` | 全站导航 UI | `Header.tsx` |
| `ui-client` | 客户端边界 | `ClientOnly`、`.client.tsx` |
| `ui-state` | 前端状态与事件 | `useNemesisChat.client.ts` |
| `bridge-loader` | Loader 读链 | `root.tsx` loader |
| `bridge-action` | Action 写链 | `api.nemesis` POST |
| `auth-session` | 认证与 Session | `auth.server.ts` |
| `auth-guards` | 守卫与限流 | `nemesis-guard.server.ts` |
| `nemesis-api` | Nemesis API 链 | `api.nemesis.ts` |
| `nemesis-sse` | SSE 流式响应 | `nemesis-sse.server.ts` |
| `nemesis-gateway` | AI Gateway | `nemesis-ai-gateway.server.ts` |
| `data-d1` | D1 持久化 | `db.server.ts`、`migrations/` |
| `data-errors` | 错误与反馈 | hook 错误映射 |

关卡 `remix_modules_json` 由 seed 写入；`/learn/ability-map` 按用户 `lesson_progress` 聚合模块完成率。

## Seed 文件布局

```
app/lib/server/learn/seed-data/
  units/
    courseCatalog.ts    # 20 门课 × 6 关规格
    factory.ts          # 题型轮转与题目生成
    unit-01 … unit-08   # 按单元导出（指向 catalog）
    index.ts
  index.ts              # PROJECT_COURSES
  exams.ts              # 4 场大考 + 8 单元小测
```

## 新增 remix 功能时

1. 在本表找到对应单元/模块
2. 在 `courseCatalog.ts` 增加 1 关或 1 门课
3. 更新 `remixModules.ts`（若为新目录）
4. 运行 `npm run test` 与 `npm run db:seed:local -- --force`

## 考试

| slug | 覆盖单元 |
|------|----------|
| `exam-units-1-2` | 单元 1–2 |
| `exam-units-3-4` | 单元 3–4 |
| `exam-units-5-6` | 单元 5–6 |
| `exam-units-7-8` | 单元 7–8 |
| `exam-unit-1` … `exam-unit-8` | 各单元小测 |

export const REMIX_MODULE_IDS = [
  "repo-map",
  "shell-root",
  "shell-entry",
  "shell-theme",
  "shell-errors",
  "routes-core",
  "routes-nested",
  "routes-home",
  "routes-content",
  "routes-chat",
  "ui-header",
  "ui-client",
  "ui-state",
  "bridge-loader",
  "bridge-action",
  "auth-session",
  "auth-guards",
  "nemesis-api",
  "nemesis-sse",
  "nemesis-gateway",
  "data-d1",
  "data-errors",
] as const;

export type RemixModuleId = (typeof REMIX_MODULE_IDS)[number];

export type RemixModuleNode = {
  id: RemixModuleId;
  label: string;
  description: string;
  paths: string[];
  unitIndex: number;
};

export const REMIX_MODULE_TREE: RemixModuleNode[] = [
  {
    id: "repo-map",
    label: "仓库与运行环境",
    description: "认识 remix/ 目录结构与 Cloudflare 运行方式",
    paths: ["app/", "utils/cloudflare-env.server.ts"],
    unitIndex: 0,
  },
  {
    id: "shell-root",
    label: "Root 与 App Shell",
    description: "root.tsx、Outlet、全局壳层",
    paths: ["app/root.tsx"],
    unitIndex: 0,
  },
  {
    id: "shell-entry",
    label: "Entry Server",
    description: "SSR 入口与 HTML 文档壳",
    paths: ["app/entry.server.tsx"],
    unitIndex: 1,
  },
  {
    id: "shell-theme",
    label: "全局主题",
    description: "theme cookie 与黑夜模式",
    paths: ["app/utils/theme.server.ts", "app/root.tsx"],
    unitIndex: 1,
  },
  {
    id: "shell-errors",
    label: "过渡与错误边界",
    description: "RouteTransition、404、ErrorBoundary",
    paths: ["app/components/transitions/", "app/components/error/"],
    unitIndex: 1,
  },
  {
    id: "routes-core",
    label: "文件路由基础",
    description: "routes 目录与 URL 映射",
    paths: ["app/routes/"],
    unitIndex: 2,
  },
  {
    id: "routes-nested",
    label: "嵌套路由",
    description: "game 布局与子路由",
    paths: ["app/routes/game.tsx", "app/routes/game.$platform.tsx"],
    unitIndex: 2,
  },
  {
    id: "routes-home",
    label: "首页落地页",
    description: "首页与 home 组件区",
    paths: ["app/routes/_index.tsx", "app/components/home/"],
    unitIndex: 3,
  },
  {
    id: "routes-content",
    label: "内容展示页",
    description: "gallery、updates、cv、anime",
    paths: ["app/routes/gallery.tsx", "app/routes/updates.tsx"],
    unitIndex: 3,
  },
  {
    id: "routes-chat",
    label: "聊天页面",
    description: "chat 路由与 Nemesis 客户端挂载",
    paths: ["app/routes/chat.tsx", "app/components/nemesis/chat/"],
    unitIndex: 3,
  },
  {
    id: "ui-header",
    label: "全站导航 UI",
    description: "Header 与站点导航",
    paths: ["app/components/ui/Header.tsx"],
    unitIndex: 4,
  },
  {
    id: "ui-client",
    label: "客户端边界",
    description: "ClientOnly、lazy、.client.tsx",
    paths: ["app/components/common/ClientOnly.tsx"],
    unitIndex: 4,
  },
  {
    id: "ui-state",
    label: "前端状态与事件",
    description: "useNemesisChat、表单与提交链",
    paths: ["app/hooks/useNemesisChat.client.ts"],
    unitIndex: 4,
  },
  {
    id: "bridge-loader",
    label: "Loader 读链",
    description: "服务端数据加载与 cookie 读取",
    paths: ["app/root.tsx"],
    unitIndex: 5,
  },
  {
    id: "bridge-action",
    label: "Action 写链",
    description: "POST、Set-Cookie、API action",
    paths: ["app/routes/api.nemesis.ts"],
    unitIndex: 5,
  },
  {
    id: "auth-session",
    label: "认证与 Session",
    description: "Better Auth、session cookie",
    paths: ["app/lib/auth.server.ts", "app/routes/api.auth.$.ts"],
    unitIndex: 6,
  },
  {
    id: "auth-guards",
    label: "守卫与限流",
    description: "guard、rate-limit、权限",
    paths: ["app/services/nemesis-guard.server.ts"],
    unitIndex: 6,
  },
  {
    id: "nemesis-api",
    label: "Nemesis API 链",
    description: "api.nemesis 守门顺序",
    paths: ["app/routes/api.nemesis.ts"],
    unitIndex: 7,
  },
  {
    id: "nemesis-sse",
    label: "SSE 流式响应",
    description: "nemesis-sse 与客户端解析",
    paths: ["app/lib/nemesis-sse.server.ts"],
    unitIndex: 7,
  },
  {
    id: "nemesis-gateway",
    label: "AI Gateway",
    description: "模型代理与密钥隔离",
    paths: ["app/lib/nemesis-ai-gateway.server.ts"],
    unitIndex: 7,
  },
  {
    id: "data-d1",
    label: "D1 持久化",
    description: "db.server、migrations",
    paths: ["app/lib/db.server.ts", "migrations/"],
    unitIndex: 7,
  },
  {
    id: "data-errors",
    label: "错误与反馈",
    description: "错误码映射与前端 error 状态",
    paths: ["app/hooks/useNemesisChat.client.ts"],
    unitIndex: 7,
  },
];

const moduleMap = new Map(REMIX_MODULE_TREE.map((m) => [m.id, m]));

export function getRemixModule(id: RemixModuleId): RemixModuleNode {
  return moduleMap.get(id)!;
}

export function isRemixModuleId(value: string): value is RemixModuleId {
  return (REMIX_MODULE_IDS as readonly string[]).includes(value);
}

export const UNIT_LABELS = [
  "单元 1 · 项目地图",
  "单元 2 · App Shell",
  "单元 3 · 路由基础",
  "单元 4 · 内容页面",
  "单元 5 · 组件与交互",
  "单元 6 · 数据加载",
  "单元 7 · 认证与守门",
  "单元 8 · Nemesis 与数据",
] as const;

import type { MetaFunction } from "react-router";
import { CodeExplainView } from "~/components/learn/code/CodeExplainView";
import type { CodeAnnotation } from "~/lib/learn/codeExplainTypes";

export const meta: MetaFunction = () => [
  { title: "代码批注视图 · Demo" },
];

const SAMPLE_CODE = `import { useQuery } from '@tanstack/react-query'
import { getDeviceId } from './progress'

export type AuthUser = {
  id: string
  email: string
}

export type AuthMe = {
  user: AuthUser | null
}

async function authJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!response.ok) throw new Error(await response.text())
  return (await response.json()) as T
}

export function useAuthMe() {
  return useQuery({
    queryKey: ['auth-me'],
    queryFn: () => authJson<AuthMe>('/api/auth/me'),
    retry: false,
    staleTime: 60_000,
  })
}

export async function loginOwner(email: string, password: string) {
  return authJson<AuthMe>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, deviceHint: getDeviceId() }),
  })
}

export async function registerOwner(email: string, password: string) {
  return authJson<AuthMe>('/api/auth/register-owner', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export async function logoutOwner() {
  return authJson<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: '{}' })
}

export async function claimCurrentDevice() {
  return authJson<{ ok: boolean; merged: Record<string, number> }>('/api/auth/claim-device', {
    method: 'POST',
    body: JSON.stringify({ deviceId: getDeviceId() }),
  })
}

export async function changeOwnerPassword(oldPassword: string, newPassword: string) {
  return authJson<{ ok: boolean }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword }),
  })
}
`;

const SAMPLE_ANNOTATIONS: CodeAnnotation[] = [
  {
    id: "types-auth-me",
    filePath: "src/lib/auth.ts",
    startLine: 4,
    endLine: 11,
    title: "登录状态模型",
    level: "basic",
    summary: "这里定义了前端看到的用户结构。",
    details:
      "AuthMe.user 为 null 时代表未登录;有 user 时代表当前已有登录态。页面通常只需要判断 user 是否存在。",
    risk: "不要随便给 AuthUser 加 role、token 等字段, 除非后端 /api/auth/me 真的返回。",
  },
  {
    id: "auth-json",
    filePath: "src/lib/auth.ts",
    startLine: 13,
    endLine: 23,
    title: "统一请求封装",
    level: "important",
    summary: "所有 auth API 都通过 authJson 请求。",
    details:
      "这段代码统一设置 Content-Type、处理错误、解析 JSON, 让 login/register/logout 等函数保持很薄。",
    risk:
      "init.headers 如果是 Headers 对象, 直接展开可能不完整; 如果 auth cookie 跨域, 还可能需要 credentials: 'include'。",
    suggestion:
      "可以补一个 normalizeHeaders, 并根据部署方式决定是否加 credentials。",
  },
  {
    id: "use-auth-me",
    filePath: "src/lib/auth.ts",
    startLine: 25,
    endLine: 33,
    title: "当前登录态查询",
    level: "important",
    summary: "useAuthMe 用 React Query 缓存 /api/auth/me。",
    details: "页面通过它获取当前用户。staleTime 60 秒可以减少重复请求。",
    risk:
      "登录、注册、登出后如果不刷新 auth-me 缓存, 页面可能短时间显示旧状态。",
    suggestion:
      "在 login/logout mutation 成功后调用 queryClient.invalidateQueries({ queryKey: ['auth-me'] })。",
  },
  {
    id: "login-device-hint",
    filePath: "src/lib/auth.ts",
    startLine: 36,
    endLine: 41,
    title: "登录时携带设备提示",
    level: "important",
    summary: "loginOwner 会把 deviceHint 一起提交给后端。",
    details: "这通常用于把匿名设备进度和登录账号关联起来。",
    risk: "不要把 deviceHint 随便改成 deviceId, 除非后端接口也同步修改。",
  },
  {
    id: "logout-cache-risk",
    filePath: "src/lib/auth.ts",
    startLine: 53,
    endLine: 55,
    title: "登出后的缓存风险",
    level: "risk",
    summary: "logoutOwner 只负责请求后端登出, 不会自动刷新前端登录态。",
    details: "如果调用方不处理 React Query 缓存, UI 可能仍然显示用户已登录。",
    suggestion:
      "建议封装 useLogoutOwnerMutation, 在 onSuccess 里 invalidate auth-me。",
  },
  {
    id: "claim-device",
    filePath: "src/lib/auth.ts",
    startLine: 57,
    endLine: 62,
    title: "绑定当前设备进度",
    level: "suggestion",
    summary: "claimCurrentDevice 会把当前 deviceId 发送给后端。",
    details:
      "merged 返回每类数据合并数量, 适合登录后弹 Toast, 例如:已合并 12 条词汇进度、5 条句子进度。",
  },
];

export default function CodeExplainDemoRoute() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-[var(--fg-primary)]">
          代码批注视图 · Demo
        </h1>
        <p className="text-sm text-[var(--fg-muted)]">
          左侧是带行号和语法高亮的源码,
          右侧是结构化批注卡片(标题/范围/简介/详情/风险/建议)。
          点击右侧卡片, 左侧对应行高亮; 点击左侧被批注覆盖的行,
          右侧卡片自动激活并滚到可视区。
        </p>
      </header>
      <CodeExplainView
        filePath="src/lib/auth.ts"
        language="tsx"
        code={SAMPLE_CODE}
        annotations={SAMPLE_ANNOTATIONS}
      />
      <aside className="rounded-md border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3 text-xs leading-relaxed text-[var(--fg-muted)]">
        <p className="mb-1 font-medium text-[var(--fg-primary)]">说明</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            桌面端是左右双栏, &lt; md 断点会自动切成上下堆叠
            (代码在上, 批注列表在下)。
          </li>
          <li>
            每张卡片尽量与 startLine 对齐;
            相邻卡片重叠时按贪心策略往下挪, 卡片右上角的 ↓
            标记表示这张卡片实际位置比期望行号低。
          </li>
          <li>
            level 的 4 种配色: basic = 灰、important = 紫、risk = 红、suggestion = 绿。
            选中卡片时, 左侧对应行换成更强的同色底。
          </li>
        </ul>
      </aside>
    </div>
  );
}

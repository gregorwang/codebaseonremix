export const ABILITY_TAGS = [
  "frontend.state.scope",
  "frontend.state.global",
  "frontend.state.local",
  "frontend.event.click",
  "frontend.event.submit",
  "frontend.effect.useEffect",
  "backend.session.cookie",
  "backend.auth.required",
  "backend.validation.field",
  "backend.rateLimit",
  "bridge.reactRouter.loader",
  "bridge.reactRouter.action",
  "code.position.handler",
  "ai.review.architecture",
  "project.modify.fullstack",
] as const;

export type AbilityTag = (typeof ABILITY_TAGS)[number];

export const ABILITY_TAG_LABELS: Record<AbilityTag, string> = {
  "frontend.state.scope": "状态作用域判断",
  "frontend.state.global": "全局状态",
  "frontend.state.local": "局部状态",
  "frontend.event.click": "点击事件链",
  "frontend.event.submit": "提交事件链",
  "frontend.effect.useEffect": "useEffect 副作用",
  "backend.session.cookie": "Cookie / Session",
  "backend.auth.required": "登录守门",
  "backend.validation.field": "字段校验",
  "backend.rateLimit": "限流",
  "bridge.reactRouter.loader": "Loader 数据加载",
  "bridge.reactRouter.action": "Action 写操作",
  "code.position.handler": "事件处理函数位置",
  "ai.review.architecture": "AI 架构评审",
  "project.modify.fullstack": "全栈改造",
};

export function isAbilityTag(value: string): value is AbilityTag {
  return (ABILITY_TAGS as readonly string[]).includes(value);
}

export const MISTAKE_TYPES = [
  "state_scope_error",
  "event_chain_error",
  "state_transition_error",
  "effect_error",
  "backend_guard_order_error",
  "session_error",
  "validation_error",
  "permission_error",
  "rate_limit_error",
  "error_code_error",
  "bridge_error",
  "ai_review_error",
  "code_position_error",
] as const;

export type MistakeType = (typeof MISTAKE_TYPES)[number];

import type { QuestionType } from "~/lib/learn/types";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "概念确认",
  multi_choice: "影响范围",
  sort: "执行链路",
  fill_blank: "代码填空",
  debug: "代码纠错",
  branch_trace: "分支推演",
  position_judgement: "位置判断",
  ai_review: "AI 改法评审",
  true_false: "正误判断",
  line_pick: "关键行定位",
  code_fix: "最小修复",
  diff_review: "Diff 审查",
  review_comment: "PR Review",
  free_explain: "自由复述",
};

export const QUESTION_TYPE_COLORS: Record<QuestionType, string> = {
  single_choice: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  multi_choice: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  sort: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  fill_blank: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  debug: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  branch_trace: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  position_judgement: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  ai_review: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
  true_false: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  line_pick: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  code_fix: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  diff_review: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  review_comment: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
  free_explain: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
};

export const DIFFICULTY_LABELS = {
  beginner: "入门",
  intermediate: "进阶",
  advanced: "高级",
} as const;

export const AI_RISK_TYPES = [
  { id: "local_patch", label: "局部补丁冒充全局方案" },
  { id: "missing_session", label: "漏掉 session" },
  { id: "missing_validation", label: "漏掉字段校验" },
  { id: "missing_rate_limit", label: "漏掉限流" },
  { id: "wrong_status", label: "错误码不对" },
  { id: "loader_action_mix", label: "loader/action 职责混淆" },
  { id: "client_server_mix", label: "客户端/服务端状态混淆" },
  { id: "missing_eligibility", label: "写入数据库前未检查资格" },
  { id: "architecture_boundary", label: "破坏现有架构边界" },
] as const;

export const SORT_CATEGORY_LABELS = {
  frontend: "前端",
  backend: "后端",
  database: "数据库",
  ai: "AI",
  ui: "UI",
} as const;

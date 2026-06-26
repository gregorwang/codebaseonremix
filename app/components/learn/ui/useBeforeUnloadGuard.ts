import { useEffect } from "react";

/**
 * useBeforeUnloadGuard — 关页前的"未保存"系统级确认弹窗。
 *
 * 当 dirty=true 时, 注册 beforeunload 监听; 关掉 tab / 刷新 / 关浏览器
 * 都会触发浏览器原生确认 ("是否离开此网站? 你做的更改可能不会被保存")。
 *
 * 适用场景:
 *   - LessonPractice 用户选了答案但还没点提交
 *   - ExamPractice 答了几题还没交卷, answersByTask 是仅活在内存里的 state
 *
 * 注意: beforeunload 只触发在真正的页面卸载, **不会拦截** React Router 的
 * 同源跳转 (例如点侧边栏返回首页)。RR7 现在没有 useBlocker 的稳定 API,
 * 同源跳转的提示需要等 RR 提供 useBlocker / unstable_useBlocker, 这里
 * 先保住"关 tab / 刷新 / 关浏览器"三种最容易丢答案的场景。
 *
 * Chrome 现代版本会忽略 returnValue 字符串内容, 只看是否设置过 — 一律显示
 * 一段标准化提示。这里仍按惯例设置, 兼容旧版 Firefox/Safari。
 */
export function useBeforeUnloadGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
      // 标准 spec: 设置 returnValue 触发弹窗。现代浏览器忽略实际字符串,
      // 但兼容旧实现 (Safari < 16 / Firefox 早期) 仍读这个值。
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

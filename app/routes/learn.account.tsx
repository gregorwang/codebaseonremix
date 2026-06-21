/**
 * /learn/account — 跨设备进度同步
 *
 * 这个 app 没有登录系统：身份就是一个长期 cookie `learn_uid`，每个设备首次
 * 访问时由 `ensureLearnUser` 现编一个 UUID。本页面把这个 UUID 暴露给用户，
 * 让用户可以：
 *
 *   1. 在原设备：复制自己的"学习身份码"。
 *   2. 在新设备：把身份码粘贴进来，提交后服务器写入相同 cookie 值，
 *      之后两端的进度、错题、能力分都来自同一个 user_id 行。
 *
 * 安全模型：身份码 = 密码（122 bit 熵的 UUID v4）。掉到别人手里 = 进度被
 * 别人接管。对一个单用户的学习应用来说够用；如果未来要多用户，需要换成
 * 真正的登录（参见 remix/ 项目里的 better-auth）。
 */
import { data, Form, redirect, useActionData, useNavigation } from "react-router";
import { Link } from "react-router";
import { useState } from "react";
import {
  buildAdoptUidCookie,
  ensureLearnUser,
  isValidLearnUid,
  mergeHeaders,
} from "~/lib/server/learn/user.server";
import type { Route } from "./+types/learn.account";

export async function loader({ request }: Route.LoaderArgs) {
  const { userId, headers: cookieHeaders } = ensureLearnUser(request);
  return data(
    { userId },
    cookieHeaders ? { headers: mergeHeaders(null, cookieHeaders) } : undefined,
  );
}

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    throw data("Method not allowed", { status: 405 });
  }
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "adopt") {
    const raw = String(formData.get("uid") ?? "").trim();
    if (!raw) {
      return data<ActionResult>({ ok: false, error: "请粘贴身份码。" });
    }
    if (!isValidLearnUid(raw)) {
      return data<ActionResult>({
        ok: false,
        error: "身份码格式不对（应为 UUID，如 3fa85f64-5717-4562-b3fc-2c963f66afa6）。",
      });
    }
    const headers = buildAdoptUidCookie(raw.toLowerCase());
    // Sending the user back to the dashboard makes the new identity show up
    // immediately (loader will read the new cookie).
    throw redirect("/learn", { headers });
  }

  if (intent === "reset") {
    // Mint a fresh identity (overwrites the current cookie). Useful when the
    // user wants to start over without affecting their other devices.
    const newUid = crypto.randomUUID();
    const headers = buildAdoptUidCookie(newUid);
    throw redirect("/learn/account", { headers });
  }

  return data<ActionResult>({ ok: false, error: "未知动作" });
}

export default function AccountPage({ loaderData }: Route.ComponentProps) {
  const { userId } = loaderData;
  const actionData = useActionData() as ActionResult | undefined;
  const navigation = useNavigation();
  const submitting = navigation.state !== "idle";
  const [copied, setCopied] = useState(false);

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Some browsers (or non-HTTPS contexts) fail clipboard.writeText. The
      // <input readOnly value> below is still selectable as a manual fallback.
      setCopied(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="text-2xl font-bold tracking-tight text-[var(--fg-primary)] sm:text-3xl">
        跨设备同步进度
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
        本站没有登录系统，每个设备 cookie 里存了一个长期身份码。复制下面的码到另一台设备粘贴，就能让两端共享同一份学习进度、错题本、能力分。
      </p>

      <section className="studio-card mt-8 p-6">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
          本设备的身份码
        </h3>
        <p className="mt-1 text-xs text-[var(--fg-soft)]">
          这是一个 UUID。请像对待密码一样保管它——任何人拿到这串字符就能查看并修改你的学习进度。
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={userId}
            className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] px-3 py-2 font-mono text-sm text-[var(--fg-primary)] shadow-inner"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={copyUid}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              copied
                ? "bg-emerald-500 text-white shadow-md"
                : "bg-[var(--fg-primary)] text-[var(--surface-raised)] hover:opacity-90"
            }`}
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>
      </section>

      <section className="studio-card mt-4 p-6">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--fg-primary)]">
          用另一台设备的身份码登录本设备
        </h3>
        <p className="mt-1 text-xs text-[var(--fg-soft)]">
          粘贴你在另一台设备上复制的身份码，本机 cookie 会改写为相同的码，之后两端进度共用。
        </p>
        <Form method="post" className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="intent" value="adopt" />
          <input
            type="text"
            name="uid"
            placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6"
            className="flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 font-mono text-sm shadow-sm focus:border-[var(--color-brand-500)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)]/20"
            autoComplete="off"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-md transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
          >
            {submitting ? "切换中…" : "切换到这个身份"}
          </button>
        </Form>
        {actionData?.ok === false && (
          <p className="mt-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger-fg)]">
            {actionData.error}
          </p>
        )}
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] border border-[var(--danger-border)] bg-[var(--danger-soft)] p-6">
        <h3 className="text-lg font-semibold tracking-tight text-[var(--danger-fg)]">
          重置本机身份
        </h3>
        <p className="mt-1 text-xs text-[var(--danger-fg)]/85">
          抛弃当前身份码，本机会得到一个全新的空白身份。原身份的进度仍在 D1
          里（其它设备不受影响），但本机会从零开始。
        </p>
        <Form method="post" className="mt-4">
          <input type="hidden" name="intent" value="reset" />
          <button
            type="submit"
            disabled={submitting}
            onClick={(e) => {
              if (
                !confirm("确认让本机变为全新身份？原身份在其它设备上不受影响。")
              ) {
                e.preventDefault();
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400 bg-[var(--surface-raised)]/50 px-4 py-2 text-sm font-medium text-[var(--danger-fg)] transition-colors hover:bg-rose-100/50 disabled:opacity-50 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
          >
            {submitting ? "重置中…" : "重置本机为新身份"}
          </button>
        </Form>
      </section>

      <p className="mt-8 text-xs text-[var(--fg-soft)]">
        <Link
          to="/learn"
          className="font-medium text-[var(--brand-fg)] hover:underline"
        >
          ← 返回学习概览
        </Link>
      </p>
    </div>
  );
}

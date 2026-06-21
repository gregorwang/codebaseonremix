/** 从 remix/ 只读摘录的代码片段，供 seed 题目引用（不修改 remix 源码） */

export const SNIPPETS = {
  rootLoader: `export const loader = async ({ request }: LoaderFunctionArgs) => {
  const theme = await getTheme(request);
  const session = requestHasAuthSessionCookie(request)
    ? await getSessionCached(request)
    : null;
  return json({ theme, session: toPublicSession(session), ... });
};`,

  rootLayoutTheme: `export function Layout({ children }: { children: React.ReactNode }) {
  const data = useLoaderData<typeof loader>();
  const theme = data?.theme || "light";
  return (
    <html lang="zh-CN" className={theme}>
      ...
    </html>
  );
}`,

  rootThemeAction: `export const action = async ({ request }: ActionFunctionArgs) => {
  const theme = formData.get("theme") as Theme;
  if (theme !== "light" && theme !== "dark") {
    return json({ error: "Invalid theme" }, { status: 400 });
  }
  return json({ success: true }, {
    headers: { "Set-Cookie": await setTheme(theme, request) },
  });
};`,

  themeCookie: `export async function getTheme(request: Request): Promise<Theme> {
  const themeCookie = getThemeCookie(request);
  const theme = await themeCookie.parse(request.headers.get("Cookie"));
  return theme === "dark" ? "dark" : "light";
}`,

  themeFoucScript: `(function() {
  const theme = document.cookie.match(/theme=([^;]+)/)?.[1] || 'light';
  document.documentElement.classList.add(theme);
})();`,

  mainPanelWrongDark: `function MainPanel() {
  const [dark, setDark] = useState(false);
  return (
    <div className={dark ? "bg-gray-900 text-white" : "bg-white"}>
      <Sidebar />  {/* 侧边栏不会跟随 dark */}
      <Content />
    </div>
  );
}`,

  apiNemesisAuth: `let user;
try {
  user = await requireNemesisUser(request);
} catch (error) {
  if (error instanceof Response) {
    return json({ error: "请先登录后再使用 Nemesis。" }, { status: error.status });
  }
  throw error;
}`,

  apiNemesisChain: `// api.nemesis.ts 典型顺序
user = await requireNemesisUser(request);
validation = await validateNemesisRequest(request);
limitResult = await checkNemesisRateLimit(user);
guard = await guardNemesisMessage(env, message, recent);
result = await callNemesisModel(...);`,

  clientOnly: `export function ClientOnly({ children, fallback = null }) {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);
  if (!hasMounted) return fallback;
  return <>{children()}</>;
}`,

  entryServer: `export default async function handleRequest(request, status, headers, remixContext) {
  const cloudflareEnv = loadContext.cloudflare?.env;
  if (cloudflareEnv) setRuntimeEnv(cloudflareEnv);
  const body = await renderToReadableStream(
    <RemixServer context={remixContext} url={request.url} />,
    { signal: AbortSignal.timeout(ABORT_DELAY) }
  );
  return new Response(body, { headers, status });
}`,

  nemesisHookState: `const [inputMessage, setInputMessage] = useState("");
const [isLoading, setIsLoading] = useState(false);
const [messages, setMessages] = useState<Message[]>([]);
// 发送时: requestNemesisReply → SSE 解析 → setMessages`,

  authSessionSkip: `const session = requestHasAuthSessionCookie(request)
  ? await getSessionCached(request)
  : null;`,

  fillThemeClass: `<html lang="zh-CN" className={_____}>`,
} as const;

export type SnippetKey = keyof typeof SNIPPETS;

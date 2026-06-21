import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-screen bg-[var(--surface-base)] text-[var(--fg-primary)] antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "出错了";
  let details = "未知错误";
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "错误";
    details = error.status === 404 ? "页面不存在" : error.statusText || details;
  } else if (error instanceof Error) {
    details = error.message;
  }

  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--fg-primary)]">
        {message}
      </h1>
      <p className="mt-2 text-[var(--fg-muted)]">{details}</p>
    </main>
  );
}

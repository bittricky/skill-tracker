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

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=VT323&family=JetBrains+Mono:wght@400;500;600;700&display=swap",
  },
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "icon", href: "/icon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/icon.svg" },
];

const themeInitScript = `
  (function() {
    const key = "skill-tracker-theme";
    let theme = localStorage.getItem(key);
    if (!theme) {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    document.documentElement.setAttribute("data-theme", theme);
  })();
`;

// Register the service worker after the page loads so it doesn't block
// hydration or initial rendering. Production-only by default to avoid
// stale caches confusing `react-router dev` HMR.
const swRegisterScript = `
  (function() {
    if (!("serviceWorker" in navigator)) return;
    if (location.hostname === "localhost" && location.port && location.port !== "") {
      // Dev server: skip registration, and unregister any existing SW so
      // HMR isn't served from a stale cache.
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        regs.forEach(function(r) { r.unregister(); });
      });
      return;
    }
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function() {});
    });
  })();
`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="theme-color"
          content="#0f0f0f"
          media="(prefers-color-scheme: dark)"
        />
        <meta
          name="theme-color"
          content="#f5f5f5"
          media="(prefers-color-scheme: light)"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Skill Tracker" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        <script dangerouslySetInnerHTML={{ __html: swRegisterScript }} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

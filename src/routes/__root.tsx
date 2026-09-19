import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { ThemeProvider } from "@/components/theme";
import { THEME_BOOT } from "@/lib/theme";
import appCss from "../styles.css?url";

const APP_NAME = "Money Mate";

const fetchSessionUser = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionUser } = await import("@/lib/auth/verify.server");
  const u = await getSessionUser();
  return u ? { id: u.id, email: u.email } : null;
});

function sessionOrSkip() {
  return new Promise<Awaited<ReturnType<typeof fetchSessionUser>>>((resolve) => {
    const timer = setTimeout(() => resolve(null), 280);
    fetchSessionUser()
      .then((user) => {
        clearTimeout(timer);
        resolve(user);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(null);
      });
  });
}

export const Route = createRootRoute({
  beforeLoad: async () => ({ sessionUser: await sessionOrSkip() }),
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0c0d0f" },
      {
        name: "description",
        content: "See money leave before it leaves. Track bills, EMIs, and payday leftover. Pro is ₹49/month or ₹399/year.",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/__grok/icon-180.png" },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className="bg-bg text-fg font-sans">
        <PreviewHostBridge />
        <AuthProvider>
          <ThemeProvider>
            <Outlet />
          </ThemeProvider>
        </AuthProvider>
        <Scripts />
      </body>
    </html>
  ),
});

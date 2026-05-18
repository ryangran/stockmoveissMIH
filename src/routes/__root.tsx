import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
  useNavigate,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Diamond,
  Shield,
  LogOut,
  User,
} from "lucide-react";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "../lib/auth";
import type { TabKey } from "../lib/types";

import appCss from "../styles.css?url";

const NAV_ITEMS: { to: string; label: string; icon: React.ElementType; tabKey: TabKey; exact?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, tabKey: "dashboard", exact: true },
  { to: "/pdv", label: "PDV / Caixa", icon: ShoppingCart, tabKey: "pdv" },
  { to: "/estoque", label: "Estoque", icon: Package, tabKey: "estoque" },
  { to: "/vendedores", label: "Vendedores", icon: Users, tabKey: "vendedores" },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3, tabKey: "relatorios" },
];

function Sidebar() {
  const router = useRouterState();
  const pathname = router.location.pathname;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = user?.role === "admin"
    ? NAV_ITEMS
    : NAV_ITEMS.filter((item) => user?.allowedTabs?.includes(item.tabKey));

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  return (
    <aside
      className="flex flex-col shrink-0 h-screen sticky top-0"
      style={{
        width: 240,
        background: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-6"
        style={{ height: 64, borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="flex items-center justify-center rounded"
          style={{
            width: 32,
            height: 32,
            background: "var(--gold)",
            flexShrink: 0,
          }}
        >
          <Diamond size={16} style={{ color: "var(--primary-foreground)" }} strokeWidth={2.5} />
        </div>
        <div>
          <p
            className="font-display leading-tight"
            style={{ fontSize: 17, color: "var(--gold)", fontWeight: 600, letterSpacing: "0.04em" }}
          >
            STOCKMÓVEIS
          </p>
          <p style={{ fontSize: 10, color: "var(--muted-foreground)", letterSpacing: "0.1em", fontWeight: 500 }}>
            GESTÃO COMERCIAL
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4" style={{ display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.15em",
            color: "var(--muted-foreground)",
            paddingLeft: 12,
            paddingBottom: 8,
            paddingTop: 4,
          }}
        >
          MENU
        </p>
        {visibleItems.map(({ to, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === to : pathname.startsWith(to) && to !== "/";
          const isExactHome = to === "/" && pathname === "/";
          const active = isExactHome || (!exact && isActive) || (exact && isActive);
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--gold)" : "var(--muted-foreground)",
                background: active ? "var(--sidebar-accent)" : "transparent",
                borderLeft: active ? "2px solid var(--gold)" : "2px solid transparent",
                transition: "all 0.15s ease",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.15em",
                color: "var(--muted-foreground)",
                paddingLeft: 12,
                paddingBottom: 8,
                paddingTop: 14,
              }}
            >
              ADMINISTRAÇÃO
            </p>
            <Link
              to="/admin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: pathname === "/admin" ? 600 : 400,
                color: pathname === "/admin" ? "var(--gold)" : "var(--muted-foreground)",
                background: pathname === "/admin" ? "var(--sidebar-accent)" : "transparent",
                borderLeft: pathname === "/admin" ? "2px solid var(--gold)" : "2px solid transparent",
                transition: "all 0.15s ease",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                if (pathname !== "/admin") {
                  (e.currentTarget as HTMLElement).style.color = "var(--foreground)";
                  (e.currentTarget as HTMLElement).style.background = "var(--surface-2)";
                }
              }}
              onMouseLeave={(e) => {
                if (pathname !== "/admin") {
                  (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)";
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                }
              }}
            >
              <Shield size={17} strokeWidth={pathname === "/admin" ? 2.5 : 2} />
              <span>Painel Admin</span>
            </Link>
          </>
        )}
      </nav>

      {/* Footer */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 34,
              height: 34,
              background: "var(--surface-3)",
              flexShrink: 0,
            }}
          >
            <User size={15} style={{ color: "var(--gold)" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name ?? ""}
            </p>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
              {user?.role === "admin" ? "Administrador" : "Vendedor"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sair"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted-foreground)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 6,
              borderRadius: 6,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = "oklch(0.70 0.22 25)";
              (e.currentTarget as HTMLElement).style.background = "oklch(0.60 0.20 25 / 0.10)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)";
              (e.currentTarget as HTMLElement).style.background = "none";
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ── Auth guard ────────────────────────────────────────────────────────────────

function AppLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouterState();
  const pathname = router.location.pathname;

  useEffect(() => {
    if (!user && pathname !== "/login") {
      navigate({ to: "/login" });
    }
  }, [user, pathname]);

  if (pathname === "/login") {
    return <Outlet />;
  }

  if (!user) {
    return null;
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflowY: "auto",
          background: "var(--background)",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

// ── Error / 404 ───────────────────────────────────────────────────────────────

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="text-center">
        <p className="font-display" style={{ fontSize: 80, color: "var(--gold)", fontWeight: 600, lineHeight: 1 }}>404</p>
        <p style={{ color: "var(--muted-foreground)", marginTop: 12 }}>Página não encontrada</p>
        <Link to="/" style={{ color: "var(--gold)", marginTop: 16, display: "inline-block", fontSize: 14 }}>
          ← Voltar ao início
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="text-center" style={{ maxWidth: 400 }}>
        <p style={{ fontSize: 18, fontWeight: 600, color: "var(--foreground)" }}>Algo deu errado</p>
        <p style={{ color: "var(--muted-foreground)", marginTop: 8, fontSize: 14 }}>{error.message}</p>
        <div className="flex gap-3 justify-center" style={{ marginTop: 20 }}>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            style={{
              padding: "8px 20px",
              background: "var(--gold)",
              color: "var(--primary-foreground)",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Tentar novamente
          </button>
          <a
            href="/"
            style={{
              padding: "8px 20px",
              background: "var(--secondary)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Início
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "StockMóveis — Gestão Comercial" },
      { name: "description", content: "Sistema de gestão comercial para lojas de móveis" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Syne:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLayout />
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          toastOptions={{
            style: {
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

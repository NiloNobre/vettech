import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  PawPrint,
  ClipboardList,
  Package,
  Monitor,
  LogOut,
  Tv,
  UserCog,
  BarChart3,
  ArrowDownUp,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { MODULES, type ModuleKey } from "@/lib/modules";

const ICONS: Record<ModuleKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  clients: Users,
  patients: PawPrint,
  queue: Monitor,
  prontuarios: ClipboardList,
  users: UserCog,
  profiles: ShieldCheck,
  reports: BarChart3,
  products: Package,
  stock_movements: ArrowDownUp,
  stock_reports: BarChart3,
  sales: ShoppingCart,
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, modules, profileName, signOut } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const isAdmin = roles.includes("admin");
  const allowed = new Set<string>(isAdmin ? MODULES.map((m) => m.key) : modules);

  // Group modules; keep "Geral" (dashboard) without a header
  const grouped: Record<string, typeof MODULES> = {};
  MODULES.filter((m) => allowed.has(m.key)).forEach((m) => {
    (grouped[m.group] ||= []).push(m);
  });
  const groupOrder = ["Geral", "Recepção", "Atendimento", "Vendas", "Gestão", "Estoque"];
  const allItems = MODULES.filter((m) => allowed.has(m.key));

  return (
    <div className="min-h-screen w-full flex bg-background">
      <aside className="w-64 hidden md:flex flex-col bg-sidebar text-sidebar-foreground">
        <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold">VetTECH</div>
            <div className="text-xs opacity-70">Sistema para Clínicas Veterinárias</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-3 overflow-auto">
          {groupOrder
            .filter((g) => grouped[g]?.length)
            .map((g) => (
              <div key={g} className="space-y-1">
                {g !== "Geral" && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                    {g}
                  </div>
                )}
                {grouped[g].map((item) => {
                  const Icon = ICONS[item.key];
                  const active = pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          <div className="space-y-1">
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
              Painel
            </div>
            <a
              href="/painel"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-sidebar-accent"
            >
              <Tv className="w-4 h-4" /> Painel TV
            </a>
          </div>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs opacity-70 mb-1 truncate">{user?.email}</div>
          <div className="text-[10px] opacity-60 mb-2 uppercase">
            {profileName ?? "sem perfil"}
            {isAdmin ? " · admin" : ""}
          </div>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <PawPrint className="w-5 h-5" />
            <span className="font-semibold">VetTECH</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => signOut()}>
            Sair
          </Button>
        </div>
        <div className="md:hidden border-b overflow-x-auto whitespace-nowrap p-2 bg-card">
          {allItems.map((it) => (
            <Link
              key={it.to}
              to={it.to}
              className="inline-block px-3 py-1.5 mr-1 rounded-md text-xs bg-secondary text-secondary-foreground"
            >
              {it.label}
            </Link>
          ))}
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

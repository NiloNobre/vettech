import { Link, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard, Users, PawPrint, ClipboardList, Package, Monitor, LogOut, Tv,
  UserCog, BarChart3, ArrowDownUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type Role = "admin" | "vet" | "reception";
type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles?: Role[] };
type NavGroup = { label?: string; items: NavItem[]; roles?: Role[] };

const groups: NavGroup[] = [
  { items: [{ to: "/dashboard", label: "Início", icon: LayoutDashboard }] },
  {
    label: "Recepção",
    items: [
      { to: "/clients", label: "Clientes", icon: Users },
      { to: "/patients", label: "Pacientes", icon: PawPrint },
    ],
  },
  {
    label: "Atendimento",
    roles: ["admin", "vet"],
    items: [
      { to: "/queue", label: "Fila de Chamada", icon: Monitor },
      { to: "/prontuarios", label: "Prontuários", icon: ClipboardList },
    ],
  },
  {
    label: "Gestão",
    roles: ["admin"],
    items: [
      { to: "/users", label: "Usuários", icon: UserCog },
      { to: "/reports", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    label: "Estoque",
    roles: ["admin", "vet"],
    items: [
      { to: "/products", label: "Produtos", icon: Package },
      { to: "/stock/movements", label: "Entradas / Saídas", icon: ArrowDownUp },
      { to: "/stock/reports", label: "Relatórios", icon: BarChart3 },
    ],
  },
];

function visibleGroups(roles: Role[]) {
  const has = (need?: Role[]) => !need || need.some((r) => roles.includes(r));
  return groups.filter((g) => has(g.roles)).map((g) => ({
    ...g,
    items: g.items.filter((i) => has(i.roles)),
  })).filter((g) => g.items.length);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, roles, signOut } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const gs = visibleGroups(roles);
  const allItems = gs.flatMap((g) => g.items);

  return (
    <div className="min-h-screen w-full flex bg-background">
      <aside className="w-64 hidden md:flex flex-col bg-sidebar text-sidebar-foreground">
        <div className="p-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-sidebar-primary flex items-center justify-center">
            <PawPrint className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold">SCV</div>
            <div className="text-xs opacity-70">Sistema para Clínicas Veterinárias</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-3 overflow-auto">
          {gs.map((g, gi) => (
            <div key={gi} className="space-y-1">
              {g.label && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">
                  {g.label}
                </div>
              )}
              {g.items.map((item) => {
                const active = pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}>
                    <item.icon className="w-4 h-4" />{item.label}
                  </Link>
                );
              })}
            </div>
          ))}
          <div className="space-y-1">
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider opacity-60">Painel</div>
            <a href="/painel" target="_blank" rel="noreferrer"
               className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-sidebar-accent">
              <Tv className="w-4 h-4" /> Painel TV
            </a>
          </div>
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="text-xs opacity-70 mb-1 truncate">{user?.email}</div>
          <div className="text-[10px] opacity-60 mb-2 uppercase">{roles.join(" · ") || "sem perfil"}</div>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2">
            <PawPrint className="w-5 h-5" /><span className="font-semibold">SCV</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => signOut()}>Sair</Button>
        </div>
        <div className="md:hidden border-b overflow-x-auto whitespace-nowrap p-2 bg-card">
          {allItems.map((it) => (
            <Link key={it.to} to={it.to} className="inline-block px-3 py-1.5 mr-1 rounded-md text-xs bg-secondary text-secondary-foreground">
              {it.label}
            </Link>
          ))}
        </div>
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users, PawPrint, ClipboardList, Package, Monitor, AlertTriangle,
  UserCog, BarChart3, ArrowDownUp, Tv,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type Role = "admin" | "vet" | "reception";

const modules: Array<{
  key: string; title: string; desc: string; roles?: Role[]; color: string;
  items: { to: string; label: string; icon: any }[];
}> = [
  {
    key: "rec", title: "Recepção", desc: "Cadastro de clientes e pacientes",
    color: "from-primary/15 to-primary/5",
    items: [
      { to: "/clients", label: "Clientes", icon: Users },
      { to: "/patients", label: "Pacientes", icon: PawPrint },
    ],
  },
  {
    key: "at", title: "Atendimento", desc: "Fila e prontuário eletrônico",
    roles: ["admin", "vet"], color: "from-emerald-500/15 to-emerald-500/5",
    items: [
      { to: "/queue", label: "Fila de Chamada", icon: Monitor },
      { to: "/prontuarios", label: "Prontuários", icon: ClipboardList },
    ],
  },
  {
    key: "gest", title: "Gestão", desc: "Usuários, perfis e relatórios",
    roles: ["admin"], color: "from-teal-500/15 to-teal-500/5",
    items: [
      { to: "/users", label: "Usuários", icon: UserCog },
      { to: "/reports", label: "Relatórios", icon: BarChart3 },
    ],
  },
  {
    key: "est", title: "Estoque", desc: "Produtos, NF e relatórios",
    roles: ["admin", "vet"], color: "from-green-700/15 to-green-700/5",
    items: [
      { to: "/products", label: "Produtos", icon: Package },
      { to: "/stock/movements", label: "Entradas / Saídas", icon: ArrowDownUp },
      { to: "/stock/reports", label: "Relatórios", icon: BarChart3 },
    ],
  },
];

function Dashboard() {
  const { roles } = useAuth();
  const has = (need?: Role[]) => !need || need.some((r) => roles.includes(r as Role));
  const visible = modules.filter((m) => has(m.roles));

  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [c, p, q, prod, lowStock, today] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("queue").select("*", { count: "exact", head: true }).in("status", ["waiting", "called"]),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("id, name, stock, min_stock").lte("stock", 5).limit(5),
        supabase.from("consultations").select("*", { count: "exact", head: true }).gte("date", new Date(new Date().setHours(0,0,0,0)).toISOString()),
      ]);
      return {
        clients: c.count ?? 0, patients: p.count ?? 0, queue: q.count ?? 0,
        products: prod.count ?? 0, consultations: today.count ?? 0,
        lowStock: lowStock.data ?? [],
      };
    },
  });

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo ao VetTECH</h1>
        <p className="text-muted-foreground">Escolha um módulo para começar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((m) => (
          <Card key={m.key} className={`bg-gradient-to-br ${m.color} border-primary/10`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">{m.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{m.desc}</p>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {m.items.map((it) => (
                <Link key={it.to} to={it.to}
                  className="flex items-center gap-2 p-3 rounded-lg bg-background/70 hover:bg-background transition border">
                  <it.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">{it.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        ))}
        <Card className="bg-gradient-to-br from-muted to-background">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl flex items-center gap-2"><Tv className="w-5 h-5" /> Painel TV</CardTitle>
            <p className="text-sm text-muted-foreground">Tela de chamada para sala de espera</p>
          </CardHeader>
          <CardContent>
            <a href="/painel" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 p-3 rounded-lg bg-background/70 hover:bg-background transition border text-sm font-medium">
              <Tv className="w-4 h-4 text-primary" /> Abrir painel
            </a>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Visão geral</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Na fila", value: stats.data?.queue ?? 0, icon: Monitor, to: "/queue" },
            { label: "Atend. hoje", value: stats.data?.consultations ?? 0, icon: ClipboardList, to: "/prontuarios" },
            { label: "Clientes", value: stats.data?.clients ?? 0, icon: Users, to: "/clients" },
            { label: "Pacientes", value: stats.data?.patients ?? 0, icon: PawPrint, to: "/patients" },
            { label: "Produtos", value: stats.data?.products ?? 0, icon: Package, to: "/products" },
          ].map((c) => (
            <Link key={c.label} to={c.to}>
              <Card className="hover:shadow-md transition">
                <CardContent className="p-4">
                  <c.icon className="w-4 h-4 mb-2 opacity-70" />
                  <div className="text-2xl font-bold">{c.value}</div>
                  <div className="text-xs opacity-70 mt-1">{c.label}</div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {(stats.data?.lowStock.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-destructive" /> Estoque baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm divide-y">
              {stats.data!.lowStock.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-destructive font-medium">{p.stock} restantes</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

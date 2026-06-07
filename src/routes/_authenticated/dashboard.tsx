import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, PawPrint, ClipboardList, Package, Monitor, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

function Dashboard() {
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
        clients: c.count ?? 0,
        patients: p.count ?? 0,
        queue: q.count ?? 0,
        products: prod.count ?? 0,
        consultations: today.count ?? 0,
        lowStock: lowStock.data ?? [],
      };
    },
  });

  const cards = [
    { label: "Na fila agora", value: stats.data?.queue ?? 0, icon: Monitor, to: "/queue", color: "bg-primary text-primary-foreground" },
    { label: "Atendimentos hoje", value: stats.data?.consultations ?? 0, icon: ClipboardList, to: "/prontuarios" },
    { label: "Clientes", value: stats.data?.clients ?? 0, icon: Users, to: "/clients" },
    { label: "Pacientes", value: stats.data?.patients ?? 0, icon: PawPrint, to: "/patients" },
    { label: "Produtos", value: stats.data?.products ?? 0, icon: Package, to: "/products" },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
        <p className="text-muted-foreground">Visão geral da clínica.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to as string}>
            <Card className={`hover:shadow-md transition cursor-pointer ${c.color ?? ""}`}>
              <CardContent className="p-4">
                <c.icon className="w-5 h-5 mb-2 opacity-80" />
                <div className="text-3xl font-bold">{c.value}</div>
                <div className="text-xs opacity-80 mt-1">{c.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(stats.data?.lowStock.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="w-4 h-4 text-destructive" /> Estoque baixo</CardTitle>
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

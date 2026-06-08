import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stock/reports")({ component: StockReports });

function StockReports() {
  const { data } = useQuery({
    queryKey: ["stock-reports"],
    queryFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - 30);
      const [products, low, movs] = await Promise.all([
        supabase.from("products").select("id, name, stock, price, min_stock"),
        supabase.from("products").select("id, name, stock, min_stock").lte("stock", 5),
        supabase.from("stock_movements").select("kind, quantity, unit_cost, created_at, products(name)").gte("created_at", start.toISOString()),
      ]);
      const totalValue = (products.data ?? []).reduce((s, p) => s + (p.stock ?? 0) * Number(p.price ?? 0), 0);
      const entries = (movs.data ?? []).filter((m: any) => m.kind === "in");
      const exits = (movs.data ?? []).filter((m: any) => m.kind === "out");
      const entryQty = entries.reduce((s: number, m: any) => s + m.quantity, 0);
      const exitQty = exits.reduce((s: number, m: any) => s + m.quantity, 0);
      const entryValue = entries.reduce((s: number, m: any) => s + m.quantity * Number(m.unit_cost ?? 0), 0);
      return {
        productsCount: products.data?.length ?? 0,
        totalValue, lowStock: low.data ?? [], entryQty, exitQty, entryValue,
      };
    },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Relatórios de estoque</h1>
        <p className="text-muted-foreground text-sm">Resumo dos últimos 30 dias.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Produtos cadastrados" value={data?.productsCount ?? 0} />
        <Stat label="Valor em estoque (R$)" value={(data?.totalValue ?? 0).toFixed(2)} />
        <Stat label="Entradas (qtd)" value={data?.entryQty ?? 0} icon={TrendingUp} className="text-green-600" />
        <Stat label="Saídas (qtd)" value={data?.exitQty ?? 0} icon={TrendingDown} className="text-red-600" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-destructive" /> Estoque baixo</CardTitle>
        </CardHeader>
        <CardContent>
          {(data?.lowStock.length ?? 0) === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum produto em estoque baixo.</div>
          ) : (
            <ul className="text-sm divide-y">
              {data!.lowStock.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-destructive font-medium">{p.stock} (mín {p.min_stock ?? 0})</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon, className }: { label: string; value: any; icon?: any; className?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        {Icon && <Icon className={`w-4 h-4 mb-2 ${className ?? ""}`} />}
        <div className={`text-2xl font-bold ${className ?? ""}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

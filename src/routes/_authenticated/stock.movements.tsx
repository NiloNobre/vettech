import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowDownUp, Plus, TrendingUp, TrendingDown, Settings2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stock/movements")({ component: Movements });

type Kind = "in" | "out" | "adjust";

function Movements() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    product_id: "",
    kind: "in" as Kind,
    quantity: 1,
    unit_cost: "",
    invoice_number: "",
    supplier: "",
    notes: "",
  });

  const products = useQuery({
    queryKey: ["products-min"],
    queryFn: async () =>
      (await supabase.from("products").select("id, name, stock").order("name")).data ?? [],
  });

  const movs = useQuery({
    queryKey: ["movements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("stock_movements")
        .select(
          "id, kind, quantity, unit_cost, invoice_number, supplier, notes, created_at, product_id, products(name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.product_id) throw new Error("Selecione um produto");
      const { error } = await supabase.from("stock_movements").insert({
        product_id: form.product_id,
        kind: form.kind,
        quantity: Number(form.quantity),
        unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
        invoice_number: form.invoice_number || null,
        supplier: form.supplier || null,
        notes: form.notes || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação registrada");
      setOpen(false);
      setForm({
        product_id: "",
        kind: "in",
        quantity: 1,
        unit_cost: "",
        invoice_number: "",
        supplier: "",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: ["movements"] });
      qc.invalidateQueries({ queryKey: ["products-min"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const kindMeta: Record<Kind, { label: string; icon: any; color: string }> = {
    in: { label: "Entrada (NF)", icon: TrendingUp, color: "text-green-600" },
    out: { label: "Saída", icon: TrendingDown, color: "text-red-600" },
    adjust: { label: "Ajuste de inventário", icon: Settings2, color: "text-amber-600" },
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ArrowDownUp className="w-6 h-6 text-primary" /> Entradas / Saídas
          </h1>
          <p className="text-muted-foreground text-sm">
            Movimentações de estoque com lançamento de NF.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> Nova movimentação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar movimentação</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tipo</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => setForm({ ...form, kind: v as Kind })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Entrada (NF)</SelectItem>
                    <SelectItem value="out">Saída</SelectItem>
                    <SelectItem value="adjust">Ajuste de inventário</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Produto</Label>
                <Select
                  value={form.product_id}
                  onValueChange={(v) => setForm({ ...form, product_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(products.data ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} (estoque: {p.stock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{form.kind === "adjust" ? "Novo estoque" : "Quantidade"}</Label>
                  <Input
                    type="number"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Custo unitário</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.unit_cost}
                    onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                  />
                </div>
              </div>
              {form.kind === "in" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nº da NF</Label>
                    <Input
                      value={form.invoice_number}
                      onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fornecedor</Label>
                    <Input
                      value={form.supplier}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                disabled={create.isPending}
                onClick={() => create.mutate()}
              >
                {create.isPending ? "Salvando..." : "Registrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {(movs.data ?? []).map((m: any) => {
              const meta = kindMeta[m.kind as Kind];
              return (
                <div key={m.id} className="py-3 flex items-center gap-3">
                  <meta.icon className={`w-5 h-5 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{m.products?.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {meta.label} · {new Date(m.created_at).toLocaleString("pt-BR")}
                      {m.invoice_number && ` · NF ${m.invoice_number}`}
                      {m.supplier && ` · ${m.supplier}`}
                    </div>
                  </div>
                  <div className={`font-semibold ${meta.color}`}>
                    {m.kind === "in" ? "+" : m.kind === "out" ? "-" : "="}
                    {m.quantity}
                  </div>
                </div>
              );
            })}
            {movs.data && movs.data.length === 0 && (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Sem movimentações.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

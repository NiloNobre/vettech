import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/products")({ component: ProductsPage });

interface Product {
  id: string; name: string; category: string; sku: string | null; unit: string | null;
  stock: number; min_stock: number; price: number; description: string | null; active: boolean;
}

function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["products", search],
    queryFn: async () => {
      let q = supabase.from("products").select("*").order("name");
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Product[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("products").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-muted-foreground">Medicamentos e produtos da clínica</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="w-4 h-4 mr-2" />Novo produto</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input placeholder="Buscar produto…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-2">
        {items.map((p) => {
          const low = p.stock <= p.min_stock;
          return (
            <Card key={p.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center"><Package className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <div className="font-semibold flex items-center gap-2">
                      {p.name}
                      <Badge variant="outline" className="text-xs capitalize">{p.category}</Badge>
                      {low && <Badge variant="destructive" className="text-xs">Estoque baixo</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Estoque: <strong>{p.stock} {p.unit}</strong> • R$ {Number(p.price).toFixed(2)}
                      {p.sku && <> • SKU: {p.sku}</>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover?")) del.mutate(p.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">Nenhum produto cadastrado.</div>}
      </div>

      <ProductDialog open={open} setOpen={setOpen} product={editing} key={editing?.id ?? "new"} />
    </div>
  );
}

function ProductDialog({ open, setOpen, product }: { open: boolean; setOpen: (v: boolean) => void; product: Product | null }) {
  const qc = useQueryClient();
  const isEdit = !!product;
  const [form, setForm] = useState({
    name: product?.name ?? "", category: product?.category ?? "medicamento",
    sku: product?.sku ?? "", unit: product?.unit ?? "un",
    stock: String(product?.stock ?? 0), min_stock: String(product?.min_stock ?? 0),
    price: String(product?.price ?? 0), description: product?.description ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name, category: form.category, sku: form.sku || null, unit: form.unit,
        stock: Number(form.stock), min_stock: Number(form.min_stock), price: Number(form.price),
        description: form.description || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("products").update(payload).eq("id", product!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(isEdit ? "Atualizado" : "Cadastrado"); qc.invalidateQueries({ queryKey: ["products"] }); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <div><Label>Nome *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["medicamento", "vacina", "alimento", "acessorio", "material", "outro"].map((c) =>
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Unidade</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="un, ml, mg…" /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Estoque</Label><Input type="number" step="0.01" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></div>
            <div><Label>Mín.</Label><Input type="number" step="0.01" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
            <div><Label>Preço (R$)</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
          </div>
          <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
          <DialogFooter><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

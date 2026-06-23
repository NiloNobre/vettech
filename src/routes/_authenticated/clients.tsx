import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clients")({ component: ClientsPage });

interface ClientRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  address: string | null;
  notes: string | null;
}

function ClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", search],
    queryFn: async () => {
      let q = supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as ClientRow[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Clientes (Tutores)</h1>
          <p className="text-sm text-muted-foreground">{clients.length} cadastrados</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo cliente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-2">
        {clients.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold">{c.full_name}</div>
                <div className="text-xs text-muted-foreground flex gap-3 flex-wrap mt-1">
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {c.phone}
                    </span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {c.email}
                    </span>
                  )}
                  {c.document && <span>Doc: {c.document}</span>}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(c);
                    setOpen(true);
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm("Remover cliente?")) del.mutate(c.id);
                  }}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {clients.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-12">
            Nenhum cliente cadastrado.
          </div>
        )}
      </div>

      <ClientFormDialog open={open} setOpen={setOpen} client={editing} />
    </div>
  );
}

function ClientFormDialog({
  open,
  setOpen,
  client,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  client: ClientRow | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!client;
  const [form, setForm] = useState({
    full_name: client?.full_name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    document: client?.document ?? "",
    address: client?.address ?? "",
    notes: client?.notes ?? "",
  });
  // reset when opening
  if (open && client && form.full_name === "" && client.full_name) {
    setForm({
      full_name: client.full_name,
      email: client.email ?? "",
      phone: client.phone ?? "",
      document: client.document ?? "",
      address: client.address ?? "",
      notes: client.notes ?? "",
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        full_name: form.full_name,
        email: form.email || null,
        phone: form.phone || null,
        document: form.document || null,
        address: form.address || null,
        notes: form.notes || null,
      };
      if (isEdit) {
        const { error } = await supabase.from("clients").update(payload).eq("id", client!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Atualizado" : "Cadastrado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm({ full_name: "", email: "", phone: "", document: "", address: "", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v)
          setForm({ full_name: "", email: "", phone: "", document: "", address: "", notes: "" });
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label>Nome completo *</Label>
            <Input
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>CPF / Documento</Label>
            <Input
              value={form.document}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
            />
          </div>
          <div>
            <Label>Endereço</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { listProfiles, createProfile, updateProfile, deleteProfile } from "@/lib/profiles.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, ShieldCheck, Pencil, Lock } from "lucide-react";
import { MODULES, MODULES_BY_GROUP } from "@/lib/modules";

export const Route = createFileRoute("/_authenticated/profiles")({ component: ProfilesPage });

type FormState = { id?: string; name: string; description: string; modules: string[] };
const EMPTY: FormState = { name: "", description: "", modules: ["dashboard"] };

function ProfilesPage() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  const qc = useQueryClient();

  const fnList = useServerFn(listProfiles);
  const fnCreate = useServerFn(createProfile);
  const fnUpdate = useServerFn(updateProfile);
  const fnDelete = useServerFn(deleteProfile);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["access-profiles"],
    queryFn: () => fnList(),
    enabled: isAdmin,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  const save = useMutation({
    mutationFn: async () => {
      if (form.id) {
        await fnUpdate({ data: { id: form.id, name: form.name, description: form.description, modules: form.modules } });
      } else {
        await fnCreate({ data: { name: form.name, description: form.description, modules: form.modules } });
      }
    },
    onSuccess: () => {
      toast.success("Perfil salvo");
      setOpen(false); setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["access-profiles"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Perfil excluído"); qc.invalidateQueries({ queryKey: ["access-profiles"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  function toggleModule(k: string) {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(k) ? f.modules.filter((x) => x !== k) : [...f.modules, k],
    }));
  }

  function openNew() { setForm(EMPTY); setOpen(true); }
  function openEdit(p: any) {
    setForm({ id: p.id, name: p.name, description: p.description ?? "", modules: p.modules ?? [] });
    setOpen(true);
  }

  if (!isAdmin) {
    return <div className="text-center py-12 text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Perfis de Acesso</h1>
          <p className="text-muted-foreground text-sm">Defina quais módulos cada perfil enxerga.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(EMPTY); }}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> Novo perfil</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{form.id ? "Editar perfil" : "Novo perfil"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              </div>
              <div>
                <Label>Módulos liberados</Label>
                <div className="mt-2 space-y-3 max-h-[40vh] overflow-auto pr-2">
                  {Object.entries(MODULES_BY_GROUP).map(([g, mods]) => (
                    <div key={g} className="border rounded-lg p-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{g}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mods.map((m) => (
                          <label key={m.key} className="flex items-center gap-2 cursor-pointer text-sm">
                            <Checkbox checked={form.modules.includes(m.key)} onCheckedChange={() => toggleModule(m.key)} />
                            {m.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end">
                <Button disabled={!form.name || save.isPending} onClick={() => save.mutate()}>
                  {form.id ? "Salvar alterações" : "Criar perfil"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Perfis cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          <div className="divide-y">
            {profiles?.map((p: any) => (
              <div key={p.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p.is_system && <span className="text-[10px] uppercase tracking-wider bg-secondary text-secondary-foreground px-2 py-0.5 rounded inline-flex items-center gap-1"><Lock className="w-3 h-3" />Sistema</span>}
                  </div>
                  {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(p.modules ?? []).map((k: string) => {
                      const m = MODULES.find((x) => x.key === k);
                      return <span key={k} className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">{m?.label ?? k}</span>;
                    })}
                    {(!p.modules || p.modules.length === 0) && <span className="text-xs text-muted-foreground">Nenhum módulo</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                  {!p.is_system && (
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm(`Excluir o perfil "${p.name}"?`)) del.mutate(p.id); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { listUsers, createUser, updateUserRoles, deleteUser } from "@/lib/users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({ component: UsersPage });

const ALL_ROLES = ["admin", "vet", "reception"] as const;
type Role = (typeof ALL_ROLES)[number];

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  vet: "Veterinário",
  reception: "Recepção",
};

function UsersPage() {
  const { roles } = useAuth();
  if (!roles.includes("admin")) {
    return <div className="text-center py-12 text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  const qc = useQueryClient();
  const fnList = useServerFn(listUsers);
  const fnCreate = useServerFn(createUser);
  const fnUpdate = useServerFn(updateUserRoles);
  const fnDelete = useServerFn(deleteUser);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fnList(),
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", roles: ["reception"] as Role[] });

  const create = useMutation({
    mutationFn: () => fnCreate({ data: form }),
    onSuccess: () => {
      toast.success("Usuário criado");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", roles: ["reception"] });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar"),
  });

  const update = useMutation({
    mutationFn: (v: { user_id: string; roles: Role[] }) => fnUpdate({ data: v }),
    onSuccess: () => { toast.success("Perfis atualizados"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: (user_id: string) => fnDelete({ data: { user_id } }),
    onSuccess: () => { toast.success("Usuário removido"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  function toggleRole(arr: Role[], r: Role): Role[] {
    return arr.includes(r) ? arr.filter((x) => x !== r) : [...arr, r];
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerencie usuários e perfis de acesso.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" /> Novo usuário</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar usuário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome completo</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Senha provisória</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              <div>
                <Label>Perfis</Label>
                <div className="space-y-2 mt-2">
                  {ALL_ROLES.map((r) => (
                    <label key={r} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.roles.includes(r)} onCheckedChange={() => setForm({ ...form, roles: toggleRole(form.roles, r) })} />
                      {ROLE_LABEL[r]}
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full" disabled={create.isPending || !form.email || !form.password} onClick={() => create.mutate()}>
                {create.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : (
            <div className="divide-y">
              {(users ?? []).map((u) => (
                <div key={u.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{u.full_name || "(sem nome)"}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {ALL_ROLES.map((r) => {
                      const checked = u.roles.includes(r);
                      return (
                        <label key={r} className="flex items-center gap-1 text-xs">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => update.mutate({ user_id: u.id, roles: toggleRole(u.roles as Role[], r) })}
                          />
                          {ROLE_LABEL[r]}
                        </label>
                      );
                    })}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm("Excluir usuário?")) del.mutate(u.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {users && users.length === 0 && <div className="text-sm text-muted-foreground py-6 text-center">Nenhum usuário.</div>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

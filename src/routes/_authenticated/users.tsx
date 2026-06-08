import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { listUsers, createUser, deleteUser, setUserAdmin, listAdminUserIds } from "@/lib/users.functions";
import { listProfiles, assignUserProfile } from "@/lib/profiles.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Plus, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({ component: UsersPage });

function UsersPage() {
  const { roles, user: me } = useAuth();
  const isAdmin = roles.includes("admin");

  const qc = useQueryClient();
  const fnList = useServerFn(listUsers);
  const fnCreate = useServerFn(createUser);
  const fnDelete = useServerFn(deleteUser);
  const fnSetAdmin = useServerFn(setUserAdmin);
  const fnAssign = useServerFn(assignUserProfile);
  const fnListProfiles = useServerFn(listProfiles);
  const fnAdminIds = useServerFn(listAdminUserIds);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"], queryFn: () => fnList(), enabled: isAdmin,
  });
  const { data: profiles } = useQuery({
    queryKey: ["access-profiles"], queryFn: () => fnListProfiles(), enabled: isAdmin,
  });
  const { data: adminIds } = useQuery({
    queryKey: ["admin-ids"], queryFn: () => fnAdminIds(), enabled: isAdmin,
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", profile_id: "", is_admin: false });

  const create = useMutation({
    mutationFn: () => fnCreate({ data: form }),
    onSuccess: () => {
      toast.success("Usuário criado");
      setOpen(false);
      setForm({ email: "", password: "", full_name: "", profile_id: "", is_admin: false });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["admin-ids"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar"),
  });

  const assign = useMutation({
    mutationFn: (v: { user_id: string; profile_id: string }) => fnAssign({ data: v }),
    onSuccess: () => { toast.success("Perfil atribuído"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const toggleAdmin = useMutation({
    mutationFn: (v: { user_id: string; is_admin: boolean }) => fnSetAdmin({ data: v }),
    onSuccess: () => { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin-ids"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const del = useMutation({
    mutationFn: (user_id: string) => fnDelete({ data: { user_id } }),
    onSuccess: () => { toast.success("Usuário removido"); qc.invalidateQueries({ queryKey: ["users"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  if (!isAdmin) {
    return <div className="text-center py-12 text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  const adminSet = new Set(adminIds ?? []);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Usuários</h1>
          <p className="text-muted-foreground text-sm">Gerencie usuários e atribua perfis de acesso.</p>
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
                <Label>Perfil de acesso</Label>
                <Select value={form.profile_id} onValueChange={(v) => setForm({ ...form, profile_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione um perfil" /></SelectTrigger>
                  <SelectContent>
                    {profiles?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm pt-2">
                <Checkbox checked={form.is_admin} onCheckedChange={(c) => setForm({ ...form, is_admin: !!c })} />
                Conceder acesso de administrador (gerenciar usuários e perfis)
              </label>
              <Button
                disabled={!form.email || !form.password || !form.full_name || !form.profile_id || create.isPending}
                onClick={() => create.mutate()} className="w-full">
                Criar usuário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Usuários cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          <div className="divide-y">
            {users?.map((u) => {
              const isUserAdmin = adminSet.has(u.id);
              return (
                <div key={u.id} className="py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{u.full_name || "(sem nome)"}</div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                  </div>
                  <div className="w-full md:w-56">
                    <Select
                      value={u.profile_id ?? ""}
                      onValueChange={(v) => assign.mutate({ user_id: u.id, profile_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Sem perfil" /></SelectTrigger>
                      <SelectContent>
                        {profiles?.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <label className="flex items-center gap-2 text-xs whitespace-nowrap">
                    <Checkbox
                      checked={isUserAdmin}
                      onCheckedChange={(c) => toggleAdmin.mutate({ user_id: u.id, is_admin: !!c })}
                    />
                    Admin
                  </label>
                  <Button
                    variant="ghost" size="icon"
                    disabled={u.id === me?.id}
                    onClick={() => { if (confirm(`Excluir ${u.email}?`)) del.mutate(u.id); }}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

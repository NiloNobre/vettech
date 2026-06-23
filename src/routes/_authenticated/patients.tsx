import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, PawPrint, Search, ClipboardList, MonitorPlay } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patients")({ component: PatientsPage });

interface Patient {
  id: string;
  client_id: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  birth_date: string | null;
  weight: number | null;
  clients?: { full_name: string } | null;
}

function PatientsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", search],
    queryFn: async () => {
      let q = supabase
        .from("patients")
        .select("*, clients(full_name)")
        .order("created_at", { ascending: false });
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data as Patient[];
    },
  });

  const sendToQueue = useMutation({
    mutationFn: async (patient_id: string) => {
      const { error } = await supabase.from("queue").insert({ patient_id, status: "waiting" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Adicionado à fila!");
      qc.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Pacientes</h1>
          <p className="text-sm text-muted-foreground">{patients.length} cadastrados</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo paciente
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input
          placeholder="Buscar paciente…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-2">
        {patients.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center">
                  <PawPrint className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.species}
                    {p.breed ? ` • ${p.breed}` : ""} • Tutor: {p.clients?.full_name ?? "—"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => sendToQueue.mutate(p.id)}>
                  <MonitorPlay className="w-4 h-4 mr-1" /> Para consulta
                </Button>
                <Link to="/prontuarios/$patientId" params={{ patientId: p.id }}>
                  <Button size="sm">
                    <ClipboardList className="w-4 h-4 mr-1" /> Prontuário
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {patients.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-12">
            Nenhum paciente cadastrado.
          </div>
        )}
      </div>

      <PatientFormDialog open={open} setOpen={setOpen} />
    </div>
  );
}

function PatientFormDialog({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    client_id: "",
    name: "",
    species: "Cão",
    breed: "",
    sex: "M",
    birth_date: "",
    weight: "",
    microchip: "",
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-min"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("patients").insert({
        client_id: form.client_id,
        name: form.name,
        species: form.species,
        breed: form.breed || null,
        sex: form.sex || null,
        birth_date: form.birth_date || null,
        weight: form.weight ? Number(form.weight) : null,
        microchip: form.microchip || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Paciente cadastrado");
      qc.invalidateQueries({ queryKey: ["patients"] });
      setOpen(false);
      setForm({
        client_id: "",
        name: "",
        species: "Cão",
        breed: "",
        sex: "M",
        birth_date: "",
        weight: "",
        microchip: "",
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo paciente</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-3"
        >
          <div>
            <Label>Tutor *</Label>
            <Select
              value={form.client_id}
              onValueChange={(v) => setForm({ ...form, client_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um tutor" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {clients.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Cadastre um cliente primeiro.</p>
            )}
          </div>
          <div>
            <Label>Nome *</Label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Espécie *</Label>
              <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Cão", "Gato", "Ave", "Roedor", "Réptil", "Outro"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Sexo</Label>
              <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Macho</SelectItem>
                  <SelectItem value="F">Fêmea</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Raça</Label>
            <Input
              value={form.breed}
              onChange={(e) => setForm({ ...form, breed: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Nascimento</Label>
              <Input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Microchip</Label>
            <Input
              value={form.microchip}
              onChange={(e) => setForm({ ...form, microchip: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={save.isPending || !form.client_id}>
              {save.isPending ? "Salvando…" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

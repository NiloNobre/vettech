import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, Plus, Pill, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/prontuarios/$patientId")({ component: Prontuario });

interface Consult {
  id: string; date: string; weight: number | null; temperature: number | null;
  anamnesis: string | null; diagnosis: string | null; treatment: string | null; observations: string | null;
}
interface PrescItem { id: string; product_name: string; dosage: string | null; frequency: string | null; duration: string | null; }

function Prontuario() {
  const { patientId } = Route.useParams();
  const [open, setOpen] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("patients").select("*, clients(full_name, phone)").eq("id", patientId).single();
      if (error) throw error; return data;
    },
  });

  const { data: consults = [] } = useQuery({
    queryKey: ["consultations", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("consultations").select("*").eq("patient_id", patientId).order("date", { ascending: false });
      if (error) throw error; return data as Consult[];
    },
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <Link to="/prontuarios" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="w-4 h-4" />Voltar</Link>

      <Card>
        <CardContent className="p-5">
          <h1 className="text-2xl font-bold">{patient?.name}</h1>
          <div className="text-sm text-muted-foreground mt-1">
            {patient?.species}{patient?.breed ? ` • ${patient.breed}` : ""}
            {patient?.sex ? ` • ${patient.sex === "M" ? "Macho" : "Fêmea"}` : ""}
            {patient?.weight ? ` • ${patient.weight}kg` : ""}
          </div>
          <div className="text-sm mt-2">Tutor: <strong>{patient?.clients?.full_name}</strong> {patient?.clients?.phone && <span className="text-muted-foreground">• {patient.clients.phone}</span>}</div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Histórico de consultas</h2>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova consulta</Button>
      </div>

      <div className="space-y-3">
        {consults.map((c) => <ConsultCard key={c.id} consult={c} />)}
        {consults.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">Nenhuma consulta registrada.</div>}
      </div>

      <NewConsultDialog open={open} setOpen={setOpen} patientId={patientId} />
    </div>
  );
}

function ConsultCard({ consult }: { consult: Consult }) {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["presc", consult.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("prescription_items").select("*").eq("consultation_id", consult.id);
      if (error) throw error; return data as PrescItem[];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span>{format(new Date(consult.date), "dd/MM/yyyy 'às' HH:mm")}</span>
          <div className="text-xs font-normal text-muted-foreground">
            {consult.weight && <>Peso: {consult.weight}kg </>}
            {consult.temperature && <>• T: {consult.temperature}°C</>}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {consult.anamnesis && <div><strong>Anamnese:</strong> {consult.anamnesis}</div>}
        {consult.diagnosis && <div><strong>Diagnóstico:</strong> {consult.diagnosis}</div>}
        {consult.treatment && <div><strong>Tratamento:</strong> {consult.treatment}</div>}
        {consult.observations && <div className="text-muted-foreground">{consult.observations}</div>}
        {items.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="font-semibold text-xs uppercase tracking-wide mb-2 flex items-center gap-1"><Pill className="w-3 h-3" /> Prescrição</div>
            <ul className="space-y-1">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span><strong>{i.product_name}</strong> {i.dosage && <>— {i.dosage}</>} {i.frequency && <>• {i.frequency}</>} {i.duration && <>• {i.duration}</>}</span>
                  <button onClick={async () => { await supabase.from("prescription_items").delete().eq("id", i.id); qc.invalidateQueries({ queryKey: ["presc", consult.id] }); }}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <AddPrescription consultationId={consult.id} />
      </CardContent>
    </Card>
  );
}

function AddPrescription({ consultationId }: { consultationId: string }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["product-suggest", q],
    queryFn: async () => {
      if (!q) return [];
      const { data } = await supabase.from("products").select("id, name").ilike("name", `%${q}%`).limit(8);
      return data ?? [];
    },
    enabled: q.length > 0,
  });

  async function add() {
    const name = selected?.name || q;
    if (!name) return;
    const { error } = await supabase.from("prescription_items").insert({
      consultation_id: consultationId, product_id: selected?.id ?? null,
      product_name: name, dosage: dosage || null, frequency: frequency || null, duration: duration || null,
    });
    if (error) return toast.error(error.message);
    setQ(""); setDosage(""); setFrequency(""); setDuration(""); setSelected(null);
    qc.invalidateQueries({ queryKey: ["presc", consultationId] });
    toast.success("Adicionado à prescrição");
  }

  return (
    <div className="mt-3 pt-3 border-t grid gap-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <Popover open={q.length > 0 && suggestions.length > 0 && !selected}>
          <PopoverTrigger asChild>
            <Input placeholder="Medicamento/produto (digite para buscar)…" value={q}
              onChange={(e) => { setQ(e.target.value); setSelected(null); }} />
          </PopoverTrigger>
          <PopoverContent className="p-1 w-[--radix-popover-trigger-width]" onOpenAutoFocus={(e) => e.preventDefault()}>
            {suggestions.map((s) => (
              <button key={s.id} type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                onClick={() => { setSelected(s); setQ(s.name); }}>{s.name}</button>
            ))}
          </PopoverContent>
        </Popover>
        <Input placeholder="Dosagem (ex: 1 comp.)" value={dosage} onChange={(e) => setDosage(e.target.value)} />
        <Input placeholder="Frequência (ex: 12/12h)" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
        <Input placeholder="Duração (ex: 7 dias)" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>
      <Button size="sm" variant="outline" onClick={add} disabled={!q}><Plus className="w-4 h-4 mr-1" />Adicionar prescrição</Button>
    </div>
  );
}

function NewConsultDialog({ open, setOpen, patientId }: { open: boolean; setOpen: (v: boolean) => void; patientId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ weight: "", temperature: "", anamnesis: "", diagnosis: "", treatment: "", observations: "" });

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("consultations").insert({
        patient_id: patientId, vet_id: user?.id ?? null,
        weight: form.weight ? Number(form.weight) : null,
        temperature: form.temperature ? Number(form.temperature) : null,
        anamnesis: form.anamnesis || null, diagnosis: form.diagnosis || null,
        treatment: form.treatment || null, observations: form.observations || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consulta registrada");
      qc.invalidateQueries({ queryKey: ["consultations", patientId] });
      setOpen(false);
      setForm({ weight: "", temperature: "", anamnesis: "", diagnosis: "", treatment: "", observations: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nova consulta</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Peso (kg)</Label><Input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} /></div>
            <div><Label>Temperatura (°C)</Label><Input type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} /></div>
          </div>
          <div><Label>Anamnese</Label><Textarea rows={3} value={form.anamnesis} onChange={(e) => setForm({ ...form, anamnesis: e.target.value })} /></div>
          <div><Label>Diagnóstico</Label><Textarea rows={2} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
          <div><Label>Tratamento</Label><Textarea rows={2} value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} /></div>
          <div><Label>Observações</Label><Textarea rows={2} value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} /></div>
          <DialogFooter><Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar consulta"}</Button></DialogFooter>
        </form>
        <p className="text-xs text-muted-foreground">As prescrições são adicionadas após salvar a consulta, no card correspondente.</p>
      </DialogContent>
    </Dialog>
  );
}

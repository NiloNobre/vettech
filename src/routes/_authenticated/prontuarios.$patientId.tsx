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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pill, Trash2, FileText, Syringe, FileSignature, Printer } from "lucide-react";
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
    <div className="space-y-4 max-w-5xl">
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

      <Tabs defaultValue="consultas">
        <TabsList>
          <TabsTrigger value="consultas"><FileText className="w-4 h-4 mr-1" />Consultas</TabsTrigger>
          <TabsTrigger value="receituarios"><FileSignature className="w-4 h-4 mr-1" />Receituários</TabsTrigger>
          <TabsTrigger value="atestados"><FileText className="w-4 h-4 mr-1" />Atestados</TabsTrigger>
          <TabsTrigger value="vacinas"><Syringe className="w-4 h-4 mr-1" />Vacinas</TabsTrigger>
        </TabsList>

        <TabsContent value="consultas" className="space-y-3">
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-lg font-semibold">Histórico de consultas</h2>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova consulta</Button>
          </div>
          {consults.map((c) => <ConsultCard key={c.id} consult={c} />)}
          {consults.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">Nenhuma consulta registrada.</div>}
        </TabsContent>

        <TabsContent value="receituarios"><ReceituariosTab patient={patient} /></TabsContent>
        <TabsContent value="atestados"><AtestadosTab patient={patient} /></TabsContent>
        <TabsContent value="vacinas"><VacinasTab patientId={patientId} /></TabsContent>
      </Tabs>

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
  const [saving, setSaving] = useState(false);

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
    const name = (selected?.name || q).trim();
    if (!name) { toast.error("Informe o nome do medicamento"); return; }
    setSaving(true);
    const { error } = await supabase.from("prescription_items").insert({
      consultation_id: consultationId, product_id: selected?.id ?? null,
      product_name: name, dosage: dosage || null, frequency: frequency || null, duration: duration || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setQ(""); setDosage(""); setFrequency(""); setDuration(""); setSelected(null);
    qc.invalidateQueries({ queryKey: ["presc", consultationId] });
    toast.success("Adicionado à prescrição");
  }

  return (
    <div className="mt-3 pt-3 border-t grid gap-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nova prescrição</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="md:col-span-2">
          <Label className="text-xs">Medicamento / produto *</Label>
          <Popover open={q.length > 0 && suggestions.length > 0 && !selected}>
            <PopoverTrigger asChild>
              <Input placeholder="Ex.: Amoxicilina 500mg" value={q}
                onChange={(e) => { setQ(e.target.value); setSelected(null); }} />
            </PopoverTrigger>
            <PopoverContent className="p-1 w-[--radix-popover-trigger-width]" onOpenAutoFocus={(e) => e.preventDefault()}>
              {suggestions.map((s) => (
                <button key={s.id} type="button" className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent"
                  onClick={() => { setSelected(s); setQ(s.name); }}>{s.name}</button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        <Input placeholder="Dosagem (ex: 1 comp.)" value={dosage} onChange={(e) => setDosage(e.target.value)} />
        <Input placeholder="Frequência (ex: 12/12h)" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
        <Input placeholder="Duração (ex: 7 dias)" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>
      <Button size="sm" onClick={add} disabled={saving || !q.trim()}>
        <Plus className="w-4 h-4 mr-1" />{saving ? "Salvando…" : "Adicionar prescrição"}
      </Button>
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

// ============ Receituários ============
interface PatientLite { id?: string; name?: string; species?: string | null; breed?: string | null; clients?: { full_name?: string | null; phone?: string | null } | null }

function printDoc(title: string, patient: PatientLite | undefined | null, body: string, footer?: string) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return;
  const tutor = patient?.clients?.full_name ?? "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:40px auto;padding:0 24px;color:#111}
    h1{font-size:22px;margin:0 0 4px}.muted{color:#555;font-size:13px}.box{border:1px solid #ddd;border-radius:8px;padding:16px;margin-top:24px;white-space:pre-wrap;line-height:1.5}
    .sig{margin-top:80px;border-top:1px solid #333;width:280px;padding-top:6px;text-align:center;font-size:12px}
    @media print{button{display:none}}</style></head><body>
    <h1>VetTECH — ${title}</h1>
    <div class="muted">Paciente: <strong>${patient?.name ?? ""}</strong> • ${patient?.species ?? ""}${patient?.breed ? " • " + patient.breed : ""}</div>
    <div class="muted">Tutor: <strong>${tutor}</strong></div>
    <div class="muted">Emitido em ${new Date().toLocaleString("pt-BR")}</div>
    <div class="box">${body.replace(/</g, "&lt;")}</div>
    ${footer ? `<div class="muted" style="margin-top:8px">${footer}</div>` : ""}
    <div class="sig">Médico(a) Veterinário(a) — CRMV</div>
    <button onclick="window.print()" style="margin-top:24px;padding:8px 16px">Imprimir</button>
    </body></html>`;
  w.document.write(html); w.document.close();
}

function ReceituariosTab({ patient }: { patient: PatientLite | undefined | null }) {
  const qc = useQueryClient();
  const { patientId } = Route.useParams();
  const [kind, setKind] = useState<"comum" | "especial">("comum");
  const [content, setContent] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["receituarios", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("receituarios").select("*").eq("patient_id", patientId).order("date", { ascending: false });
      if (error) throw error; return data;
    },
  });

  async function save() {
    if (!content.trim()) { toast.error("Escreva o conteúdo da receita"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("receituarios").insert({ patient_id: patientId, vet_id: user?.id ?? null, kind, content });
    if (error) return toast.error(error.message);
    setContent("");
    qc.invalidateQueries({ queryKey: ["receituarios", patientId] });
    toast.success("Receituário salvo");
  }

  return (
    <div className="space-y-4 pt-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Novo receituário</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as "comum" | "especial")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comum">Receita comum</SelectItem>
                  <SelectItem value="especial">Receita especial (controlada)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo da receita</Label>
              <Textarea rows={6} value={content} onChange={(e) => setContent(e.target.value)}
                placeholder={"Ex.:\n1. Amoxicilina 500mg — 1 cp 12/12h por 7 dias\n2. Dipirona — gotas conforme peso"} />
            </div>
          </div>
          <Button onClick={save}><Plus className="w-4 h-4 mr-1" />Salvar receituário</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{r.kind === "especial" ? "Receita especial" : "Receita comum"}</div>
                  <div className="text-sm text-muted-foreground">{format(new Date(r.date), "dd/MM/yyyy 'às' HH:mm")}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => printDoc(r.kind === "especial" ? "Receituário Especial" : "Receituário", patient, r.content, r.kind === "especial" ? "Via única retida na farmácia conforme legislação." : "")}>
                    <Printer className="w-3 h-3 mr-1" />Imprimir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("receituarios").delete().eq("id", r.id); qc.invalidateQueries({ queryKey: ["receituarios", patientId] }); }}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="whitespace-pre-wrap text-sm border-t pt-2">{r.content}</div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Nenhum receituário registrado.</div>}
      </div>
    </div>
  );
}

// ============ Atestados ============
function AtestadosTab({ patient }: { patient: PatientLite | undefined | null }) {
  const qc = useQueryClient();
  const { patientId } = Route.useParams();
  const [content, setContent] = useState("");
  const [days, setDays] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["atestados", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("atestados").select("*").eq("patient_id", patientId).order("date", { ascending: false });
      if (error) throw error; return data;
    },
  });

  async function save() {
    if (!content.trim()) { toast.error("Escreva o atestado"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("atestados").insert({
      patient_id: patientId, vet_id: user?.id ?? null, content, days: days ? Number(days) : null,
    });
    if (error) return toast.error(error.message);
    setContent(""); setDays("");
    qc.invalidateQueries({ queryKey: ["atestados", patientId] });
    toast.success("Atestado salvo");
  }

  return (
    <div className="space-y-4 pt-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Novo atestado médico</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Conteúdo</Label>
            <Textarea rows={5} value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Atesto para os devidos fins que o paciente acima encontra-se sob meus cuidados…" />
          </div>
          <div className="w-40">
            <Label>Dias de afastamento</Label>
            <Input type="number" min="0" value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <Button onClick={save}><Plus className="w-4 h-4 mr-1" />Salvar atestado</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-3">
                <div className="text-sm text-muted-foreground">
                  {format(new Date(a.date), "dd/MM/yyyy 'às' HH:mm")}
                  {a.days != null && <> • <strong>{a.days}</strong> dia(s)</>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => printDoc("Atestado Médico Veterinário", patient, a.content, a.days != null ? `Período de afastamento: ${a.days} dia(s).` : undefined)}>
                    <Printer className="w-3 h-3 mr-1" />Imprimir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("atestados").delete().eq("id", a.id); qc.invalidateQueries({ queryKey: ["atestados", patientId] }); }}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="whitespace-pre-wrap text-sm border-t pt-2">{a.content}</div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Nenhum atestado registrado.</div>}
      </div>
    </div>
  );
}

// ============ Vacinas ============
function VacinasTab({ patientId }: { patientId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", manufacturer: "", batch: "", application_date: format(new Date(), "yyyy-MM-dd"), next_dose_date: "", notes: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["vacinas", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("vacinas").select("*").eq("patient_id", patientId).order("application_date", { ascending: false });
      if (error) throw error; return data;
    },
  });

  async function save() {
    if (!form.name.trim()) { toast.error("Informe a vacina"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("vacinas").insert({
      patient_id: patientId, vet_id: user?.id ?? null,
      name: form.name, manufacturer: form.manufacturer || null, batch: form.batch || null,
      application_date: form.application_date, next_dose_date: form.next_dose_date || null,
      notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", manufacturer: "", batch: "", application_date: format(new Date(), "yyyy-MM-dd"), next_dose_date: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["vacinas", patientId] });
    toast.success("Vacina registrada");
  }

  return (
    <div className="space-y-4 pt-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Nova vacina aplicada</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>Vacina *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: V10, Antirrábica" /></div>
            <div><Label>Fabricante</Label><Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} /></div>
            <div><Label>Lote</Label><Input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} /></div>
            <div><Label>Data de aplicação</Label><Input type="date" value={form.application_date} onChange={(e) => setForm({ ...form, application_date: e.target.value })} /></div>
            <div><Label>Próxima dose</Label><Input type="date" value={form.next_dose_date} onChange={(e) => setForm({ ...form, next_dose_date: e.target.value })} /></div>
            <div><Label>Observações</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <Button onClick={save}><Plus className="w-4 h-4 mr-1" />Registrar vacina</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map((v) => (
          <Card key={v.id}>
            <CardContent className="p-4 flex justify-between items-start gap-3">
              <div>
                <div className="font-semibold">{v.name}</div>
                <div className="text-xs text-muted-foreground">
                  Aplicada em {format(new Date(v.application_date), "dd/MM/yyyy")}
                  {v.next_dose_date && <> • Próxima: {format(new Date(v.next_dose_date), "dd/MM/yyyy")}</>}
                </div>
                {(v.manufacturer || v.batch) && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {v.manufacturer}{v.batch ? ` • Lote ${v.batch}` : ""}
                  </div>
                )}
                {v.notes && <div className="text-sm mt-1">{v.notes}</div>}
              </div>
              <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("vacinas").delete().eq("id", v.id); qc.invalidateQueries({ queryKey: ["vacinas", patientId] }); }}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Nenhuma vacina registrada.</div>}
      </div>
    </div>
  );
}

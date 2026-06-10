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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Pill, Trash2, FileText, Syringe, FileSignature, Printer, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { printReceituarioComum, printReceituarioEspecial, printReceituarioItems, printAtestado, printExame, type PatientLite } from "@/lib/print-docs";

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
      const { data, error } = await supabase.from("patients").select("*, clients(full_name, phone, cpf, address)").eq("id", patientId).single();
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
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="consultas"><FileText className="w-4 h-4 mr-1" />Consultas</TabsTrigger>
          <TabsTrigger value="exames"><FlaskConical className="w-4 h-4 mr-1" />Exames</TabsTrigger>
          <TabsTrigger value="prescricoes"><Pill className="w-4 h-4 mr-1" />Prescrição</TabsTrigger>
          <TabsTrigger value="receituarios"><FileSignature className="w-4 h-4 mr-1" />Receituários</TabsTrigger>
          <TabsTrigger value="atestados"><FileText className="w-4 h-4 mr-1" />Atestados</TabsTrigger>
          <TabsTrigger value="vacinas"><Syringe className="w-4 h-4 mr-1" />Vacinas</TabsTrigger>
        </TabsList>

        <TabsContent value="consultas" className="space-y-3">
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-lg font-semibold">Histórico de consultas</h2>
            <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Nova consulta</Button>
          </div>
          {consults.map((c) => <ConsultCard key={c.id} consult={c} patient={patient as PatientLite} />)}
          {consults.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">Nenhuma consulta registrada.</div>}
        </TabsContent>

        <TabsContent value="exames"><ExamesTab patient={patient as PatientLite} /></TabsContent>
        <TabsContent value="prescricoes"><PrescricoesTab patient={patient as PatientLite} /></TabsContent>
        <TabsContent value="receituarios"><ReceituariosTab patient={patient as PatientLite} /></TabsContent>
        <TabsContent value="atestados"><AtestadosTab patient={patient as PatientLite} /></TabsContent>
        <TabsContent value="vacinas"><VacinasTab patientId={patientId} /></TabsContent>
      </Tabs>

      <NewConsultDialog open={open} setOpen={setOpen} patientId={patientId} />
    </div>
  );
}

function ConsultCard({ consult, patient }: { consult: Consult; patient: PatientLite | undefined | null }) {
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
            <div className="font-semibold text-xs uppercase tracking-wide mb-2 flex items-center gap-1 justify-between">
              <span className="flex items-center gap-1"><Pill className="w-3 h-3" /> Prescrição</span>
              <Button size="sm" variant="outline" onClick={() => printReceituarioItems(patient, items)}><Printer className="w-3 h-3 mr-1" />Imprimir</Button>
            </div>
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

// ============ Product picker (uses products in stock) ============
function useStockProducts() {
  return useQuery({
    queryKey: ["stock-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, unit")
        .eq("active", true)
        .gt("stock", 0)
        .order("name");
      if (error) throw error; return data ?? [];
    },
  });
}

function AddPrescription({ consultationId }: { consultationId: string }) {
  const qc = useQueryClient();
  const { data: products = [] } = useStockProducts();
  const [productId, setProductId] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    const product = products.find((p) => p.id === productId);
    if (!product) { toast.error("Selecione um medicamento do estoque"); return; }
    setSaving(true);
    const { error } = await supabase.from("prescription_items").insert({
      consultation_id: consultationId, product_id: product.id, product_name: product.name,
      dosage: dosage || null, frequency: frequency || null, duration: duration || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setProductId(""); setDosage(""); setFrequency(""); setDuration("");
    qc.invalidateQueries({ queryKey: ["presc", consultationId] });
    toast.success("Adicionado à prescrição");
  }

  return (
    <div className="mt-3 pt-3 border-t grid gap-2">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nova prescrição</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="md:col-span-2">
          <Label className="text-xs">Medicamento (em estoque) *</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger><SelectValue placeholder={products.length ? "Selecione um medicamento" : "Nenhum produto em estoque"} /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground ml-1">({p.stock} {p.unit ?? "un"})</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Input placeholder="Dosagem (ex: 1 comp.)" value={dosage} onChange={(e) => setDosage(e.target.value)} />
        <Input placeholder="Frequência (ex: 12/12h)" value={frequency} onChange={(e) => setFrequency(e.target.value)} />
        <Input placeholder="Duração (ex: 7 dias)" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>
      <Button size="sm" onClick={add} disabled={saving || !productId}>
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

// ============ Exames ============
function ExamesTab({ patient }: { patient: PatientLite | undefined | null }) {
  const qc = useQueryClient();
  const { patientId } = Route.useParams();
  const [form, setForm] = useState({ name: "", requested: "", result: "", notes: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["exames", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("exames").select("*").eq("patient_id", patientId).order("date", { ascending: false });
      if (error) throw error; return data;
    },
  });

  async function save() {
    if (!form.name.trim()) { toast.error("Informe o nome do exame"); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("exames").insert({
      patient_id: patientId, vet_id: user?.id ?? null,
      name: form.name, requested: form.requested || null, result: form.result || null, notes: form.notes || null,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", requested: "", result: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["exames", patientId] });
    toast.success("Exame registrado");
  }

  return (
    <div className="space-y-4 pt-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Novo exame</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>Nome do exame *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Hemograma completo" /></div>
          <div><Label>Solicitação</Label><Textarea rows={3} value={form.requested} onChange={(e) => setForm({ ...form, requested: e.target.value })} placeholder="Exames solicitados / orientações" /></div>
          <div><Label>Resultado / observações</Label><Textarea rows={3} value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} /></div>
          <Button onClick={save}><Plus className="w-4 h-4 mr-1" />Salvar exame</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {items.map((e) => (
          <Card key={e.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <div className="font-semibold">{e.name}</div>
                  <div className="text-xs text-muted-foreground">{format(new Date(e.date), "dd/MM/yyyy 'às' HH:mm")}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => printExame(patient, e.name, e.requested ?? "", e.result ?? "")}>
                    <Printer className="w-3 h-3 mr-1" />Imprimir
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("exames").delete().eq("id", e.id); qc.invalidateQueries({ queryKey: ["exames", patientId] }); }}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
              {e.requested && <div className="text-sm border-t pt-2"><strong>Solicitado:</strong> {e.requested}</div>}
              {e.result && <div className="text-sm"><strong>Resultado:</strong> {e.result}</div>}
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Nenhum exame registrado.</div>}
      </div>
    </div>
  );
}

// ============ Prescrições (standalone) ============
function PrescricoesTab({ patient }: { patient: PatientLite | undefined | null }) {
  const qc = useQueryClient();
  const { patientId } = Route.useParams();
  const { data: products = [] } = useStockProducts();
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<{ product_id: string; product_name: string; dosage: string; frequency: string; duration: string }[]>([]);
  const [item, setItem] = useState({ product_id: "", dosage: "", frequency: "", duration: "" });

  const { data: prescs = [] } = useQuery({
    queryKey: ["prescricoes", patientId],
    queryFn: async () => {
      const { data, error } = await supabase.from("prescricoes").select("*, prescricao_items(*)").eq("patient_id", patientId).order("date", { ascending: false });
      if (error) throw error; return data;
    },
  });

  function addItem() {
    const p = products.find((x) => x.id === item.product_id);
    if (!p) return toast.error("Selecione um medicamento");
    setDraft([...draft, { product_id: p.id, product_name: p.name, dosage: item.dosage, frequency: item.frequency, duration: item.duration }]);
    setItem({ product_id: "", dosage: "", frequency: "", duration: "" });
  }

  async function save() {
    if (draft.length === 0) return toast.error("Adicione ao menos um medicamento");
    const { data: { user } } = await supabase.auth.getUser();
    const { data: presc, error } = await supabase.from("prescricoes").insert({ patient_id: patientId, vet_id: user?.id ?? null, notes: notes || null }).select().single();
    if (error || !presc) return toast.error(error?.message ?? "Erro");
    const { error: e2 } = await supabase.from("prescricao_items").insert(draft.map((d) => ({ ...d, prescricao_id: presc.id })));
    if (e2) return toast.error(e2.message);
    setDraft([]); setNotes("");
    qc.invalidateQueries({ queryKey: ["prescricoes", patientId] });
    toast.success("Prescrição salva");
  }

  return (
    <div className="space-y-4 pt-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Nova prescrição</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-end">
            <div>
              <Label className="text-xs">Medicamento *</Label>
              <Select value={item.product_id} onValueChange={(v) => setItem({ ...item, product_id: v })}>
                <SelectTrigger><SelectValue placeholder={products.length ? "Selecione" : "Nenhum em estoque"} /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit ?? "un"})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Input placeholder="Dosagem" value={item.dosage} onChange={(e) => setItem({ ...item, dosage: e.target.value })} />
            <Input placeholder="Frequência" value={item.frequency} onChange={(e) => setItem({ ...item, frequency: e.target.value })} />
            <Input placeholder="Duração" value={item.duration} onChange={(e) => setItem({ ...item, duration: e.target.value })} />
            <Button type="button" size="sm" onClick={addItem} disabled={!item.product_id}><Plus className="w-4 h-4" /></Button>
          </div>

          {draft.length > 0 && (
            <ul className="text-sm border rounded-md divide-y">
              {draft.map((d, idx) => (
                <li key={idx} className="px-3 py-2 flex justify-between items-center">
                  <span><strong>{d.product_name}</strong> {d.dosage && <>— {d.dosage}</>} {d.frequency && <>• {d.frequency}</>} {d.duration && <>• {d.duration}</>}</span>
                  <button onClick={() => setDraft(draft.filter((_, i) => i !== idx))}><Trash2 className="w-3 h-3 text-destructive" /></button>
                </li>
              ))}
            </ul>
          )}

          <Textarea rows={2} placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Button onClick={save} disabled={draft.length === 0}><FileSignature className="w-4 h-4 mr-1" />Salvar prescrição</Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {prescs.map((p: any) => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between items-start gap-3">
                <div className="text-sm text-muted-foreground">{format(new Date(p.date), "dd/MM/yyyy 'às' HH:mm")} • {p.prescricao_items?.length ?? 0} item(ns)</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => printReceituarioItems(patient, p.prescricao_items ?? [], p.notes ?? "")}><Printer className="w-3 h-3 mr-1" />Imprimir</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("prescricoes").delete().eq("id", p.id); qc.invalidateQueries({ queryKey: ["prescricoes", patientId] }); }}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                </div>
              </div>
              <ul className="text-sm border-t pt-2 space-y-1">
                {(p.prescricao_items ?? []).map((i: any) => (
                  <li key={i.id}><strong>{i.product_name}</strong> {i.dosage && <>— {i.dosage}</>} {i.frequency && <>• {i.frequency}</>} {i.duration && <>• {i.duration}</>}</li>
                ))}
              </ul>
              {p.notes && <div className="text-xs text-muted-foreground border-t pt-2">{p.notes}</div>}
            </CardContent>
          </Card>
        ))}
        {prescs.length === 0 && <div className="text-sm text-muted-foreground text-center py-8">Nenhuma prescrição registrada.</div>}
      </div>
    </div>
  );
}

// ============ Receituários ============
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
                  <Button size="sm" variant="outline" onClick={() => r.kind === "especial" ? printReceituarioEspecial(patient, r.content) : printReceituarioComum(patient, r.content)}>
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
                  <Button size="sm" variant="outline" onClick={() => printAtestado(patient, a.content, a.days)}>
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

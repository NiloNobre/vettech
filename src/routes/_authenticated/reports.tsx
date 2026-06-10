import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { BarChart3, Printer } from "lucide-react";
import { printReport } from "@/lib/print-docs";

export const Route = createFileRoute("/_authenticated/reports")({ component: Reports });

function Reports() {
  const { roles } = useAuth();
  if (!roles.includes("admin")) {
    return <div className="text-center py-12 text-muted-foreground">Acesso restrito a administradores.</div>;
  }

  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const start = new Date(); start.setDate(start.getDate() - 30);
      const [clients, patients, consultations, queue] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase.from("patients").select("*", { count: "exact", head: true }),
        supabase.from("consultations").select("id, date").gte("date", start.toISOString()),
        supabase.from("queue").select("status"),
      ]);
      const byDay: Record<string, number> = {};
      (consultations.data ?? []).forEach((c) => {
        const d = new Date(c.date).toLocaleDateString("pt-BR");
        byDay[d] = (byDay[d] ?? 0) + 1;
      });
      const queueByStatus: Record<string, number> = {};
      (queue.data ?? []).forEach((q) => { queueByStatus[q.status] = (queueByStatus[q.status] ?? 0) + 1; });
      return {
        clients: clients.count ?? 0,
        patients: patients.count ?? 0,
        consultations30: consultations.data?.length ?? 0,
        byDay, queueByStatus,
      };
    },
  });

  function exportPdf() {
    if (!data) return;
    const days = Object.entries(data.byDay).sort().map(([d, n]) => `<tr><td>${d}</td><td style="text-align:right">${n}</td></tr>`).join("");
    const html = `
      <div class="grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="field"><span class="label">Clientes</span><span class="value">${data.clients}</span></div>
        <div class="field"><span class="label">Pacientes</span><span class="value">${data.patients}</span></div>
        <div class="field"><span class="label">Atendimentos (30d)</span><span class="value">${data.consultations30}</span></div>
        <div class="field"><span class="label">Na fila</span><span class="value">${(data.queueByStatus.waiting ?? 0) + (data.queueByStatus.called ?? 0)}</span></div>
      </div>
      <div class="body-box items" style="min-height:auto"><table class="items"><thead><tr><th>Data</th><th style="text-align:right">Atendimentos</th></tr></thead><tbody>${days || `<tr><td colspan="2" style="padding:18px;text-align:center;color:#6B7280">Sem dados</td></tr>`}</tbody></table></div>`;
    printReport("Relatório de gestão", "Visão geral dos últimos 30 dias", html);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Relatórios</h1>
          <p className="text-muted-foreground text-sm">Visão geral dos últimos 30 dias.</p>
        </div>
        <Button onClick={exportPdf} variant="outline"><Printer className="w-4 h-4 mr-2" />Imprimir / Exportar PDF</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total de clientes" value={data?.clients ?? 0} />
        <Stat label="Total de pacientes" value={data?.patients ?? 0} />
        <Stat label="Atendimentos (30d)" value={data?.consultations30 ?? 0} />
        <Stat label="Na fila" value={(data?.queueByStatus.waiting ?? 0) + (data?.queueByStatus.called ?? 0)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Atendimentos por dia</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            {Object.entries(data?.byDay ?? {}).sort().map(([d, n]) => (
              <div key={d} className="flex items-center gap-2">
                <span className="w-24 text-muted-foreground">{d}</span>
                <div className="flex-1 bg-muted rounded h-3 overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: `${Math.min(100, n * 10)}%` }} />
                </div>
                <span className="w-8 text-right">{n}</span>
              </div>
            ))}
            {!Object.keys(data?.byDay ?? {}).length && <div className="text-muted-foreground">Sem atendimentos.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

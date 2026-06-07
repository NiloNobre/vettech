import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { PawPrint } from "lucide-react";

export const Route = createFileRoute("/painel")({
  ssr: false,
  component: PainelTV,
});

interface Row { id: string; status: string; room: string | null; called_at: string | null; patients?: { name: string; species: string; clients?: { full_name: string } | null } | null; }

function PainelTV() {
  const qc = useQueryClient();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const ch = supabase.channel("queue-tv")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" },
        () => qc.invalidateQueries({ queryKey: ["queue-tv"] }))
      .subscribe();
    return () => { clearInterval(t); supabase.removeChannel(ch); };
  }, [qc]);

  const { data = [] } = useQuery({
    queryKey: ["queue-tv"],
    queryFn: async () => {
      const { data: q, error } = await supabase
        .from("queue")
        .select("id, status, room, called_at, patient_id")
        .in("status", ["waiting", "called"])
        .order("called_at", { ascending: false, nullsFirst: false })
        .order("created_at");
      if (error) throw error;
      const rows = q ?? [];
      const patientIds = Array.from(new Set(rows.map((r) => r.patient_id).filter(Boolean)));
      if (patientIds.length === 0) return [] as Row[];
      const { data: pats } = await supabase
        .from("patients")
        .select("id, name, species, client_id")
        .in("id", patientIds);
      const clientIds = Array.from(new Set((pats ?? []).map((p) => p.client_id).filter(Boolean)));
      const { data: cls } = clientIds.length
        ? await supabase.from("clients").select("id, full_name").in("id", clientIds)
        : { data: [] as { id: string; full_name: string }[] };
      const patMap = new Map((pats ?? []).map((p) => [p.id, p]));
      const clMap = new Map((cls ?? []).map((c) => [c.id, c]));
      return rows.map((r) => {
        const p = patMap.get(r.patient_id);
        const c = p ? clMap.get(p.client_id) : undefined;
        return {
          id: r.id,
          status: r.status,
          room: r.room,
          called_at: r.called_at,
          patients: p ? { name: p.name, species: p.species, clients: c ? { full_name: c.full_name } : null } : null,
        } as Row;
      });
    },
    refetchInterval: 5000,
  });


  const called = data.filter((r) => r.status === "called");
  const waiting = data.filter((r) => r.status === "waiting");
  const current = called[0];

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground p-8 flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sidebar-primary flex items-center justify-center">
            <PawPrint className="w-7 h-7 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">SCV</div>
            <div className="text-sm opacity-70">Painel de chamada</div>
          </div>
        </div>
        <div className="text-3xl font-mono">{now.toLocaleTimeString("pt-BR")}</div>
      </header>

      <main className="flex-1 grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 flex flex-col items-center justify-center bg-sidebar-accent rounded-3xl p-10 text-center">
          {current ? (
            <>
              <div className="text-xl opacity-70 uppercase tracking-widest mb-4 animate-pulse">Chamando agora</div>
              <div className="text-6xl md:text-8xl font-extrabold mb-2">{current.patients?.name}</div>
              <div className="text-2xl opacity-80 mb-1">{current.patients?.species}</div>
              <div className="text-xl opacity-70 mb-8">Tutor(a): <span className="font-semibold">{current.patients?.clients?.full_name ?? "—"}</span></div>
              <div className="inline-block bg-sidebar-primary text-sidebar-primary-foreground text-4xl font-bold px-8 py-4 rounded-2xl">
                → {current.room ?? "Consultório"}
              </div>
            </>
          ) : (
            <div className="text-3xl opacity-60">Aguardando próximo paciente…</div>
          )}
        </section>

        <aside className="bg-sidebar-accent rounded-3xl p-6">
          <h2 className="text-xl font-semibold mb-4 opacity-80">Próximos</h2>
          <ul className="space-y-3">
            {waiting.slice(0, 8).map((r) => (
              <li key={r.id} className="bg-sidebar/40 rounded-xl px-4 py-3">
                <div className="font-semibold text-lg">{r.patients?.name}</div>
                <div className="text-xs opacity-70">{r.patients?.species}</div>
                <div className="text-xs opacity-60 mt-0.5">Tutor: {r.patients?.clients?.full_name ?? "—"}</div>
              </li>
            ))}
            {waiting.length === 0 && <li className="opacity-60 text-sm">Nenhum paciente aguardando.</li>}
          </ul>
        </aside>
      </main>
    </div>
  );
}

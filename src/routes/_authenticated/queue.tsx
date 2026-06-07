import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Check, X, Tv } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/queue")({ component: QueuePage });

interface QueueRow {
  id: string; patient_id: string; status: string; reason: string | null;
  room: string | null; created_at: string; called_at: string | null;
  patients?: { name: string; species: string; clients?: { full_name: string } | null } | null;
}

function QueuePage() {
  const qc = useQueryClient();
  const [room, setRoom] = useState("Consultório 1");

  useEffect(() => {
    const ch = supabase.channel("queue-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" },
        () => qc.invalidateQueries({ queryKey: ["queue"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const { data = [] } = useQuery({
    queryKey: ["queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue")
        .select("*, patients(name, species, clients(full_name))")
        .in("status", ["waiting", "called", "in_consult"])
        .order("priority", { ascending: false })
        .order("created_at");
      if (error) throw error;
      return data as QueueRow[];
    },
  });

  type QueuePatch = Partial<{ status: "waiting" | "called" | "in_consult" | "done" | "cancelled"; room: string | null; called_at: string | null }>;
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: QueuePatch }) => {
      const { error } = await supabase.from("queue").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["queue"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Fila de Chamada</h1>
          <p className="text-sm text-muted-foreground">Chame pacientes para o consultório em tempo real.</p>
        </div>
        <a href="/painel" target="_blank" rel="noreferrer">
          <Button variant="outline"><Tv className="w-4 h-4 mr-2" />Abrir Painel TV</Button>
        </a>
      </div>

      <Card>
        <CardContent className="p-4 flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Label>Consultório / Sala</Label>
            <Input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Ex: Consultório 1" />
          </div>
          <span className="text-xs text-muted-foreground">Definido ao chamar paciente</span>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {data.map((q) => (
          <Card key={q.id} className={q.status === "called" ? "border-primary border-2" : ""}>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">{q.patients?.name}</span>
                  <Badge variant={q.status === "called" ? "default" : q.status === "in_consult" ? "secondary" : "outline"}>
                    {q.status === "waiting" ? "Aguardando" : q.status === "called" ? "Chamado" : "Em atendimento"}
                  </Badge>
                  {q.room && <span className="text-xs text-muted-foreground">→ {q.room}</span>}
                </div>
                <div className="text-xs text-muted-foreground">
                  {q.patients?.species} • Tutor: {q.patients?.clients?.full_name ?? "—"}
                </div>
              </div>
              <div className="flex gap-1">
                {q.status === "waiting" && (
                  <Button size="sm" onClick={() => update.mutate({ id: q.id, patch: { status: "called", room, called_at: new Date().toISOString() } })}>
                    <Megaphone className="w-4 h-4 mr-1" /> Chamar
                  </Button>
                )}
                {q.status === "called" && (
                  <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: q.id, patch: { status: "in_consult" } })}>
                    <Check className="w-4 h-4 mr-1" /> Iniciar
                  </Button>
                )}
                {q.status === "in_consult" && (
                  <Button size="sm" variant="secondary" onClick={() => update.mutate({ id: q.id, patch: { status: "done" } })}>
                    Finalizar
                  </Button>
                )}
                <Button size="icon" variant="ghost" onClick={() => update.mutate({ id: q.id, patch: { status: "cancelled" } })}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-12">
            Nenhum paciente na fila. Vá em <strong>Pacientes</strong> e use "Para consulta".
          </div>
        )}
      </div>
    </div>
  );
}

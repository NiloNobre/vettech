import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, PawPrint, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/prontuarios/")({ component: ProntuariosIndex });

function ProntuariosIndex() {
  const [search, setSearch] = useState("");

  const { data = [] } = useQuery({
    queryKey: ["prontuario-patients", search],
    queryFn: async () => {
      let q = supabase.from("patients").select("id, name, species, breed, clients(full_name)").order("name");
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Prontuários</h1>
        <p className="text-sm text-muted-foreground">Selecione o paciente para acessar o prontuário.</p>
      </div>
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <Input placeholder="Buscar paciente…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>
      <div className="grid gap-2">
        {data.map((p) => (
          <Link key={p.id} to="/prontuarios/$patientId" params={{ patientId: p.id }}>
            <Card className="hover:bg-accent/30 transition cursor-pointer">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center"><PawPrint className="w-5 h-5" /></div>
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.species}{p.breed ? ` • ${p.breed}` : ""} • Tutor: {p.clients?.full_name ?? "—"}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost"><ClipboardList className="w-4 h-4" /></Button>
              </CardContent>
            </Card>
          </Link>
        ))}
        {data.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">Nenhum paciente.</div>}
      </div>
    </div>
  );
}

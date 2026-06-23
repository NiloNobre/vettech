import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { PawPrint, Volume2, VolumeX } from "lucide-react";

export const Route = createFileRoute("/painel")({
  ssr: false,
  component: PainelTV,
});

interface Row {
  id: string;
  status: string;
  room: string | null;
  called_at: string | null;
  patient_name: string | null;
  patient_species: string | null;
  tutor_name: string | null;
}

// Short notification beep using WebAudio
function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const playTone = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    playTone(880, 0, 0.18);
    playTone(1320, 0.2, 0.22);
    setTimeout(() => ctx.close(), 1200);
  } catch {
    /* ignore */
  }
}

function speak(text: string) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "pt-BR";
    utter.rate = 0.95;
    utter.pitch = 1;
    const voices = synth.getVoices();
    const ptVoice = voices.find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (ptVoice) utter.voice = ptVoice;
    synth.speak(utter);
  } catch {
    /* ignore */
  }
}

function PainelTV() {
  const qc = useQueryClient();
  const [now, setNow] = useState(new Date());
  const [soundOn, setSoundOn] = useState(false);
  const lastAnnouncedRef = useRef<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const ch = supabase
      .channel("queue-tv")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () =>
        qc.invalidateQueries({ queryKey: ["queue-tv"] }),
      )
      .subscribe();
    // Pre-load voices (some browsers populate async)
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
    return () => {
      clearInterval(t);
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const { data = [] } = useQuery({
    queryKey: ["queue-tv"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queue_panel")
        .select("id, status, room, called_at, patient_name, patient_species, tutor_name")
        .in("status", ["waiting", "called"])
        .order("called_at", { ascending: false, nullsFirst: false })
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 5000,
  });

  const called = data.filter((r) => r.status === "called");
  const waiting = data.filter((r) => r.status === "waiting");
  const current = called[0];

  // Announce when a new call arrives
  useEffect(() => {
    if (!current) return;
    const key = `${current.id}:${current.called_at ?? ""}`;
    if (lastAnnouncedRef.current === key) return;
    // Skip the very first render so we don't shout on page load
    if (lastAnnouncedRef.current === null) {
      lastAnnouncedRef.current = key;
      return;
    }
    lastAnnouncedRef.current = key;
    if (!soundOn) return;
    playBeep();
    const room = current.room ?? "consultório";
    const tutor = current.tutor_name ?? "";
    const phrase = `Atenção. ${current.patient_name ?? "Paciente"}${tutor ? `, tutor ${tutor}` : ""}, dirija-se ao ${room}.`;
    setTimeout(() => speak(phrase), 700);
    setTimeout(() => speak(phrase), 5000);
  }, [current, soundOn]);

  function enableSound() {
    setSoundOn(true);
    // Unlock audio with a silent beep on user gesture
    playBeep();
    speak("Painel de chamadas ativo.");
  }

  return (
    <div className="min-h-screen bg-sidebar text-sidebar-foreground p-8 flex flex-col">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-sidebar-primary flex items-center justify-center">
            <PawPrint className="w-7 h-7 text-sidebar-primary-foreground" />
          </div>
          <div>
            <div className="text-2xl font-bold">VetTECH</div>
            <div className="text-sm opacity-70">Painel de chamada</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!soundOn ? (
            <button
              onClick={enableSound}
              className="flex items-center gap-2 bg-sidebar-primary text-sidebar-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90"
            >
              <VolumeX className="w-4 h-4" /> Ativar som
            </button>
          ) : (
            <div className="flex items-center gap-2 opacity-80 text-sm">
              <Volume2 className="w-4 h-4" /> Som ativo
            </div>
          )}
          <div className="text-3xl font-mono">{now.toLocaleTimeString("pt-BR")}</div>
        </div>
      </header>

      <main className="flex-1 grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 flex flex-col items-center justify-center bg-sidebar-accent rounded-3xl p-10 text-center">
          {current ? (
            <>
              <div className="text-xl opacity-70 uppercase tracking-widest mb-4 animate-pulse">
                Chamando agora
              </div>
              <div className="text-6xl md:text-8xl font-extrabold mb-2">
                {current.patient_name ?? "—"}
              </div>
              <div className="text-2xl opacity-80 mb-1">{current.patient_species}</div>
              <div className="text-xl opacity-70 mb-8">
                Tutor(a): <span className="font-semibold">{current.tutor_name ?? "—"}</span>
              </div>

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
                <div className="font-semibold text-lg">{r.patient_name}</div>
                <div className="text-xs opacity-70">{r.patient_species}</div>
                <div className="text-xs opacity-60 mt-0.5">Tutor: {r.tutor_name ?? "—"}</div>
              </li>
            ))}
            {waiting.length === 0 && (
              <li className="opacity-60 text-sm">Nenhum paciente aguardando.</li>
            )}
          </ul>
        </aside>
      </main>
      {!soundOn && (
        <div className="mt-6 text-center text-sm opacity-70">
          Clique em <strong>Ativar som</strong> para liberar a chamada por voz (exigência do
          navegador).
        </div>
      )}
    </div>
  );
}

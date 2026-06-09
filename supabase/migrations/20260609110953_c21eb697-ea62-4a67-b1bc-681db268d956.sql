
-- Receituários (comum / especial)
CREATE TABLE public.receituarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vet_id uuid REFERENCES auth.users(id),
  kind text NOT NULL DEFAULT 'comum' CHECK (kind IN ('comum','especial')),
  content text NOT NULL,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.receituarios TO authenticated;
GRANT ALL ON public.receituarios TO service_role;
ALTER TABLE public.receituarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receituarios all auth" ON public.receituarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER t_rec_upd BEFORE UPDATE ON public.receituarios FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Atestados
CREATE TABLE public.atestados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vet_id uuid REFERENCES auth.users(id),
  content text NOT NULL,
  days int,
  date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.atestados TO authenticated;
GRANT ALL ON public.atestados TO service_role;
ALTER TABLE public.atestados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "atestados all auth" ON public.atestados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER t_atst_upd BEFORE UPDATE ON public.atestados FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Vacinas
CREATE TABLE public.vacinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vet_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  manufacturer text,
  batch text,
  application_date date NOT NULL DEFAULT now(),
  next_dose_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vacinas TO authenticated;
GRANT ALL ON public.vacinas TO service_role;
ALTER TABLE public.vacinas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vacinas all auth" ON public.vacinas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER t_vac_upd BEFORE UPDATE ON public.vacinas FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

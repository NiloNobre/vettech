
CREATE TABLE public.exames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vet_id uuid,
  date timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  requested text,
  result text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exames TO authenticated;
GRANT ALL ON public.exames TO service_role;
ALTER TABLE public.exames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exames all auth" ON public.exames FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.prescricoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vet_id uuid,
  date timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescricoes TO authenticated;
GRANT ALL ON public.prescricoes TO service_role;
ALTER TABLE public.prescricoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescricoes all auth" ON public.prescricoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.prescricao_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescricao_id uuid NOT NULL REFERENCES public.prescricoes(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  dosage text,
  frequency text,
  duration text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescricao_items TO authenticated;
GRANT ALL ON public.prescricao_items TO service_role;
ALTER TABLE public.prescricao_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescricao_items all auth" ON public.prescricao_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

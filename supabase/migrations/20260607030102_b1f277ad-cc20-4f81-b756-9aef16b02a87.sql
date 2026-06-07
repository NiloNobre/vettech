
CREATE OR REPLACE VIEW public.queue_panel AS
SELECT
  q.id,
  q.status,
  q.room,
  q.called_at,
  q.created_at,
  p.name AS patient_name,
  p.species AS patient_species,
  c.full_name AS tutor_name
FROM public.queue q
LEFT JOIN public.patients p ON p.id = q.patient_id
LEFT JOIN public.clients c ON c.id = p.client_id;

GRANT SELECT ON public.queue_panel TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

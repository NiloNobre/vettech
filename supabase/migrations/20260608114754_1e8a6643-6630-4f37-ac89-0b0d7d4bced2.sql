
CREATE TABLE public.access_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  modules text[] NOT NULL DEFAULT '{}',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.access_profiles TO authenticated;
GRANT ALL ON public.access_profiles TO service_role;
ALTER TABLE public.access_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated read profiles" ON public.access_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage profiles" ON public.access_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_access_profiles_updated BEFORE UPDATE ON public.access_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.user_access_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.access_profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_access_profiles TO authenticated;
GRANT ALL ON public.user_access_profiles TO service_role;
ALTER TABLE public.user_access_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user sees own assignment" ON public.user_access_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage assignments" ON public.user_access_profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed system profiles
INSERT INTO public.access_profiles (name, description, modules, is_system) VALUES
  ('Administrador', 'Acesso total a todos os módulos do sistema', ARRAY['dashboard','clients','patients','queue','prontuarios','users','profiles','reports','products','stock_movements','stock_reports'], true),
  ('Veterinário', 'Acesso ao módulo de atendimento e estoque', ARRAY['dashboard','queue','prontuarios','products','stock_movements','stock_reports'], true),
  ('Recepção', 'Acesso ao cadastro de clientes e pacientes', ARRAY['dashboard','clients','patients'], true);

-- Migrate existing users from user_roles to profiles
INSERT INTO public.user_access_profiles (user_id, profile_id)
SELECT DISTINCT ur.user_id, ap.id FROM public.user_roles ur
JOIN public.access_profiles ap ON ap.name = CASE
  WHEN ur.role = 'admin' THEN 'Administrador'
  WHEN ur.role = 'vet' THEN 'Veterinário'
  ELSE 'Recepção'
END
WHERE ur.user_id NOT IN (SELECT user_id FROM public.user_access_profiles)
ON CONFLICT (user_id) DO NOTHING;

-- Helper to get modules of a user
CREATE OR REPLACE FUNCTION public.get_user_modules(_uid uuid)
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(ap.modules, '{}'::text[])
  FROM public.user_access_profiles uap
  JOIN public.access_profiles ap ON ap.id = uap.profile_id
  WHERE uap.user_id = _uid
$$;

-- Update new-user trigger: assign Recepção profile by default; first user gets Administrador
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  user_count int;
  prof_id uuid;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    SELECT id INTO prof_id FROM public.access_profiles WHERE name = 'Administrador';
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'reception');
    SELECT id INTO prof_id FROM public.access_profiles WHERE name = 'Recepção';
  END IF;
  IF prof_id IS NOT NULL THEN
    INSERT INTO public.user_access_profiles (user_id, profile_id) VALUES (NEW.id, prof_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

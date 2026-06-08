import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

type Role = "admin" | "vet" | "reception";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  roles: Role[];
  modules: string[];
  profileName: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, session: null, roles: [], modules: [], profileName: null,
  loading: true, signOut: async () => {}, refreshAccess: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<string[]>([]);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAccess(uid: string) {
    const [{ data: rolesData }, { data: assign }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase
        .from("user_access_profiles")
        .select("access_profiles(name, modules)")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);
    setRoles((rolesData ?? []).map((r: any) => r.role as Role));
    const ap: any = (assign as any)?.access_profiles;
    setModules(ap?.modules ?? []);
    setProfileName(ap?.name ?? null);
  }

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => loadAccess(s.user.id), 0);
      } else {
        setRoles([]); setModules([]); setProfileName(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) loadAccess(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{
      user: session?.user ?? null,
      session, roles, modules, profileName, loading,
      signOut: async () => { await supabase.auth.signOut(); },
      refreshAccess: async () => { if (session?.user) await loadAccess(session.user.id); },
    }}>{children}</Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

export const listProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("access_profiles")
      .select("id, name, description, modules, is_system, created_at")
      .order("is_system", { ascending: false })
      .order("name");
    if (error) throw error;
    return data ?? [];
  });

export const createProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; description?: string; modules: string[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin
      .from("access_profiles")
      .insert({
        name: data.name,
        description: data.description ?? null,
        modules: data.modules,
        is_system: false,
      })
      .select()
      .single();
    if (error) throw error;
    return created;
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name: string; description?: string; modules: string[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("access_profiles")
      .update({ name: data.name, description: data.description ?? null, modules: data.modules })
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("access_profiles")
      .select("is_system")
      .eq("id", data.id)
      .single();
    if (prof?.is_system) throw new Error("Perfis do sistema não podem ser excluídos.");
    const { count } = await supabaseAdmin
      .from("user_access_profiles")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", data.id);
    if ((count ?? 0) > 0) throw new Error("Existem usuários vinculados a este perfil.");
    const { error } = await supabaseAdmin.from("access_profiles").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const assignUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; profile_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_access_profiles")
      .upsert({ user_id: data.user_id, profile_id: data.profile_id }, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso negado: apenas administradores.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw error;
    const ids = list.users.map((u) => u.id);
    const safeIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
    const [{ data: profilesData }, { data: assigns }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, full_name").in("id", safeIds),
      supabaseAdmin.from("user_access_profiles")
        .select("user_id, profile_id, access_profiles(name)").in("user_id", safeIds),
    ]);
    const profMap = new Map((profilesData ?? []).map((p: any) => [p.id, p.full_name]));
    const assignMap = new Map((assigns ?? []).map((a: any) => [
      a.user_id, { profile_id: a.profile_id, profile_name: a.access_profiles?.name ?? null },
    ]));
    return list.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      full_name: (profMap.get(u.id) as string) ?? "",
      profile_id: assignMap.get(u.id)?.profile_id ?? null,
      profile_name: assignMap.get(u.id)?.profile_name ?? null,
      created_at: u.created_at,
    }));
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; full_name: string; profile_id: string; is_admin?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw error;
    const uid = created.user!.id;
    // Reset roles assigned by trigger
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    if (data.is_admin) {
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    }
    await supabaseAdmin.from("profiles").upsert({ id: uid, full_name: data.full_name });
    await supabaseAdmin.from("user_access_profiles")
      .upsert({ user_id: uid, profile_id: data.profile_id }, { onConflict: "user_id" });
    return { id: uid };
  });

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; is_admin: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.is_admin) {
      await supabaseAdmin.from("user_roles").upsert({ user_id: data.user_id, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      if (data.user_id === context.userId) throw new Error("Não é possível remover o próprio acesso de administrador.");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id).eq("role", "admin");
    }
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.user_id === context.userId) throw new Error("Não é possível excluir o próprio usuário.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw error;
    return { ok: true };
  });

export const listAdminUserIds = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    return (data ?? []).map((r: any) => r.user_id as string);
  });

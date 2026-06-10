import { createServerClient as _createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database.types";

export async function createClient() {
  const cookieStore = await cookies();
  return _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

/** Alias so page files can import { createServerClient } */
export const createServerClient = createClient;

/** Service role client — server-only, never expose to browser */
export function createServiceClient() {
  const { createClient } = require("@supabase/supabase-js");
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Returns { userId, orgId } for the current session.
 * Uses the anon client so it respects auth but reads only the caller's own profile row
 * (profiles policy: id = auth.uid() — no recursion risk).
 * Use this to get orgId, then query data with createServiceClient() + explicit org filter.
 */
export async function getOrgContext(): Promise<{ userId: string | null; orgId: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, orgId: null };
  const { data } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  return { userId: user.id, orgId: (data as { organization_id: string } | null)?.organization_id ?? null };
}

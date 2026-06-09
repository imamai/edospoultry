"use server";
import { createServiceClient, createServerClient } from "@/lib/supabase/server";

export async function createTenantAction(payload: {
  orgName: string;
  slug: string;
  country: "KE" | "RW" | "UG";
  currency: string;
  orgPhone: string;
  orgEmail: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}): Promise<{ success?: boolean; orgId?: string; orgName?: string; error?: string }> {
  // Verify caller is super_admin
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "super_admin") return { error: "Unauthorized" };

  const service = createServiceClient();

  // 1. Create the organization
  const { data: org, error: orgErr } = await service
    .from("organizations")
    .insert({
      name: payload.orgName,
      slug: payload.slug,
      country: payload.country,
      currency: payload.currency,
      phone: payload.orgPhone || null,
      email: payload.orgEmail || null,
      is_active: true,
    })
    .select()
    .single();

  if (orgErr) return { error: orgErr.message };

  // 2. Invite the owner — Supabase creates auth.users entry immediately and
  //    returns the UUID so we can set up the profile before they accept.
  const { data: invited, error: inviteErr } = await service.auth.admin.inviteUserByEmail(
    payload.ownerEmail,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/set-password`,
      data: {
        organization_id: org.id,
        role: "country_admin",
        full_name: payload.ownerName,
      },
    }
  );

  if (inviteErr || !invited?.user) {
    await service.from("organizations").delete().eq("id", org.id);
    return { error: inviteErr?.message ?? "Failed to invite owner" };
  }

  // 3. Create the profile record linked to the new org
  const { error: profileErr } = await service
    .from("profiles")
    .insert({
      id: invited.user.id,
      organization_id: org.id,
      full_name: payload.ownerName,
      email: payload.ownerEmail,
      phone_number: payload.ownerPhone || null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      role: "country_admin" as any,
      is_active: true,
    });

  if (profileErr) {
    await service.from("organizations").delete().eq("id", org.id);
    return { error: profileErr.message };
  }

  return { success: true, orgId: org.id, orgName: org.name };
}

async function verifySuper() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return p?.role === "super_admin" ? true : null;
}

export async function updateTenantAction(
  orgId: string,
  payload: {
    name: string;
    slug: string;
    country: "KE" | "RW" | "UG";
    currency: string;
    phone?: string;
    email?: string;
    is_active: boolean;
  }
): Promise<{ error?: string }> {
  if (!await verifySuper()) return { error: "Unauthorized" };
  const service = createServiceClient();
  const { error } = await service
    .from("organizations")
    .update({
      name: payload.name,
      slug: payload.slug,
      country: payload.country,
      currency: payload.currency,
      phone: payload.phone || null,
      email: payload.email || null,
      is_active: payload.is_active,
    })
    .eq("id", orgId);
  return error ? { error: error.message } : {};
}

export async function deleteTenantAction(orgId: string): Promise<{ error?: string }> {
  if (!await verifySuper()) return { error: "Unauthorized" };
  const service = createServiceClient();
  // Delete profiles first (breaks FK), then org
  await service.from("profiles").delete().eq("organization_id", orgId);
  const { error } = await service.from("organizations").delete().eq("id", orgId);
  return error ? { error: error.message } : {};
}

export async function resendInviteAction(orgId: string): Promise<{ email?: string; link?: string; error?: string }> {
  if (!await verifySuper()) return { error: "Unauthorized" };
  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("email, full_name")
    .eq("organization_id", orgId)
    .eq("role", "country_admin")
    .single();

  if (!profile?.email) return { error: "No owner found for this tenant" };

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/set-password`;

  // generateLink never sends email — returns a hashed token we use to build
  // our own confirm URL. Bypasses all email rate limits and SMTP config issues.
  const { data: gen, error: genErr } = await service.auth.admin.generateLink({
    type: "recovery",
    email: profile.email,
    options: { redirectTo },
  });

  if (genErr || !gen?.properties?.hashed_token) {
    return { error: genErr?.message ?? "Failed to generate invite link" };
  }

  const link = `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?token_hash=${gen.properties.hashed_token}&type=recovery&next=/set-password`;

  return { email: profile.email, link };
}

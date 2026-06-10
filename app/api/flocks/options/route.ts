import { NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

/** Returns active layer/dual_purpose flocks for the egg recording dropdown */
export async function GET() {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json([], { status: 401 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("farmer_flocks")
    .select("id, flock_code, farmer_id, current_quantity, farmers(full_name)")
    .eq("organization_id", orgId)
    .eq("status", "active")
    .in("bird_category", ["layer", "dual_purpose"])
    .order("flock_code");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

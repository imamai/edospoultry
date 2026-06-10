import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase  = createServiceClient();
  const farmerId  = req.nextUrl.searchParams.get("farmer_id");
  const status    = req.nextUrl.searchParams.get("status");

  let q = supabase
    .from("farmer_flocks")
    .select("id, flock_code, bird_category, status, current_quantity, farmer_id")
    .eq("organization_id", orgId)
    .order("flock_code")
    .limit(500);

  if (farmerId) q = q.eq("farmer_id", farmerId);
  if (status)   q = q.eq("status",    status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

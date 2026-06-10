import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase  = createServiceClient();
  const farmerId  = req.nextUrl.searchParams.get("farmer_id");
  const periodType = req.nextUrl.searchParams.get("period_type");

  let q = supabase
    .from("production_targets")
    .select("id, metric, period_type, period_start, period_end, target_value, actual_value, achievement_pct, unit, farmers(full_name), farmer_flocks(flock_code)")
    .eq("organization_id", orgId)
    .order("period_start", { ascending: false })
    .limit(500);

  if (farmerId)   q = q.eq("farmer_id",   farmerId);
  if (periodType) q = q.eq("period_type", periodType);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { orgId, userId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("production_targets")
    .insert({ ...body, organization_id: orgId, set_by: body.set_by ?? userId })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

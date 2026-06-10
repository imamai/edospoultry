import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase  = createServiceClient();
  const status    = req.nextUrl.searchParams.get("status");
  const severity  = req.nextUrl.searchParams.get("severity");
  const farmerId  = req.nextUrl.searchParams.get("farmer_id");

  let q = supabase
    .from("farm_incidents")
    .select("id, title, incident_type, severity, status, incident_date, affected_birds, estimated_loss_kes, farmers(full_name), farmer_flocks(flock_code)")
    .eq("organization_id", orgId)
    .order("incident_date", { ascending: false })
    .limit(500);

  if (status)   q = q.eq("status",    status);
  if (severity) q = q.eq("severity",  severity);
  if (farmerId) q = q.eq("farmer_id", farmerId);

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
    .from("farm_incidents")
    .insert({ ...body, organization_id: orgId, reported_by: body.reported_by ?? userId })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

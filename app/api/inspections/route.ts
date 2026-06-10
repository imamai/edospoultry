import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase   = createServiceClient();
  const farmerId   = req.nextUrl.searchParams.get("farmer_id");
  const houseId    = req.nextUrl.searchParams.get("house_id");
  const inspType   = req.nextUrl.searchParams.get("inspection_type");

  let q = supabase
    .from("farm_inspections")
    .select("id, inspection_type, inspection_date, score_pct, passed, follow_up_required, follow_up_date, farmers(full_name), poultry_houses(house_name)")
    .eq("organization_id", orgId)
    .order("inspection_date", { ascending: false })
    .limit(500);

  if (farmerId)  q = q.eq("farmer_id", farmerId);
  if (houseId)   q = q.eq("house_id",  houseId);
  if (inspType)  q = q.eq("inspection_type", inspType);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { orgId, userId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const supabase = createServiceClient();
  const clean = { ...body };
  for (const f of ["farmer_id", "house_id", "inspector_id"]) {
    if (clean[f] === "" || clean[f] === undefined) clean[f] = null;
  }
  const { data, error } = await supabase
    .from("farm_inspections")
    .insert({ ...clean, organization_id: orgId, inspector_id: clean.inspector_id ?? userId })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

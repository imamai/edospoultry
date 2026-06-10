import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase   = createServiceClient();
  const farmerId   = req.nextUrl.searchParams.get("farmer_id");

  let q = supabase
    .from("breeding_records")
    .select("id, mating_type, mating_date, hens_mated, cocks_used, hen_cock_ratio, fertility_rate_pct, sire_breed, dam_breed, farmers(full_name)")
    .eq("organization_id", orgId)
    .order("mating_date", { ascending: false })
    .limit(500);

  if (farmerId) q = q.eq("farmer_id", farmerId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("breeding_records")
    .insert({ ...body, organization_id: orgId })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

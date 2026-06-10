import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServiceClient();
  const flockId  = req.nextUrl.searchParams.get("flock_id");
  const farmerId = req.nextUrl.searchParams.get("farmer_id");

  let q = supabase
    .from("flock_expenses")
    .select("*")
    .eq("organization_id", orgId)
    .order("expense_date", { ascending: false })
    .limit(500);

  if (flockId)  q = q.eq("flock_id",  flockId);
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
    .from("flock_expenses")
    .insert({ ...body, organization_id: orgId, recorded_by: body.recorded_by ?? userId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase  = createServiceClient();
  const batchId   = req.nextUrl.searchParams.get("batch_id");

  let q = supabase
    .from("hatchery_eggs")
    .select("id, set_date, tray_number, eggs_loaded, source, grade, candle1_fertile, candle1_infertile, candle1_cracked, candle2_fertile, candle2_dead_in_shell, transferred_to_hatcher, hatchery_batches(batch_code)")
    .eq("organization_id", orgId)
    .order("set_date", { ascending: false })
    .limit(500);

  if (batchId) q = q.eq("batch_id", batchId);

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
    .from("hatchery_eggs")
    .insert({ ...body, organization_id: orgId })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

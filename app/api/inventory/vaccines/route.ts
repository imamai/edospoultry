import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";

export async function GET() {
  const { orgId, userId } = await getOrgContext();
  if (!orgId || !userId) return NextResponse.json([], { status: 401 });

  const supabase = createServiceClient();
  const { data: profile } = await supabase.from("profiles").select("depot_id").eq("id", userId).single();
  const depotId = (profile as { depot_id: string | null } | null)?.depot_id;

  let query = supabase
    .from("vaccine_inventory")
    .select("id, vaccine_name, disease_target, product_code, supplier, quantity_doses, unit_price, batch_number, expiry_date, storage_temp_c, minimum_stock, depot_id, depots(name)")
    .eq("organization_id", orgId)
    .order("vaccine_name");

  if (depotId) query = query.eq("depot_id", depotId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const { orgId, userId } = await getOrgContext();
  if (!orgId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createServiceClient();
  const { data: profile } = await supabase.from("profiles").select("depot_id").eq("id", userId).single();
  const depotId = (profile as { depot_id: string | null } | null)?.depot_id;
  if (!depotId) return NextResponse.json({ error: "No depot assigned to your account." }, { status: 400 });

  const body = await req.json();
  const { data, error } = await supabase
    .from("vaccine_inventory")
    .insert({ ...body, organization_id: orgId, depot_id: depotId })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

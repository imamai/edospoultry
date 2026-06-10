import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase  = createServiceClient();
  const farmerId  = req.nextUrl.searchParams.get("farmer_id");

  let q = supabase
    .from("poultry_houses")
    .select("id, house_name, farmer_id")
    .eq("organization_id", orgId)
    .order("house_name")
    .limit(300);

  if (farmerId) q = q.eq("farmer_id", farmerId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

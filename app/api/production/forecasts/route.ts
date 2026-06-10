import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase  = createServiceClient();
  const farmerId  = req.nextUrl.searchParams.get("farmer_id");
  const metric    = req.nextUrl.searchParams.get("metric");

  let q = supabase
    .from("production_forecasts")
    .select("id, metric, forecast_date, forecast_start, forecast_end, forecasted_value, actual_value, accuracy_pct, unit, farmers(full_name), farmer_flocks(flock_code)")
    .eq("organization_id", orgId)
    .order("forecast_date", { ascending: false })
    .limit(500);

  if (farmerId) q = q.eq("farmer_id", farmerId);
  if (metric)   q = q.eq("metric",    metric);

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
    .from("production_forecasts")
    .insert({ ...body, organization_id: orgId, generated_by: body.generated_by ?? userId })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

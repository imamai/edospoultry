import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ exists: false }, { status: 401 });

  const flockId = req.nextUrl.searchParams.get("flock_id") ?? "";
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!flockId || !date) return NextResponse.json({ exists: false });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("egg_production_records")
    .select("id")
    .eq("organization_id", orgId)
    .eq("flock_id", flockId)
    .eq("production_date", date)
    .maybeSingle();

  return NextResponse.json({ exists: !!data });
}

import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ exists: false }, { status: 401 });

  const idNumber = req.nextUrl.searchParams.get("id") ?? "";
  if (!idNumber) return NextResponse.json({ exists: false });

  const supabase = createServiceClient();
  const { data } = await supabase
    .from("farmers")
    .select("id, full_name")
    .eq("organization_id", orgId)
    .eq("id_number", idNumber)
    .maybeSingle();

  return NextResponse.json({ exists: !!data, farmer: data ?? null });
}

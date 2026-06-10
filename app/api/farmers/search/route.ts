import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json([], { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("farmers")
    .select("id, full_name, phone_number, id_number")
    .eq("organization_id", orgId)
    .or(`full_name.ilike.%${q}%,phone_number.ilike.%${q}%,id_number.ilike.%${q}%`)
    .order("full_name")
    .limit(15);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

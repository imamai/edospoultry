import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase   = createServiceClient();
  const farmerId   = req.nextUrl.searchParams.get("farmer_id");
  const docType    = req.nextUrl.searchParams.get("document_type");
  const docStatus  = req.nextUrl.searchParams.get("status");

  let q = supabase
    .from("farm_documents")
    .select("id, document_type, title, status, issue_date, expiry_date, issued_by, farmers(full_name)")
    .eq("organization_id", orgId)
    .order("expiry_date", { ascending: true })
    .limit(500);

  if (farmerId)  q = q.eq("farmer_id",      farmerId);
  if (docType)   q = q.eq("document_type",  docType);
  if (docStatus) q = q.eq("status",         docStatus);

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
  for (const f of ["farmer_id", "depot_id"]) {
    if (clean[f] === "" || clean[f] === undefined) clean[f] = null;
  }
  const { data, error } = await supabase
    .from("farm_documents")
    .insert({ ...clean, organization_id: orgId, uploaded_by: clean.uploaded_by ?? userId })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

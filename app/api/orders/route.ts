import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const from   = searchParams.get("from");
  const to     = searchParams.get("to");

  const supabase = createServiceClient();

  let q = supabase
    .from("sales_orders")
    .select(`
      id, order_number, order_date, order_type, status, channel,
      total_amount, amount_paid, balance_due, subtotal, discount_amount,
      product_details, notes, created_at,
      farmer:farmers(id, full_name, phone_number),
      agent:profiles!agent_id(id, full_name),
      depot:depots(id, name)
    `)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) q = q.eq("status", status);
  if (from)   q = q.gte("order_date", from);
  if (to)     q = q.lte("order_date", to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { orgId, userId } = await getOrgContext();
  if (!orgId || !userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const supabase = createServiceClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("slug")
    .eq("id", orgId)
    .single();

  const { data: orderNum, error: seqErr } = await supabase.rpc("fn_generate_order_number", {
    org_slug: (org as { slug: string } | null)?.slug ?? "ORG",
  });
  if (seqErr) return NextResponse.json({ error: seqErr.message }, { status: 500 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("depot_id")
    .eq("id", userId)
    .single();

  const depotId = (profile as { depot_id: string | null } | null)?.depot_id;
  if (!depotId) return NextResponse.json({ error: "No depot assigned to your account" }, { status: 400 });

  const { data, error } = await supabase
    .from("sales_orders")
    .insert({
      organization_id: orgId,
      order_number: orderNum as string,
      agent_id: userId,
      depot_id: depotId,
      ...body,
    })
    .select("id, order_number")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

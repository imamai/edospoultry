import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("farm_tasks")
    .select("*, farmers(full_name), farmer_flocks(flock_code), farm_task_assignments(assigned_to, profiles(full_name))")
    .eq("id", params.id).eq("organization_id", orgId).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { orgId, userId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body    = await req.json();
  const supabase = createServiceClient();

  const update: Record<string, unknown> = { ...body };
  if (body.status === "completed" && !body.completed_at) {
    update.completed_at = new Date().toISOString();
    update.completed_by = userId;
  }

  const { error } = await supabase.from("farm_tasks").update(update).eq("id", params.id).eq("organization_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = createServiceClient();
  const { error } = await supabase.from("farm_tasks").delete().eq("id", params.id).eq("organization_id", orgId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

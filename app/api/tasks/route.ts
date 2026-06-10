import { NextRequest, NextResponse } from "next/server";
import { getOrgContext, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { orgId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase  = createServiceClient();
  const status    = req.nextUrl.searchParams.get("status");
  const flockId   = req.nextUrl.searchParams.get("flock_id");
  const farmerId  = req.nextUrl.searchParams.get("farmer_id");

  let q = supabase
    .from("farm_tasks")
    .select(`
      id, title, task_type, priority, status, due_date, due_time, recurrence,
      created_at, completed_at,
      farmers(full_name),
      farmer_flocks(flock_code),
      farm_task_assignments(assigned_to, profiles(full_name))
    `)
    .eq("organization_id", orgId)
    .order("due_date", { ascending: true })
    .limit(500);

  if (status)   q = q.eq("status",    status);
  if (flockId)  q = q.eq("flock_id",  flockId);
  if (farmerId) q = q.eq("farmer_id", farmerId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { orgId, userId } = await getOrgContext();
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body    = await req.json();
  const supabase = createServiceClient();

  // Coerce empty-string optional UUIDs to null so Postgres doesn't reject them
  const UUID_FIELDS = ["farmer_id", "flock_id", "house_id"];
  const clean = { ...body };
  for (const f of UUID_FIELDS) {
    if (clean[f] === "" || clean[f] === undefined) clean[f] = null;
  }

  const { data: task, error } = await supabase
    .from("farm_tasks")
    .insert({ ...clean, organization_id: orgId, created_by: userId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // If assignees array provided, insert into farm_task_assignments
  if (body.assignees?.length) {
    await supabase.from("farm_task_assignments").insert(
      body.assignees.map((uid: string) => ({
        task_id: task.id, assigned_to: uid, assigned_by: userId,
      }))
    );
  }

  return NextResponse.json(task, { status: 201 });
}

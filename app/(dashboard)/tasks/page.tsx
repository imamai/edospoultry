import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const metadata = { title: "Tasks" };

function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high:   "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low:    "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`status-pill ${map[priority] ?? map.low}`}>
      {priority}
    </span>
  );
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();
  const statusFilter = searchParams.status;

  let q = supabase
    .from("farm_tasks")
    .select("id, title, task_type, priority, status, due_date, completed_at, farmers(full_name), farmer_flocks(flock_code)")
    .eq("organization_id", orgId ?? "")
    .order("due_date", { ascending: true })
    .limit(500);

  if (statusFilter) q = q.eq("status", statusFilter);

  const { data: tasks } = orgId ? await q : { data: [] };

  const counts = {
    pending:    (tasks ?? []).filter(t => t.status === "pending").length,
    in_progress:(tasks ?? []).filter(t => t.status === "in_progress").length,
    completed:  (tasks ?? []).filter(t => t.status === "completed").length,
    overdue:    (tasks ?? []).filter(t => t.status === "overdue").length,
  };

  const statusTabs = [
    { key: undefined,      label: "All",         count: tasks?.length ?? 0 },
    { key: "pending",      label: "Pending",      count: counts.pending },
    { key: "in_progress",  label: "In Progress",  count: counts.in_progress },
    { key: "overdue",      label: "Overdue",      count: counts.overdue },
    { key: "completed",    label: "Completed",    count: counts.completed },
  ];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Farm Tasks"
        subtitle={`${tasks?.length ?? 0} tasks`}
        actions={
          <Link
            href="/tasks/new"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> New Task
          </Link>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Pending",     value: counts.pending,     icon: Clock,          color: "text-yellow-600" },
          { label: "In Progress", value: counts.in_progress, icon: AlertCircle,    color: "text-blue-600" },
          { label: "Overdue",     value: counts.overdue,     icon: AlertCircle,    color: "text-red-600" },
          { label: "Completed",   value: counts.completed,   icon: CheckCircle2,   color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <Icon size={20} className={color} />
            <div>
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statusTabs.map(tab => (
          <Link
            key={tab.label}
            href={tab.key ? `/tasks?status=${tab.key}` : "/tasks"}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              statusFilter === tab.key
                ? "bg-edos-600 text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label} <span className="ml-1 opacity-70">{tab.count}</span>
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Title", "Type", "Priority", "Status", "Due Date", "Farmer", "Flock", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!tasks?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No tasks found.{" "}
                    <Link href="/tasks/new" className="text-edos-600 hover:underline">Create the first task</Link>
                  </td>
                </tr>
              ) : (
                tasks.map(task => {
                  const farmer = task.farmers as { full_name: string } | null;
                  const flock  = task.farmer_flocks as { flock_code: string } | null;
                  return (
                    <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{task.title}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{task.task_type?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3"><PriorityBadge priority={task.priority ?? "low"} /></td>
                      <td className="px-4 py-3"><StatusBadge status={task.status ?? "pending"} dot /></td>
                      <td className="px-4 py-3 text-muted-foreground">{task.due_date ? formatDate(task.due_date) : "—"}</td>
                      <td className="px-4 py-3">{farmer?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{flock?.flock_code ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/tasks/${task.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={task.id} apiPath="/api/tasks" label="task" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

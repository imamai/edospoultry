import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatNumber } from "@/lib/utils";
import { Plus, Pencil, AlertTriangle, Shield, CheckCircle } from "lucide-react";

export const metadata = { title: "Incidents" };

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    high:     "bg-orange-100 text-orange-700",
    medium:   "bg-yellow-100 text-yellow-700",
    low:      "bg-green-100 text-green-700",
  };
  return <span className={`status-pill ${map[severity] ?? map.low}`}>{severity}</span>;
}

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: { status?: string; severity?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  let q = supabase
    .from("farm_incidents")
    .select("id, title, incident_type, severity, status, incident_date, affected_birds, estimated_loss_kes, farmers(full_name)")
    .eq("organization_id", orgId ?? "")
    .order("incident_date", { ascending: false })
    .limit(500);

  if (searchParams.status)   q = q.eq("status",   searchParams.status);
  if (searchParams.severity) q = q.eq("severity", searchParams.severity);

  const { data: incidents } = orgId ? await q : { data: [] };

  const open      = (incidents ?? []).filter(i => i.status === "reported" || i.status === "investigating").length;
  const resolved  = (incidents ?? []).filter(i => i.status === "resolved" || i.status === "closed").length;
  const critical  = (incidents ?? []).filter(i => i.severity === "critical").length;
  const totalLoss = (incidents ?? []).reduce((s, i) => s + (i.estimated_loss_kes ?? 0), 0);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Farm Incidents"
        subtitle={`${incidents?.length ?? 0} records`}
        actions={
          <Link
            href="/incidents/new"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> Report Incident
          </Link>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active",        value: open,                  icon: AlertTriangle, color: "text-orange-500" },
          { label: "Critical",      value: critical,              icon: Shield,        color: "text-red-600" },
          { label: "Resolved/Closed",value: resolved,             icon: CheckCircle,   color: "text-green-600" },
          { label: "Est. Loss (Kes)", value: `${formatNumber(totalLoss)}`, icon: AlertTriangle, color: "text-yellow-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <Icon size={20} className={color} />
            <div>
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Severity filter */}
      <div className="flex gap-2 flex-wrap">
        {[undefined, "critical","high","medium","low"].map(sev => (
          <Link
            key={sev ?? "all"}
            href={sev ? `/incidents?severity=${sev}` : "/incidents"}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              searchParams.severity === sev
                ? "bg-edos-600 text-white"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {sev ?? "All Severities"}
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Title","Type","Severity","Status","Date","Affected Birds","Est. Loss (Kes)","Farmer",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!incidents?.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No incidents recorded.{" "}
                    <Link href="/incidents/new" className="text-edos-600 hover:underline">Report one</Link>
                  </td>
                </tr>
              ) : (
                incidents.map(inc => {
                  const farmer = inc.farmers as { full_name: string } | null;
                  return (
                    <tr key={inc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[180px] truncate">{inc.title}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{inc.incident_type?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={inc.severity ?? "low"} /></td>
                      <td className="px-4 py-3"><StatusBadge status={inc.status ?? "open"} dot /></td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(inc.incident_date)}</td>
                      <td className="px-4 py-3 font-mono">{inc.affected_birds != null ? formatNumber(inc.affected_birds) : "—"}</td>
                      <td className="px-4 py-3 font-mono">{inc.estimated_loss_kes != null ? formatNumber(inc.estimated_loss_kes) : "—"}</td>
                      <td className="px-4 py-3">{farmer?.full_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/incidents/${inc.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={inc.id} apiPath="/api/incidents" label="incident" />
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

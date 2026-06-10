import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata = { title: "Flock Health" };

export default async function HealthPage() {
  const { orgId } = await getOrgContext();
  const supabase = createServiceClient();

  const baseClaimsQ = orgId
    ? supabase.from("mortality_claims")
        .select(`
          id, claimed_deaths, actual_deaths, status, cause_of_death,
          created_at,
          farmer_flocks(flock_code, bird_category,
            farmers(full_name, phone_number)
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(30)
    : Promise.resolve({ data: [], error: null });

  const baseVaccQ = orgId
    ? supabase.from("vaccination_schedules")
        .select(`
          id, vaccine_type, scheduled_date, completed_date,
          farmer_flocks(flock_code,
            farmers(full_name)
          )
        `)
        .eq("organization_id", orgId)
        .gte("scheduled_date", new Date().toISOString().slice(0, 10))
        .order("scheduled_date", { ascending: true })
        .limit(20)
    : Promise.resolve({ data: [], error: null });

  const [claims, vaccSched] = await Promise.all([baseClaimsQ, baseVaccQ]);

  const pending = claims.data?.filter(c => c.status === "submitted" || c.status === "under_review") ?? [];
  const approved = claims.data?.filter(c => c.status === "approved") ?? [];
  const totalReported = claims.data?.reduce((s, c) => s + (c.claimed_deaths ?? 0), 0) ?? 0;

  return (
    <div className="page-enter space-y-6">
      <PageHeader title="Flock Health" subtitle="Mortality claims and vaccination tracking" />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Claims", value: pending.length },
          { label: "Approved Claims", value: approved.length },
          { label: "Total Mortality Reported", value: totalReported },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mortality claims */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Mortality Claims</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Flock", "Farmer", "Reported", "Approved", "Cause", "Status", "Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!claims.data?.length ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No claims yet</td></tr>
              ) : (
                claims.data.map(c => {
                  const flock = c.farmer_flocks as { flock_code: string; farmers?: { full_name: string } | null } | null;
                  return (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">{flock?.flock_code ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{flock?.farmers?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">{formatNumber(c.claimed_deaths ?? 0)}</td>
                      <td className="px-4 py-3 font-mono">{c.actual_deaths ? formatNumber(c.actual_deaths) : "—"}</td>
                      <td className="px-4 py-3 text-sm capitalize">{c.cause_of_death?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status ?? "submitted"} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Upcoming vaccinations */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Upcoming Vaccinations</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Vaccine", "Flock", "Farmer", "Scheduled", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!vaccSched.data?.length ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">No upcoming vaccinations</td></tr>
              ) : (
                vaccSched.data.map(v => {
                  const flock = v.farmer_flocks as { flock_code: string; farmers?: { full_name: string } | null } | null;
                  const daysUntil = Math.ceil((new Date(v.scheduled_date).getTime() - Date.now()) / 86400_000);
                  const vaccStatus = v.completed_date ? "completed" : daysUntil < 0 ? "overdue" : "scheduled";
                  return (
                    <tr key={v.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{v.vaccine_type}</td>
                      <td className="px-4 py-3">{flock?.flock_code ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{flock?.farmers?.full_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <p>{formatDate(v.scheduled_date)}</p>
                        <p className={`text-xs ${daysUntil <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {daysUntil === 0 ? "Today" : daysUntil > 0 ? `In ${daysUntil} day(s)` : `${Math.abs(daysUntil)} day(s) ago`}
                        </p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={vaccStatus} /></td>
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

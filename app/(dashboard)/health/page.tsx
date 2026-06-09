import { createServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatNumber } from "@/lib/utils";

export const metadata = { title: "Flock Health" };

export default async function HealthPage() {
  const supabase = await createServerClient();

  const [claims, vaccSched] = await Promise.all([
    supabase.from("mortality_claims")
      .select(`
        id, reported_count, approved_count, claim_status, cause_of_death,
        created_at,
        farmer_flocks(flock_name, bird_category,
          farmers(full_name, phone_number)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("vaccination_schedules")
      .select(`
        id, vaccine_name, scheduled_date, status,
        farmer_flocks(flock_name,
          farmers(full_name)
        )
      `)
      .gte("scheduled_date", new Date().toISOString().slice(0, 10))
      .order("scheduled_date", { ascending: true })
      .limit(20),
  ]);

  const pending = claims.data?.filter(c => c.claim_status === "pending") ?? [];
  const approved = claims.data?.filter(c => c.claim_status === "approved") ?? [];
  const totalReported = claims.data?.reduce((s, c) => s + (c.reported_count ?? 0), 0) ?? 0;

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
                  const flock = c.farmer_flocks as { flock_name: string; farmers?: { full_name: string } | null } | null;
                  return (
                    <tr key={c.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">{flock?.flock_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{flock?.farmers?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">{formatNumber(c.reported_count ?? 0)}</td>
                      <td className="px-4 py-3 font-mono">{c.approved_count ? formatNumber(c.approved_count) : "—"}</td>
                      <td className="px-4 py-3 text-sm capitalize">{c.cause_of_death?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.claim_status ?? "pending"} /></td>
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
                  const flock = v.farmer_flocks as { flock_name: string; farmers?: { full_name: string } | null } | null;
                  const daysUntil = Math.ceil((new Date(v.scheduled_date).getTime() - Date.now()) / 86400_000);
                  return (
                    <tr key={v.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{v.vaccine_name}</td>
                      <td className="px-4 py-3">{flock?.flock_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{flock?.farmers?.full_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <p>{formatDate(v.scheduled_date)}</p>
                        <p className={`text-xs ${daysUntil <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {daysUntil === 0 ? "Today" : daysUntil > 0 ? `In ${daysUntil} day(s)` : `${Math.abs(daysUntil)} day(s) ago`}
                        </p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={v.status ?? "scheduled"} /></td>
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

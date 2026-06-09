import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate, formatNumber } from "@/lib/utils";
import { Plus } from "lucide-react";

export const metadata = { title: "Egg Production" };

export default async function EggsPage() {
  const supabase = await createServerClient();

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);

  const { data: records } = await supabase
    .from("egg_production_records")
    .select(`
      id, record_date, total_eggs_laid, saleable_eggs, grade_a_count,
      grade_b_count, grade_c_count, cracked_count, dirty_count,
      hen_day_production,
      layer_flocks(flock_name, active_hen_count,
        farmers(full_name)
      )
    `)
    .gte("record_date", weekAgo)
    .order("record_date", { ascending: false })
    .limit(100);

  const { data: todayStats } = await supabase
    .from("egg_production_records")
    .select("total_eggs_laid, saleable_eggs, grade_a_count")
    .eq("record_date", today);

  const totals = (todayStats ?? []).reduce(
    (acc, r) => ({
      total: acc.total + (r.total_eggs_laid ?? 0),
      saleable: acc.saleable + (r.saleable_eggs ?? 0),
      gradeA: acc.gradeA + (r.grade_a_count ?? 0),
    }),
    { total: 0, saleable: 0, gradeA: 0 }
  );

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Egg Production"
        subtitle="Daily recording and grade tracking"
        actions={
          <Link
            href="/eggs/record"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> Record Eggs
          </Link>
        }
      />

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today — Total Eggs", value: totals.total },
          { label: "Today — Saleable", value: totals.saleable },
          { label: "Today — Grade A", value: totals.gradeA },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Last 7 Days — Production Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Date", "Flock", "Farmer", "Total", "Saleable", "Grade A", "Grade B", "Grade C", "Cracked", "HDP %"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!records?.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    No records yet.{" "}
                    <Link href="/eggs/record" className="text-edos-600 hover:underline">Record today&apos;s production</Link>
                  </td>
                </tr>
              ) : (
                records.map(r => {
                  const lf = r.layer_flocks as { flock_name: string; farmers?: { full_name: string } | null } | null;
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{formatDate(r.record_date)}</td>
                      <td className="px-4 py-3">{lf?.flock_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lf?.farmers?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">{formatNumber(r.total_eggs_laid ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-green-700">{formatNumber(r.saleable_eggs ?? 0)}</td>
                      <td className="px-4 py-3 font-mono">{formatNumber(r.grade_a_count ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-amber-700">{formatNumber(r.grade_b_count ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-orange-700">{formatNumber(r.grade_c_count ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-red-600">{formatNumber(r.cracked_count ?? 0)}</td>
                      <td className="px-4 py-3 font-mono">{r.hen_day_production?.toFixed(1) ?? "—"}%</td>
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

import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { ExportToolbar } from "@/components/shared/ExportToolbar";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatNumber } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";

export const metadata = { title: "Egg Production" };

const COLS = [
  { key: "date",    header: "Date" },
  { key: "flock",   header: "Flock" },
  { key: "farmer",  header: "Farmer" },
  { key: "total",   header: "Total Eggs" },
  { key: "saleable",header: "Saleable" },
  { key: "gradeA",  header: "Grade A" },
  { key: "gradeB",  header: "Grade B" },
  { key: "gradeC",  header: "Grade C" },
  { key: "cracked", header: "Cracked" },
  { key: "dirty",   header: "Dirty" },
  { key: "hdp",     header: "HDP %" },
];

export default async function EggsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; preset?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  const todayStr   = new Date().toISOString().slice(0, 10);
  const weekAgoStr = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);

  const from   = searchParams.from   ?? weekAgoStr;
  const to     = searchParams.to     ?? todayStr;
  const preset = (searchParams.preset ?? "week") as "today" | "yesterday" | "week" | "month" | "quarter" | "year" | "custom";

  const [recordsRes, todayRes] = orgId
    ? await Promise.all([
        supabase
          .from("egg_production_records")
          .select(`
            id, production_date, total_eggs_laid, saleable_eggs,
            grade_a_count, grade_b_count, grade_c_count,
            cracked_eggs, dirty_eggs, hen_day_production,
            farmer_flocks(flock_code, farmers(full_name))
          `)
          .eq("organization_id", orgId)
          .gte("production_date", from)
          .lte("production_date", to)
          .order("production_date", { ascending: false })
          .limit(500),
        supabase
          .from("egg_production_records")
          .select("total_eggs_laid, saleable_eggs, grade_a_count")
          .eq("organization_id", orgId)
          .eq("production_date", todayStr),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const records    = recordsRes.data ?? [];
  const todayStats = todayRes.data ?? [];
  const queryError = recordsRes.error?.message ?? null;
  if (queryError) console.error("Egg records error:", queryError);

  const totals = (todayStats as { total_eggs_laid: number | null; saleable_eggs: number | null; grade_a_count: number | null }[])
    .reduce((acc, r) => ({
      total:    acc.total    + (r.total_eggs_laid ?? 0),
      saleable: acc.saleable + (r.saleable_eggs   ?? 0),
      gradeA:   acc.gradeA  + (r.grade_a_count    ?? 0),
    }), { total: 0, saleable: 0, gradeA: 0 });

  const exportData = records.map(r => {
    const lf = r.farmer_flocks as { flock_code: string; farmers?: { full_name: string } | null } | null;
    return {
      date:    r.production_date,
      flock:   lf?.flock_code ?? "",
      farmer:  lf?.farmers?.full_name ?? "",
      total:   r.total_eggs_laid ?? 0,
      saleable:r.saleable_eggs   ?? 0,
      gradeA:  r.grade_a_count   ?? 0,
      gradeB:  r.grade_b_count   ?? 0,
      gradeC:  r.grade_c_count   ?? 0,
      cracked: r.cracked_eggs    ?? 0,
      dirty:   r.dirty_eggs      ?? 0,
      hdp:     r.hen_day_production ? `${r.hen_day_production.toFixed(1)}%` : "",
    };
  });

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Egg Production"
        subtitle="Daily recording and grade tracking"
        actions={
          <div className="flex items-center gap-2">
            <ExportToolbar
              data={exportData}
              columns={COLS}
              filename={`egg-production-${from}-${to}`}
              title={`Egg Production — ${from} to ${to}`}
            />
            <Link
              href="/eggs/record"
              className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} /> Record Eggs
            </Link>
          </div>
        }
      />

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Today — Total Eggs", value: totals.total },
          { label: "Today — Saleable",   value: totals.saleable },
          { label: "Today — Grade A",    value: totals.gradeA },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {/* Date filter */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Filter by Date</p>
        <DateRangeFilter active={preset} from={from} to={to} />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">
            Production Records
            <span className="ml-2 text-muted-foreground font-normal">{from} — {to}</span>
          </h3>
          <span className="text-xs text-muted-foreground">{records.length} records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Date","Flock","Farmer","Total","Saleable","Gr. A","Gr. B","Gr. C","Cracked","Dirty","HDP %",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {queryError ? (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-destructive text-xs font-mono">Query error: {queryError}</td></tr>
              ) : !records.length ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    No records for this period.{" "}
                    <Link href="/eggs/record" className="text-edos-600 hover:underline">Record today&apos;s production</Link>
                  </td>
                </tr>
              ) : (
                records.map(r => {
                  const lf = r.farmer_flocks as { flock_code: string; farmers?: { full_name: string } | null } | null;
                  return (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{formatDate(r.production_date)}</td>
                      <td className="px-4 py-3">{lf?.flock_code ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{lf?.farmers?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">{formatNumber(r.total_eggs_laid ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-green-700">{formatNumber(r.saleable_eggs ?? 0)}</td>
                      <td className="px-4 py-3 font-mono">{formatNumber(r.grade_a_count ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-amber-700">{formatNumber(r.grade_b_count ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-orange-700">{formatNumber(r.grade_c_count ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-red-600">{formatNumber(r.cracked_eggs ?? 0)}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{formatNumber(r.dirty_eggs ?? 0)}</td>
                      <td className="px-4 py-3 font-mono">{r.hen_day_production?.toFixed(1) ?? "—"}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/eggs/${r.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors" title="Edit">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={r.id} apiPath="/api/eggs" label="egg record" />
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

import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatNumber } from "@/lib/utils";
import { Plus } from "lucide-react";

export const metadata = { title: "Hatchery" };

export default async function HatcheryPage() {
  const supabase = await createServerClient();
  const { data: batches } = await supabase
    .from("hatchery_batches")
    .select(`
      id, batch_code, eggs_set, expected_hatch_date, set_date, status,
      hatched_count, culled_count, chicks_saleable, fertility_pct, hatchability_pct,
      depots(depot_name)
    `)
    .order("set_date", { ascending: false })
    .limit(30);

  const active = batches?.filter(b => b.status === "incubating" || b.status === "hatching") ?? [];
  const totalActiveEggs = active.reduce((s, b) => s + (b.eggs_set ?? 0), 0);
  const completedThisMonth = batches?.filter(b => {
    if (b.status !== "completed") return false;
    const monthStart = new Date().toISOString().slice(0, 7) + "-01";
    return b.set_date >= monthStart;
  }) ?? [];
  const saleable = completedThisMonth.reduce((s, b) => s + (b.chicks_saleable ?? 0), 0);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Hatchery Management"
        subtitle="Track incubation batches from set to hatch"
        actions={
          <Link
            href="/hatchery/new"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> New Batch
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Batches", value: active.length },
          { label: "Eggs Incubating", value: totalActiveEggs },
          { label: "Saleable Chicks (Month)", value: saleable },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Batch Code", "Set Date", "Expected Hatch", "Eggs Set", "Hatched", "Saleable", "Fertility %", "Hatchability %", "Depot", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!batches?.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    No batches yet.{" "}
                    <Link href="/hatchery/new" className="text-edos-600 hover:underline">Create first batch</Link>
                  </td>
                </tr>
              ) : (
                batches.map(b => {
                  const daysLeft = b.expected_hatch_date
                    ? Math.ceil((new Date(b.expected_hatch_date).getTime() - Date.now()) / 86400_000)
                    : null;
                  return (
                    <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-edos-700">{b.batch_code}</td>
                      <td className="px-4 py-3">{formatDate(b.set_date)}</td>
                      <td className="px-4 py-3">
                        <p>{b.expected_hatch_date ? formatDate(b.expected_hatch_date) : "—"}</p>
                        {daysLeft !== null && b.status === "incubating" && (
                          <p className={`text-xs ${daysLeft <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {daysLeft > 0 ? `${daysLeft}d left` : "Due today"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatNumber(b.eggs_set ?? 0)}</td>
                      <td className="px-4 py-3 font-mono">{b.hatched_count ? formatNumber(b.hatched_count) : "—"}</td>
                      <td className="px-4 py-3 font-mono text-edos-700">{b.chicks_saleable ? formatNumber(b.chicks_saleable) : "—"}</td>
                      <td className="px-4 py-3">{b.fertility_pct ? `${b.fertility_pct.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3">{b.hatchability_pct ? `${b.hatchability_pct.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(b.depots as { depot_name: string } | null)?.depot_name ?? "—"}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={b.status ?? "incubating"} dot /></td>
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

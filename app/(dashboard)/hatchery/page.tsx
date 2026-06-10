import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { ExportToolbar } from "@/components/shared/ExportToolbar";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatNumber } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";

export const metadata = { title: "Hatchery" };

const COLS = [
  { key: "batchCode",    header: "Batch Code" },
  { key: "setDate",      header: "Set Date" },
  { key: "expectedHatch",header: "Expected Hatch" },
  { key: "eggsSet",      header: "Eggs Set" },
  { key: "hatched",      header: "Hatched" },
  { key: "saleable",     header: "Saleable" },
  { key: "fertility",    header: "Fertility %" },
  { key: "hatchability", header: "Hatchability %" },
  { key: "depot",        header: "Depot" },
  { key: "status",       header: "Status" },
];

export default async function HatcheryPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; preset?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  const preset = searchParams.preset ?? "all";
  const from   = searchParams.from;
  const to     = searchParams.to;

  let query = supabase
    .from("hatchery_batches")
    .select(`id, batch_code, eggs_set, expected_hatch_date, set_date, status,
      chicks_hatched, chicks_culled, chicks_saleable, fertility_rate_pct, hatch_rate_pct,
      depots(name)`)
    .eq("organization_id", orgId ?? "")
    .order("set_date", { ascending: false })
    .limit(200);

  if (orgId && from && to) {
    query = query.gte("set_date", from).lte("set_date", to);
  }

  const { data: batches, error: batchesError } = orgId
    ? await query
    : { data: [], error: null };

  if (batchesError) console.error("Hatchery query error:", batchesError.message);

  const active           = batches?.filter(b => ["setting","candling","lockdown","hatching"].includes(b.status ?? "")) ?? [];
  const totalActiveEggs  = active.reduce((s, b) => s + (b.eggs_set ?? 0), 0);
  const completedMonth   = batches?.filter(b => {
    if (b.status !== "complete") return false;
    return b.set_date >= new Date().toISOString().slice(0, 7) + "-01";
  }) ?? [];
  const saleable = completedMonth.reduce((s, b) => s + (b.chicks_saleable ?? 0), 0);

  const exportData = (batches ?? []).map(b => ({
    batchCode:    b.batch_code,
    setDate:      b.set_date ?? "",
    expectedHatch:b.expected_hatch_date ?? "",
    eggsSet:      b.eggs_set ?? 0,
    hatched:      b.chicks_hatched ?? "",
    saleable:     b.chicks_saleable ?? "",
    fertility:    b.fertility_rate_pct ? `${b.fertility_rate_pct.toFixed(1)}%` : "",
    hatchability: b.hatch_rate_pct ? `${b.hatch_rate_pct.toFixed(1)}%` : "",
    depot:        (b.depots as { name: string } | null)?.name ?? "",
    status:       b.status ?? "",
  }));

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Hatchery Management"
        subtitle="Track incubation batches from set to hatch"
        actions={
          <div className="flex items-center gap-2">
            <ExportToolbar
              data={exportData}
              columns={COLS}
              filename={`hatchery-${new Date().toISOString().slice(0, 10)}`}
              title="Hatchery Batches"
            />
            <Link
              href="/hatchery/new"
              className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} /> New Batch
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Active Batches",         value: active.length },
          { label: "Eggs Incubating",        value: totalActiveEggs },
          { label: "Saleable Chicks (Month)",value: saleable },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold mt-1">{formatNumber(value)}</p>
          </div>
        ))}
      </div>

      {/* Date filter — filters by set date */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Filter by Set Date
          {!from && <span className="ml-2 font-normal text-muted-foreground/60">(showing all)</span>}
        </p>
        <DateRangeFilter active={preset as "today"|"yesterday"|"week"|"month"|"quarter"|"year"|"custom"} from={from} to={to} />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Batch Code","Set Date","Expected Hatch","Eggs Set","Hatched","Saleable","Fertility %","Hatchability %","Depot","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!batches?.length ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    No batches found.{" "}
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
                        {daysLeft !== null && b.status === "setting" && (
                          <p className={`text-xs ${daysLeft <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {daysLeft > 0 ? `${daysLeft}d left` : "Due today"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{formatNumber(b.eggs_set ?? 0)}</td>
                      <td className="px-4 py-3 font-mono">{b.chicks_hatched ? formatNumber(b.chicks_hatched) : "—"}</td>
                      <td className="px-4 py-3 font-mono text-edos-700">{b.chicks_saleable ? formatNumber(b.chicks_saleable) : "—"}</td>
                      <td className="px-4 py-3">{b.fertility_rate_pct ? `${b.fertility_rate_pct.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3">{b.hatch_rate_pct ? `${b.hatch_rate_pct.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{(b.depots as { name: string } | null)?.name ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status ?? "setting"} dot /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/hatchery/${b.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors" title="Edit">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={b.id} apiPath="/api/hatchery" label="batch" />
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

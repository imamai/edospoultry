import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatNumber } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";

export const metadata = { title: "Breeding Records" };

export default async function BreedingPage({
  searchParams,
}: {
  searchParams: { farmer_id?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  let q = supabase
    .from("breeding_records")
    .select("id, mating_type, mating_date, hen_count, cock_count, hen_cock_ratio, fertility_rate_pct, farmers(full_name), farmer_flocks(flock_code)")
    .eq("organization_id", orgId ?? "")
    .order("mating_date", { ascending: false })
    .limit(500);

  if (searchParams.farmer_id) q = q.eq("farmer_id", searchParams.farmer_id);

  const { data: records } = orgId ? await q : { data: [] };

  const avgFertility = records?.length
    ? (records.reduce((s, r) => s + (r.fertility_rate_pct ?? 0), 0) / records.length).toFixed(1)
    : "0.0";

  const totalHens  = (records ?? []).reduce((s, r) => s + (r.hens_mated ?? 0), 0);
  const totalCocks = (records ?? []).reduce((s, r) => s + (r.cocks_used ?? 0), 0);

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Breeding Records"
        subtitle={`${records?.length ?? 0} records`}
        actions={
          <Link
            href="/breeding/new"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> New Record
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Hens",        value: formatNumber(totalHens) },
          { label: "Total Cocks",       value: formatNumber(totalCocks) },
          { label: "Avg Fertility (%)", value: `${avgFertility}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Mating Type","Date","Farmer","Sire Breed","Dam Breed","Hens","Cocks","Ratio","Fertility (%)",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!records?.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No breeding records.{" "}
                    <Link href="/breeding/new" className="text-edos-600 hover:underline">Add one</Link>
                  </td>
                </tr>
              ) : (
                records.map(rec => {
                  const farmer = rec.farmers as { full_name: string } | null;
                  return (
                    <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 capitalize">{rec.mating_type?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(rec.mating_date)}</td>
                      <td className="px-4 py-3">{farmer?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{rec.sire_breed ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{rec.dam_breed ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">{rec.hens_mated != null ? formatNumber(rec.hens_mated) : "—"}</td>
                      <td className="px-4 py-3 font-mono">{rec.cocks_used != null ? formatNumber(rec.cocks_used) : "—"}</td>
                      <td className="px-4 py-3 font-mono">{rec.hen_cock_ratio != null ? rec.hen_cock_ratio : "—"}</td>
                      <td className="px-4 py-3 font-mono">{rec.fertility_rate_pct != null ? `${rec.fertility_rate_pct}%` : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/breeding/${rec.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={rec.id} apiPath="/api/breeding" label="breeding record" />
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

import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export const metadata = { title: "Inspections" };

function PassFail({ val }: { val: boolean | null | undefined }) {
  if (val === true)  return <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={13} /> Pass</span>;
  if (val === false) return <span className="flex items-center gap-1 text-red-600 text-xs font-medium"><XCircle size={13} /> Fail</span>;
  return <span className="text-muted-foreground text-xs">—</span>;
}

export default async function InspectionsPage({
  searchParams,
}: {
  searchParams: { inspection_type?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  let q = supabase
    .from("farm_inspections")
    .select("id, inspection_type, inspection_date, overall_score, pass_fail, follow_up_required, follow_up_date, farmers(full_name), poultry_houses(house_name)")
    .eq("organization_id", orgId ?? "")
    .order("inspection_date", { ascending: false })
    .limit(500);

  if (searchParams.inspection_type) q = q.eq("inspection_type", searchParams.inspection_type);

  const { data: inspections } = orgId ? await q : { data: [] };

  const passed    = (inspections ?? []).filter(i => i.passed === true).length;
  const failed    = (inspections ?? []).filter(i => i.passed === false).length;
  const followUp  = (inspections ?? []).filter(i => i.follow_up_required).length;

  // Matches inspection_type enum in migration
  const TYPES = ["biosecurity","welfare","compliance","routine","pre_delivery","post_incident","government"];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Farm Inspections"
        subtitle={`${inspections?.length ?? 0} records`}
        actions={
          <Link
            href="/inspections/new"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> Record Inspection
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Passed",     value: passed,   icon: CheckCircle, color: "text-green-600" },
          { label: "Failed",     value: failed,   icon: XCircle,     color: "text-red-600" },
          { label: "Follow-up",  value: followUp, icon: AlertCircle, color: "text-orange-500" },
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

      <div className="flex gap-2 flex-wrap">
        <Link href="/inspections" className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${!searchParams.inspection_type ? "bg-edos-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>All Types</Link>
        {TYPES.map(t => (
          <Link key={t} href={`/inspections?inspection_type=${t}`} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors capitalize ${searchParams.inspection_type === t ? "bg-edos-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
            {t.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Type","Date","Farmer","House","Score","Result","Follow-up",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!inspections?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No inspections recorded.{" "}
                    <Link href="/inspections/new" className="text-edos-600 hover:underline">Record one</Link>
                  </td>
                </tr>
              ) : (
                inspections.map(ins => {
                  const farmer = ins.farmers as { full_name: string } | null;
                  const house  = ins.poultry_houses as { house_name: string } | null;
                  return (
                    <tr key={ins.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 capitalize">{ins.inspection_type?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(ins.inspection_date)}</td>
                      <td className="px-4 py-3">{farmer?.full_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{house?.house_name ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">{ins.score_pct != null ? `${Number(ins.score_pct).toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-3"><PassFail val={ins.passed} /></td>
                      <td className="px-4 py-3">
                        {ins.follow_up_required
                          ? <span className="text-orange-600 text-xs font-medium">{ins.follow_up_date ? formatDate(ins.follow_up_date) : "Required"}</span>
                          : <span className="text-muted-foreground text-xs">No</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/inspections/${ins.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={ins.id} apiPath="/api/inspections" label="inspection" />
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

import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { ExportToolbar } from "@/components/shared/ExportToolbar";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatNumber, getBirdCategoryColor } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";

export const metadata = { title: "Flocks" };

const COLS = [
  { key: "code",      header: "Flock Code" },
  { key: "farmer",    header: "Farmer" },
  { key: "category",  header: "Category" },
  { key: "purpose",   header: "Purpose" },
  { key: "birds",     header: "Birds" },
  { key: "status",    header: "Status" },
  { key: "placed",    header: "Placement Date" },
  { key: "added",     header: "Added" },
];

export default async function FlocksPage({
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
    .from("farmer_flocks")
    .select(`id, flock_code, bird_category, purpose, current_quantity, status,
      placement_date, created_at, farmers(full_name, phone_number)`)
    .eq("organization_id", orgId ?? "")
    .order("created_at", { ascending: false })
    .limit(500);

  if (orgId && from && to) {
    query = query.gte("placement_date", from).lte("placement_date", to);
  }

  const { data: flocks, error: flocksError } = orgId
    ? await query
    : { data: [], error: null };

  if (flocksError) console.error("Flocks query error:", flocksError.message);

  const exportData = (flocks ?? []).map(flock => {
    const farmer = flock.farmers as { full_name: string; phone_number: string } | null;
    return {
      code:     flock.flock_code ?? "",
      farmer:   farmer?.full_name ?? "",
      category: flock.bird_category?.replace(/_/g, " ") ?? "",
      purpose:  flock.purpose?.replace(/_/g, " ") ?? "",
      birds:    flock.current_quantity,
      status:   flock.status ?? "",
      placed:   flock.placement_date ?? "",
      added:    flock.created_at ? flock.created_at.slice(0, 10) : "",
    };
  });

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Flock Management"
        subtitle={`${flocks?.length ?? 0} flocks`}
        actions={
          <div className="flex items-center gap-2">
            <ExportToolbar
              data={exportData}
              columns={COLS}
              filename={`flocks-${new Date().toISOString().slice(0, 10)}`}
              title="Flock Register"
            />
            <Link
              href="/flocks/new"
              className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={16} /> Add Flock
            </Link>
          </div>
        }
      />

      {/* Date filter — filters by placement date */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Filter by Placement Date
          {!from && <span className="ml-2 font-normal text-muted-foreground/60">(showing all)</span>}
        </p>
        <DateRangeFilter active={preset as "today"|"yesterday"|"week"|"month"|"quarter"|"year"|"custom"} from={from} to={to} />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Flock Code","Farmer","Category","Purpose","Birds","Status","Placed","Added",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!flocks?.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No flocks found.{" "}
                    <Link href="/flocks/new" className="text-edos-600 hover:underline">Add the first flock</Link>
                  </td>
                </tr>
              ) : (
                flocks.map(flock => {
                  const farmer = flock.farmers as { full_name: string; phone_number: string } | null;
                  return (
                    <tr key={flock.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/flocks/${flock.id}`} className="font-medium text-edos-700 hover:underline">
                          {flock.flock_code ?? flock.id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{farmer?.full_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{farmer?.phone_number ?? ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`status-pill ${getBirdCategoryColor(flock.bird_category)}`}>
                          {flock.bird_category.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">{flock.purpose?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3 font-mono">{formatNumber(flock.current_quantity)}</td>
                      <td className="px-4 py-3"><StatusBadge status={flock.status ?? "active"} dot /></td>
                      <td className="px-4 py-3 text-muted-foreground">{flock.placement_date ? formatDate(flock.placement_date) : "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(flock.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/flocks/${flock.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors" title="Edit">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={flock.id} apiPath="/api/flocks" label="flock" />
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

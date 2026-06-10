import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { DateRangeFilter } from "@/components/shared/DateRangeFilter";
import { ExportToolbar } from "@/components/shared/ExportToolbar";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatPhone } from "@/lib/utils";
import { UserPlus, Pencil } from "lucide-react";

export const metadata = { title: "Farmers" };

const COLS = [
  { key: "name",       header: "Name" },
  { key: "phone",      header: "Phone" },
  { key: "idNumber",   header: "National ID" },
  { key: "ward",       header: "Ward" },
  { key: "subcounty",  header: "Subcounty" },
  { key: "county",     header: "County" },
  { key: "status",     header: "Status" },
  { key: "registered", header: "Registered" },
];

export default async function FarmersPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; preset?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  const preset = (searchParams.preset ?? "all") as string;
  const from   = searchParams.from;
  const to     = searchParams.to;

  let query = supabase
    .from("farmers")
    .select(`id, full_name, phone_number, id_number, is_active, created_at,
      wards(name, subcounties(name, counties(name)))`)
    .eq("organization_id", orgId ?? "")
    .order("created_at", { ascending: false })
    .limit(500);

  if (orgId && from && to) {
    query = query.gte("created_at", from).lte("created_at", to + "T23:59:59");
  }

  const { data: farmers, error: farmersError } = orgId
    ? await query
    : { data: [], error: null };

  if (farmersError) console.error("Farmers query error:", farmersError.message);

  const exportData = (farmers ?? []).map(f => {
    const ward = f.wards as { name: string; subcounties?: { name: string; counties?: { name: string } | null } | null } | null;
    return {
      name:       f.full_name,
      phone:      f.phone_number,
      idNumber:   f.id_number ?? "",
      ward:       ward?.name ?? "",
      subcounty:  ward?.subcounties?.name ?? "",
      county:     ward?.subcounties?.counties?.name ?? "",
      status:     f.is_active ? "Active" : "Inactive",
      registered: f.created_at ? f.created_at.slice(0, 10) : "",
    };
  });

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Farmers"
        subtitle={`${farmers?.length ?? 0} registered`}
        actions={
          <div className="flex items-center gap-2">
            <ExportToolbar
              data={exportData}
              columns={COLS}
              filename={`farmers-${new Date().toISOString().slice(0, 10)}`}
              title="Farmer Registry"
            />
            <Link
              href="/farmers/register"
              className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <UserPlus size={16} /> Register Farmer
            </Link>
          </div>
        }
      />

      {/* Date filter — filters by registration date */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          Filter by Registration Date
          {!from && <span className="ml-2 font-normal text-muted-foreground/60">(showing all)</span>}
        </p>
        <DateRangeFilter active={preset as "today"|"yesterday"|"week"|"month"|"quarter"|"year"|"custom"} from={from} to={to} />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Name","Phone","National ID","Ward","Subcounty","County","Status","Registered",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!farmers?.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    No farmers found.{" "}
                    <Link href="/farmers/register" className="text-edos-600 hover:underline">Register the first farmer</Link>
                  </td>
                </tr>
              ) : (
                farmers.map(f => {
                  const ward = f.wards as { name: string; subcounties?: { name: string; counties?: { name: string } | null } | null } | null;
                  return (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/farmers/${f.id}`} className="text-edos-700 hover:underline">{f.full_name}</Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{formatPhone(f.phone_number)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.id_number ?? "—"}</td>
                      <td className="px-4 py-3">{ward?.name ?? "—"}</td>
                      <td className="px-4 py-3">{ward?.subcounties?.name ?? "—"}</td>
                      <td className="px-4 py-3">{ward?.subcounties?.counties?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`status-pill ${f.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                          {f.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(f.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/farmers/${f.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors" title="Edit">
                            <Pencil size={14} />
                          </Link>
                          <DeleteButton id={f.id} apiPath="/api/farmers" label="farmer" />
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

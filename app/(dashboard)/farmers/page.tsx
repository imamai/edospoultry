import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatDate, formatPhone } from "@/lib/utils";
import { UserPlus } from "lucide-react";

export const metadata = { title: "Farmers" };

export default async function FarmersPage() {
  const supabase = await createServerClient();
  const { data: farmers } = await supabase
    .from("farmers")
    .select(`
      id, full_name, phone_number, national_id, created_at, is_verified,
      wards(ward_name,
        subcounties(subcounty_name,
          counties(county_name)
        )
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="page-enter">
      <PageHeader
        title="Farmers"
        subtitle={`${farmers?.length ?? 0} registered`}
        actions={
          <Link
            href="/farmers/register"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <UserPlus size={16} /> Register Farmer
          </Link>
        }
      />

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Name", "Phone", "National ID", "Ward", "Subcounty", "County", "Verified", "Registered"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!farmers?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No farmers registered yet.{" "}
                    <Link href="/farmers/register" className="text-edos-600 hover:underline">Register the first farmer</Link>
                  </td>
                </tr>
              ) : (
                farmers.map(f => {
                  const ward = f.wards as { ward_name: string; subcounties?: { subcounty_name: string; counties?: { county_name: string } | null } | null } | null;
                  return (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/farmers/${f.id}`} className="text-edos-700 hover:underline">
                          {f.full_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{formatPhone(f.phone_number)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.national_id ?? "—"}</td>
                      <td className="px-4 py-3">{ward?.ward_name ?? "—"}</td>
                      <td className="px-4 py-3">{ward?.subcounties?.subcounty_name ?? "—"}</td>
                      <td className="px-4 py-3">{ward?.subcounties?.counties?.county_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`status-pill ${f.is_verified ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                          {f.is_verified ? "Yes" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(f.created_at)}</td>
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

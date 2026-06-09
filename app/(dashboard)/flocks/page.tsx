import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatNumber, getBirdCategoryColor } from "@/lib/utils";
import { Plus } from "lucide-react";

export const metadata = { title: "Flocks" };

export default async function FlocksPage() {
  const supabase = await createServerClient();
  const { data: flocks } = await supabase
    .from("farmer_flocks")
    .select(`
      id, flock_name, bird_category, flock_purpose, current_count, status, house_type,
      created_at, updated_at,
      farmers(full_name, phone_number),
      poultry_houses(house_name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="page-enter">
      <PageHeader
        title="Flock Management"
        subtitle={`${flocks?.length ?? 0} flocks`}
        actions={
          <Link
            href="/flocks/new"
            className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} /> Add Flock
          </Link>
        }
      />

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Flock Name", "Farmer", "Category", "Purpose", "Birds", "House", "Status", "Added"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!flocks?.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No flocks registered yet.{" "}
                    <Link href="/flocks/new" className="text-edos-600 hover:underline">Add the first flock</Link>
                  </td>
                </tr>
              ) : (
                flocks.map(flock => (
                  <tr key={flock.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/flocks/${flock.id}`} className="font-medium text-edos-700 hover:underline">
                        {flock.flock_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{(flock.farmers as { full_name: string })?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{(flock.farmers as { phone_number: string })?.phone_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-pill ${getBirdCategoryColor(flock.bird_category)}`}>
                        {flock.bird_category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 capitalize">{flock.flock_purpose?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="px-4 py-3 font-mono">{formatNumber(flock.current_count)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{(flock.poultry_houses as { house_name: string })?.house_name ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={flock.status ?? "active"} dot /></td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(flock.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

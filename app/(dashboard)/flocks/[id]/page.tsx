import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatDate, formatNumber, getBirdCategoryColor } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: `Flock Details` };
}

export default async function FlockDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createServerClient();

  const { data: flock } = await supabase
    .from("farmer_flocks")
    .select(`
      *,
      farmers(full_name, phone_number, national_id),
      poultry_houses(house_name, length_m, width_m, stocking_density)
    `)
    .eq("id", params.id)
    .single();

  if (!flock) notFound();

  const { data: mortality } = await supabase
    .from("mortality_claims")
    .select("id, reported_count, approved_count, claim_status, created_at")
    .eq("flock_id", params.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: vaccinations } = await supabase
    .from("vaccination_schedules")
    .select("vaccine_name, scheduled_date, administered_date, administered_count, status")
    .eq("flock_id", params.id)
    .order("scheduled_date", { ascending: false })
    .limit(10);

  const farmer = flock.farmers as { full_name: string; phone_number: string; national_id?: string } | null;
  const house = flock.poultry_houses as { house_name: string; stocking_density?: number } | null;

  return (
    <div className="page-enter max-w-4xl">
      <PageHeader
        title={flock.flock_name}
        actions={
          <Link href="/flocks" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> All Flocks
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Overview */}
        <div className="md:col-span-2 bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className={`status-pill ${getBirdCategoryColor(flock.bird_category)}`}>
              {flock.bird_category.replace(/_/g, " ")}
            </span>
            <StatusBadge status={flock.status ?? "active"} dot />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              ["Initial Count", formatNumber(flock.initial_count)],
              ["Current Count", formatNumber(flock.current_count)],
              ["Purpose", flock.flock_purpose?.replace(/_/g, " ") ?? "—"],
              ["House Type", flock.house_type?.replace(/_/g, " ") ?? "—"],
              ["Registered", formatDate(flock.created_at)],
              ["Last Updated", formatDate(flock.updated_at)],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-xs text-muted-foreground">{k}</p>
                <p className="font-medium capitalize">{v as string}</p>
              </div>
            ))}
          </div>

          {flock.notes && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p className="text-sm">{flock.notes}</p>
            </div>
          )}
        </div>

        {/* Farmer + House */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Farmer</p>
            <p className="font-semibold">{farmer?.full_name ?? "—"}</p>
            <p className="text-sm text-muted-foreground">{farmer?.phone_number}</p>
            {farmer?.national_id && <p className="text-xs text-muted-foreground mt-1">ID: {farmer.national_id}</p>}
          </div>
          {house && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase mb-3">House</p>
              <p className="font-semibold">{house.house_name}</p>
              {house.stocking_density && (
                <p className="text-sm text-muted-foreground">{house.stocking_density.toFixed(1)} birds/m²</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Vaccination schedule */}
      {vaccinations && vaccinations.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Vaccination History</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Vaccine", "Scheduled", "Administered", "Count", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {vaccinations.map((v, i) => (
                <tr key={i} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{v.vaccine_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(v.scheduled_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.administered_date ? formatDate(v.administered_date) : "—"}</td>
                  <td className="px-4 py-3">{v.administered_count ? formatNumber(v.administered_count) : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status ?? "scheduled"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mortality claims */}
      {mortality && mortality.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold">Mortality Claims</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Reported", "Approved", "Status", "Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mortality.map(m => (
                <tr key={m.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">{formatNumber(m.reported_count)}</td>
                  <td className="px-4 py-3">{m.approved_count ? formatNumber(m.approved_count) : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.claim_status ?? "pending"} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(m.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

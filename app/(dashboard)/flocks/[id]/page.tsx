import { notFound } from "next/navigation";
import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatDate, formatNumber, getBirdCategoryColor } from "@/lib/utils";
import { ArrowLeft, Pencil, Pill, Scale, Wheat, Banknote } from "lucide-react";

export async function generateMetadata() {
  return { title: "Flock Details" };
}

export default async function FlockDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const supabase = createServiceClient();
  const { orgId } = await getOrgContext();
  const tab = searchParams.tab ?? "overview";

  const { data: flock } = await supabase
    .from("farmer_flocks")
    .select("*, farmers(full_name, phone_number, id_number)")
    .eq("id", params.id)
    .single();

  if (!flock) notFound();

  const farmer = flock.farmers as { full_name: string; phone_number: string; id_number?: string } | null;

  const [mortalityRes, vaccinationsRes, medicationsRes, weightsRes, feedRes, expensesRes] = await Promise.all([
    supabase.from("mortality_claims").select("id, claimed_deaths, actual_deaths, status, created_at").eq("flock_id", params.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("vaccination_schedules").select("vaccine_type, scheduled_date, completed_date").eq("flock_id", params.id).order("scheduled_date", { ascending: false }).limit(10),
    supabase.from("medication_records").select("id, medication_name, start_date, end_date, dosage, dosage_unit, disease_treated, meat_withdrawal_date").eq("flock_id", params.id).order("start_date", { ascending: false }).limit(20),
    supabase.from("bird_weights").select("id, weigh_date, sample_size, avg_weight_g, fcr").eq("flock_id", params.id).order("weigh_date", { ascending: false }).limit(20),
    supabase.from("feed_consumption").select("id, feed_date, feed_type, quantity_kg, feed_per_bird_g, total_cost").eq("flock_id", params.id).order("feed_date", { ascending: false }).limit(20),
    supabase.from("flock_expenses").select("id, expense_date, category, description, total_amount").eq("flock_id", params.id).order("expense_date", { ascending: false }).limit(20),
  ]);

  const mortality    = mortalityRes.data ?? [];
  const vaccinations = vaccinationsRes.data ?? [];
  const medications  = medicationsRes.data ?? [];
  const weights      = weightsRes.data ?? [];
  const feed         = feedRes.data ?? [];
  const expenses     = expensesRes.data ?? [];

  const totalExpenses = expenses.reduce((s, e) => s + (e.total_amount ?? 0), 0);
  const totalFeedCost = feed.reduce((s, f) => s + (f.total_cost ?? 0), 0);

  const TABS = [
    { key: "overview",    label: "Overview" },
    { key: "medications", label: "Medications",  count: medications.length,  icon: Pill },
    { key: "weights",     label: "Weights",      count: weights.length,      icon: Scale },
    { key: "feed",        label: "Feed",         count: feed.length,         icon: Wheat },
    { key: "expenses",    label: "Expenses",     count: expenses.length,     icon: Banknote },
  ];

  return (
    <div className="page-enter max-w-4xl space-y-6">
      <PageHeader
        title={flock.flock_code ?? flock.id.slice(0, 8)}
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/flocks/${params.id}/edit`} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-xl hover:bg-muted transition-colors">
              <Pencil size={14} /> Edit
            </Link>
            <Link href="/flocks" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} /> All Flocks
            </Link>
          </div>
        }
      />

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, count, icon: Icon }) => (
          <Link
            key={key}
            href={`/flocks/${params.id}${key !== "overview" ? `?tab=${key}` : ""}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === key ? "bg-edos-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {Icon && <Icon size={14} />}
            {label}
            {count !== undefined && <span className="text-xs opacity-70 ml-1">{count}</span>}
          </Link>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`status-pill ${getBirdCategoryColor(flock.bird_category)}`}>
                  {flock.bird_category.replace(/_/g, " ")}
                </span>
                <StatusBadge status={flock.status ?? "active"} dot />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Initial Qty", formatNumber(flock.initial_quantity)],
                  ["Current Qty", formatNumber(flock.current_quantity)],
                  ["Purpose",     flock.purpose?.replace(/_/g, " ") ?? "—"],
                  ["Placed",      flock.placement_date ? formatDate(flock.placement_date) : "—"],
                  ["Registered",  formatDate(flock.created_at)],
                  ["Last Updated",formatDate(flock.updated_at)],
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

            <div className="space-y-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Farmer</p>
                <p className="font-semibold">{farmer?.full_name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">{farmer?.phone_number}</p>
                {farmer?.id_number && <p className="text-xs text-muted-foreground mt-1">ID: {farmer.id_number}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground">Feed Cost</p>
                  <p className="font-bold text-sm">Kes {formatNumber(totalFeedCost)}</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground">Other Expenses</p>
                  <p className="font-bold text-sm">Kes {formatNumber(totalExpenses)}</p>
                </div>
              </div>
            </div>
          </div>

          {vaccinations.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold">Vaccination History</h3></div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["Vaccine","Scheduled","Administered","Status"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {vaccinations.map((v, i) => (
                    <tr key={i} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{v.vaccine_type}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(v.scheduled_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.completed_date ? formatDate(v.completed_date) : "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.completed_date ? "completed" : "scheduled"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {mortality.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border"><h3 className="text-sm font-semibold">Mortality Claims</h3></div>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>{["Reported","Approved","Status","Date"].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {mortality.map(m => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">{formatNumber(m.claimed_deaths)}</td>
                      <td className="px-4 py-3">{m.actual_deaths ? formatNumber(m.actual_deaths) : "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status ?? "submitted"} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(m.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "medications" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Medication Records</h3>
            <Link href={`/flocks/${params.id}/medications/new`} className="text-xs text-edos-600 hover:underline">+ Add</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Drug","Disease Treated","Start","End","Dosage","Withdrawal",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!medications.length ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No medication records.</td></tr>
              ) : medications.map(m => (
                <tr key={m.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{m.medication_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.disease_treated ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(m.start_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.end_date ? formatDate(m.end_date) : "—"}</td>
                  <td className="px-4 py-3">{m.dosage ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.meat_withdrawal_date ? formatDate(m.meat_withdrawal_date) : "—"}</td>
                  <td className="px-4 py-3"><DeleteButton id={m.id} apiPath="/api/medications" label="record" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "weights" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Bird Weight Records</h3>
            <Link href={`/flocks/${params.id}/weights/new`} className="text-xs text-edos-600 hover:underline">+ Add</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Date","Sample","Avg Weight (g)","FCR",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!weights.length ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No weight records.</td></tr>
              ) : weights.map(w => (
                <tr key={w.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(w.weigh_date)}</td>
                  <td className="px-4 py-3">{w.sample_size ?? "—"}</td>
                  <td className="px-4 py-3 font-mono font-medium">{w.avg_weight_g != null ? formatNumber(w.avg_weight_g) : "—"}</td>
                  <td className="px-4 py-3 font-mono">{w.fcr != null ? w.fcr : "—"}</td>
                  <td className="px-4 py-3"><DeleteButton id={w.id} apiPath="/api/bird-weights" label="record" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "feed" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Feed Consumption</h3>
            <Link href={`/flocks/${params.id}/feed/new`} className="text-xs text-edos-600 hover:underline">+ Add</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Date","Type","Qty (kg)","Per Bird (g)","Cost (Kes)",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!feed.length ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No feed records.</td></tr>
              ) : feed.map(f => (
                <tr key={f.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(f.feed_date)}</td>
                  <td className="px-4 py-3">{f.feed_type ?? "—"}</td>
                  <td className="px-4 py-3 font-mono">{f.quantity_kg != null ? formatNumber(f.quantity_kg) : "—"}</td>
                  <td className="px-4 py-3 font-mono">{f.feed_per_bird_g != null ? f.feed_per_bird_g : "—"}</td>
                  <td className="px-4 py-3 font-mono">{f.total_cost != null ? formatNumber(f.total_cost) : "—"}</td>
                  <td className="px-4 py-3"><DeleteButton id={f.id} apiPath="/api/feed-consumption" label="record" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "expenses" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold">Flock Expenses</h3>
            <Link href={`/flocks/${params.id}/expenses/new`} className="text-xs text-edos-600 hover:underline">+ Add</Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>{["Date","Category","Description","Amount (Kes)",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!expenses.length ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No expenses recorded.</td></tr>
              ) : (
                <>
                  {expenses.map(e => (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(e.expense_date)}</td>
                      <td className="px-4 py-3 capitalize">{e.category?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{e.description ?? "—"}</td>
                      <td className="px-4 py-3 font-mono font-medium">{e.total_amount != null ? formatNumber(e.total_amount) : "—"}</td>
                      <td className="px-4 py-3"><DeleteButton id={e.id} apiPath="/api/flock-expenses" label="expense" /></td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30">
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-right">Total</td>
                    <td className="px-4 py-3 font-bold font-mono">Kes {formatNumber(totalExpenses)}</td>
                    <td />
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

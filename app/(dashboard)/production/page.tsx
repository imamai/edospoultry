import Link from "next/link";
import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { DeleteButton } from "@/components/shared/DeleteButton";
import { formatNumber } from "@/lib/utils";
import { Plus, Pencil, TrendingUp, Target } from "lucide-react";

export const metadata = { title: "Production" };

export default async function ProductionPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();
  const tab = searchParams.tab ?? "targets";

  const [targetsRes, forecastsRes] = await Promise.all([
    orgId
      ? supabase.from("production_targets")
          .select("id, metric, period_type, period_start, period_end, target_value, unit, actual_value, achievement_pct, farmers(full_name), farmer_flocks(flock_code)")
          .eq("organization_id", orgId).order("period_start", { ascending: false }).limit(300)
      : { data: [], error: null },
    orgId
      ? supabase.from("production_forecasts")
          .select("id, metric, forecast_date, forecast_start, forecast_end, forecasted_value, unit, actual_value, accuracy_pct, farmers(full_name), farmer_flocks(flock_code)")
          .eq("organization_id", orgId).order("forecast_date", { ascending: false }).limit(300)
      : { data: [], error: null },
  ]);

  const targets   = targetsRes.data ?? [];
  const forecasts = forecastsRes.data ?? [];

  const avgAchievement = targets.length
    ? (targets.filter(t => t.achievement_pct != null).reduce((s, t) => s + (t.achievement_pct ?? 0), 0) / targets.filter(t => t.achievement_pct != null).length).toFixed(1)
    : "0.0";
  const avgAccuracy = forecasts.length
    ? (forecasts.filter(f => f.accuracy_pct != null).reduce((s, f) => s + (f.accuracy_pct ?? 0), 0) / forecasts.filter(f => f.accuracy_pct != null).length).toFixed(1)
    : "0.0";

  const tabs = [
    { key: "targets",   label: "Targets",   count: targets.length,   icon: Target },
    { key: "forecasts", label: "Forecasts", count: forecasts.length, icon: TrendingUp },
  ];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Production"
        subtitle="Targets & Forecasts"
        actions={
          <div className="flex gap-2">
            <Link href="/production/targets/new" className="flex items-center gap-2 px-4 py-2 bg-edos-600 hover:bg-edos-700 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus size={16} /> New Target
            </Link>
            <Link href="/production/forecasts/new" className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted text-sm font-medium rounded-xl transition-colors">
              <Plus size={16} /> New Forecast
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg Target Achievement</p>
          <p className="text-2xl font-bold">{avgAchievement}%</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Avg Forecast Accuracy</p>
          <p className="text-2xl font-bold">{avgAccuracy}%</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key, label, count, icon: Icon }) => (
          <Link
            key={key}
            href={`/production?tab=${key}`}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              tab === key ? "bg-edos-600 text-white" : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon size={16} /> {label}
            <span className="ml-1 text-xs opacity-70">{count}</span>
          </Link>
        ))}
      </div>

      {tab === "targets" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Metric","Period Type","Start","End","Target","Actual","Achievement (%)","Farmer",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!targets.length ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                      No targets set. <Link href="/production/targets/new" className="text-edos-600 hover:underline">Set the first target</Link>
                    </td>
                  </tr>
                ) : (
                  targets.map(t => {
                    const farmer = t.farmers as { full_name: string } | null;
                    const flock  = t.farmer_flocks as { flock_code: string } | null;
                    const pct    = t.achievement_pct;
                    return (
                      <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 capitalize">{t.metric?.replace(/_/g, " ") ?? "—"}</td>
                        <td className="px-4 py-3 capitalize text-muted-foreground">{t.period_type ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.period_start ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{t.period_end ?? "—"}</td>
                        <td className="px-4 py-3 font-mono">{t.target_value != null ? formatNumber(t.target_value) : "—"}</td>
                        <td className="px-4 py-3 font-mono">{t.actual_value != null ? formatNumber(t.actual_value) : "—"}</td>
                        <td className="px-4 py-3">
                          {pct != null ? (
                            <span className={`font-medium ${pct >= 100 ? "text-green-600" : pct >= 80 ? "text-yellow-600" : "text-red-600"}`}>
                              {pct.toFixed(1)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">{farmer?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{flock?.flock_code ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/production/targets/${t.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors">
                              <Pencil size={14} />
                            </Link>
                            <DeleteButton id={t.id} apiPath="/api/production/targets" label="target" />
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
      )}

      {tab === "forecasts" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Metric","Forecast Date","Start","End","Forecasted","Actual","Accuracy (%)","Farmer",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {!forecasts.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                      No forecasts recorded. <Link href="/production/forecasts/new" className="text-edos-600 hover:underline">Add one</Link>
                    </td>
                  </tr>
                ) : (
                  forecasts.map(f => {
                    const farmer = f.farmers as { full_name: string } | null;
                    const flock  = f.farmer_flocks as { flock_code: string } | null;
                    return (
                      <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 capitalize">{f.metric?.replace(/_/g, " ") ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.forecast_date ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.forecast_start ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{f.forecast_end ?? "—"}</td>
                        <td className="px-4 py-3 font-mono">{f.forecasted_value != null ? formatNumber(f.forecasted_value) : "—"}</td>
                        <td className="px-4 py-3 font-mono">{f.actual_value != null ? formatNumber(f.actual_value) : "—"}</td>
                        <td className="px-4 py-3">
                          {f.accuracy_pct != null ? (
                            <span className={`font-medium ${f.accuracy_pct >= 90 ? "text-green-600" : f.accuracy_pct >= 70 ? "text-yellow-600" : "text-red-600"}`}>
                              {f.accuracy_pct.toFixed(1)}%
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">{farmer?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{flock?.flock_code ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Link href={`/production/forecasts/${f.id}/edit`} className="p-1.5 rounded-lg text-muted-foreground hover:text-edos-600 hover:bg-edos-50 transition-colors">
                              <Pencil size={14} />
                            </Link>
                            <DeleteButton id={f.id} apiPath="/api/production/forecasts" label="forecast" />
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
      )}
    </div>
  );
}

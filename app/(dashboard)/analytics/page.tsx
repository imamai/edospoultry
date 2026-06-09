import { createServerClient } from "@/lib/supabase/server";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const supabase = await createServerClient();

  const [wardSales, agentRankings, layerPerf, mortalityHotspots, etimsCompliance] = await Promise.all([
    supabase.from("mv_ward_sales_daily")
      .select("ward_id, sale_date, total_revenue, orders_count, chicks_sold, egg_trays_sold")
      .order("sale_date", { ascending: false }).limit(100),
    supabase.from("mv_agent_rankings")
      .select("agent_id, agent_name, county_name, period_month, total_orders, total_sales, commission_earned, county_rank, national_rank")
      .order("national_rank", { ascending: true }).limit(20),
    supabase.from("mv_layer_performance")
      .select("week_start, county_name, total_eggs, saleable_eggs, avg_hdp, feed_per_dozen_kg")
      .order("week_start", { ascending: false }).limit(30),
    supabase.from("mv_mortality_hotspots")
      .select("ward_id, ward_name, subcounty_name, county_name, avg_daily_mortality_pct, risk_level")
      .order("avg_daily_mortality_pct", { ascending: false }).limit(20),
    supabase.from("mv_etims_compliance")
      .select("organization_id, period_month, total_orders_gte5k, validated_count, compliance_pct")
      .order("period_month", { ascending: false }).limit(6),
  ]);

  return (
    <AnalyticsClient
      wardSales={wardSales.data ?? []}
      agentRankings={agentRankings.data ?? []}
      layerPerformance={layerPerf.data ?? []}
      mortalityHotspots={mortalityHotspots.data ?? []}
      etimsCompliance={etimsCompliance.data ?? []}
    />
  );
}

import { createServerClient, createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { AnalyticsClient } from "./AnalyticsClient";
import {
  forecastFeedDemand, predictMortalityRisk, forecastRevenue,
  forecastEggProduction, detectDiseaseRisk, optimizeFeedCost,
  vaccinationRecommendations,
  type FeedForecastRow, type MortalityPredictionRow, type RevenueForecastRow,
  type EggForecastRow, type DiseaseRiskRow, type FeedCostOptimizationRow,
  type VaccinationRecommendationRow,
} from "@/lib/ai/forecasting";

export interface AIInsights {
  feedForecasts:         FeedForecastRow[];
  mortalityPredictions:  MortalityPredictionRow[];
  revenueForecast:       RevenueForecastRow[];
  eggForecasts:          EggForecastRow[];
  diseaseRisks:          DiseaseRiskRow[];
  feedOptimizations:     FeedCostOptimizationRow[];
  vaccinationRecs:       VaccinationRecommendationRow[];
}

export const metadata = { title: "Analytics & Reports" };

type Svc = ReturnType<typeof createServiceClient>;

function getReportPeriodRange(period: string): { start: string; end: string } {
  const now = new Date();
  const thisMonthStart = now.toISOString().slice(0, 7) + "-01";
  switch (period) {
    case "quarter": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 2);
      return { start: d.toISOString().slice(0, 7) + "-01", end: thisMonthStart };
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return { start: d.toISOString().slice(0, 7) + "-01", end: thisMonthStart };
    }
    case "all":
      return { start: "2020-01-01", end: thisMonthStart };
    default: // month
      return { start: thisMonthStart, end: thisMonthStart };
  }
}

async function fetchReportData(
  svc: Svc,
  orgId: string,
  report: string,
  period: string
): Promise<Record<string, unknown>[]> {
  const { start, end } = getReportPeriodRange(period);

  switch (report) {
    case "mortality": {
      const { data } = await svc
        .from("mv_report_mortality")
        .select("*")
        .eq("organization_id", orgId)
        .gte("period_month", start)
        .lte("period_month", end)
        .order("period_month", { ascending: false })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "feed_consumption": {
      const { data } = await svc
        .from("mv_report_feed_consumption")
        .select("*")
        .eq("organization_id", orgId)
        .gte("period_month", start)
        .lte("period_month", end)
        .order("period_month", { ascending: false })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "vaccination": {
      const { data } = await svc
        .from("mv_report_vaccination")
        .select("*")
        .eq("organization_id", orgId)
        .gte("period_month", start)
        .lte("period_month", end)
        .order("period_month", { ascending: false })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "medication": {
      const { data } = await svc
        .from("mv_report_medication")
        .select("*")
        .eq("organization_id", orgId)
        .gte("period_month", start)
        .lte("period_month", end)
        .order("period_month", { ascending: false })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "production": {
      const { data } = await svc
        .from("production_targets")
        .select(
          "metric, period_type, period_start, period_end, target_value, unit, actual_value, achievement_pct, farmer_flocks(flock_code)"
        )
        .eq("organization_id", orgId)
        .gte("period_start", start)
        .lte("period_start", end)
        .order("period_start", { ascending: false })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "profitability": {
      const { data } = await svc
        .from("mv_report_profitability")
        .select("*")
        .eq("organization_id", orgId)
        .gte("period_month", start)
        .lte("period_month", end)
        .order("period_month", { ascending: false })
        .limit(60);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "egg_production": {
      const { data } = await svc
        .from("mv_report_egg_production")
        .select("*")
        .eq("organization_id", orgId)
        .gte("week_start", start)
        .lte("week_start", end)
        .order("week_start", { ascending: false })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "flock_performance": {
      const { data } = await svc
        .from("mv_report_flock_performance")
        .select("*")
        .eq("organization_id", orgId)
        .order("total_eggs_produced", { ascending: false })
        .limit(200);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "supplier_performance": {
      const { data } = await svc
        .from("mv_report_supplier_performance")
        .select("*")
        .eq("organization_id", orgId)
        .gte("period_month", start)
        .lte("period_month", end)
        .order("total_spend", { ascending: false })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "customer_purchase": {
      const { data } = await svc
        .from("mv_report_customer_purchase")
        .select("*")
        .eq("organization_id", orgId)
        .gte("period_month", start)
        .lte("period_month", end)
        .order("total_spent", { ascending: false })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "inventory_valuation": {
      const { data } = await svc
        .from("vw_report_inventory_valuation")
        .select("*")
        .eq("organization_id", orgId)
        .order("stock_status", { ascending: true })
        .limit(500);
      return (data ?? []) as Record<string, unknown>[];
    }

    case "cash_flow": {
      const { data } = await svc
        .from("mv_report_cash_flow")
        .select("*")
        .eq("organization_id", orgId)
        .gte("period_month", start)
        .lte("period_month", end)
        .order("period_month", { ascending: false })
        .limit(60);
      return (data ?? []) as Record<string, unknown>[];
    }

    default:
      return [];
  }
}

async function fetchAIInsights(svc: Svc, orgId: string): Promise<AIInsights> {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 1);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const [feedRes, mortalityRes, eggRes, profitRes, vacRes, medRes] = await Promise.all([
    svc.from("mv_report_feed_consumption")
      .select("flock_code, period_month, feed_type, total_kg, avg_cost_per_kg")
      .eq("organization_id", orgId)
      .gte("period_month", cutoffStr)
      .order("period_month", { ascending: true })
      .limit(500),

    svc.from("mv_report_mortality")
      .select("flock_code, period_month, mortality_pct, total_deaths, risk_level")
      .eq("organization_id", orgId)
      .gte("period_month", cutoffStr)
      .order("period_month", { ascending: true })
      .limit(500),

    svc.from("mv_report_egg_production")
      .select("flock_code, week_start, avg_hdp, total_eggs")
      .eq("organization_id", orgId)
      .gte("week_start", cutoffStr)
      .order("week_start", { ascending: true })
      .limit(500),

    svc.from("mv_report_profitability")
      .select("period_month, total_revenue, total_expenses, net_profit")
      .eq("organization_id", orgId)
      .order("period_month", { ascending: true })
      .limit(60),

    svc.from("vaccination_schedules")
      .select("flock_id, scheduled_date, completed_date, vaccine_type, farmer_flocks(flock_code)")
      .eq("organization_id", orgId)
      .not("completed_date", "is", null)
      .order("completed_date", { ascending: false })
      .limit(500),

    svc.from("mv_report_medication")
      .select("flock_code, period_month, treatment_courses")
      .eq("organization_id", orgId)
      .gte("period_month", cutoffStr)
      .limit(500),
  ]);

  const feedRows   = (feedRes.data   ?? []) as { flock_code: string; period_month: string; feed_type: string; total_kg: number; avg_cost_per_kg: number }[];
  const mortRows   = (mortalityRes.data ?? []) as { flock_code: string; period_month: string; mortality_pct: number; total_deaths: number; risk_level: string }[];
  const eggRows    = (eggRes.data    ?? []) as { flock_code: string; week_start: string; avg_hdp: number; total_eggs: number }[];
  const profRows   = (profitRes.data ?? []) as { period_month: string; total_revenue: number; total_expenses: number; net_profit: number }[];
  const vacRaw     = (vacRes.data    ?? []) as { flock_id: string; scheduled_date: string; completed_date: string | null; vaccine_type: string; farmer_flocks: { flock_code: string } | null }[];
  const medRows    = (medRes.data    ?? []) as { flock_code: string; period_month: string; treatment_courses: number }[];

  const vacRows = vacRaw
    .filter(r => r.completed_date && r.farmer_flocks?.flock_code)
    .map(r => ({
      flock_code:       r.farmer_flocks!.flock_code,
      vaccination_date: r.completed_date!,
      vaccine_type:     r.vaccine_type,
    }));

  return {
    feedForecasts:        forecastFeedDemand(feedRows),
    mortalityPredictions: predictMortalityRisk(mortRows),
    revenueForecast:      forecastRevenue(profRows),
    eggForecasts:         forecastEggProduction(eggRows),
    diseaseRisks:         detectDiseaseRisk(mortRows, vacRows, medRows),
    feedOptimizations:    optimizeFeedCost(feedRows),
    vaccinationRecs:      vaccinationRecommendations(vacRows, []),
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { tab?: string; report?: string; period?: string };
}) {
  const tab    = searchParams.tab    ?? "overview";
  const report = searchParams.report ?? "mortality";
  const period = searchParams.period ?? "month";

  // ── Overview data (existing MVs, no org filter needed) ──
  const supabase = await createServerClient();
  const [wardSales, agentRankings, layerPerf, mortalityHotspots, etimsCompliance] =
    await Promise.all([
      supabase
        .from("mv_ward_sales_daily")
        .select("ward_id, sale_date, total_revenue, orders_count, chicks_sold, egg_trays_sold")
        .order("sale_date", { ascending: false })
        .limit(100),
      supabase
        .from("mv_agent_rankings")
        .select("agent_id, agent_name, county_name, period_month, total_orders, total_sales, commission_earned, county_rank, national_rank")
        .order("national_rank", { ascending: true })
        .limit(20),
      supabase
        .from("mv_layer_performance")
        .select("week_start, county_name, total_eggs, saleable_eggs, avg_hdp, feed_per_dozen_kg")
        .order("week_start", { ascending: false })
        .limit(30),
      supabase
        .from("mv_mortality_hotspots")
        .select("ward_id, ward_name, subcounty_name, county_name, avg_daily_mortality_pct, risk_level")
        .order("avg_daily_mortality_pct", { ascending: false })
        .limit(20),
      supabase
        .from("mv_etims_compliance")
        .select("organization_id, period_month, total_orders_gte5k, validated_count, compliance_pct")
        .order("period_month", { ascending: false })
        .limit(6),
    ]);

  // ── Report data (org-scoped, fetched only when tab=reports) ──
  let reportRows: Record<string, unknown>[] = [];
  if (tab === "reports") {
    const { orgId } = await getOrgContext();
    if (orgId) {
      const svc = createServiceClient();
      reportRows = await fetchReportData(svc, orgId, report, period);
    }
  }

  // ── AI insights (org-scoped, fetched only when tab=ai) ──
  let aiInsights: AIInsights | null = null;
  if (tab === "ai") {
    const { orgId } = await getOrgContext();
    if (orgId) {
      const svc = createServiceClient();
      aiInsights = await fetchAIInsights(svc, orgId);
    }
  }

  return (
    <AnalyticsClient
      wardSales={wardSales.data ?? []}
      agentRankings={agentRankings.data ?? []}
      layerPerformance={layerPerf.data ?? []}
      mortalityHotspots={mortalityHotspots.data ?? []}
      etimsCompliance={etimsCompliance.data ?? []}
      tab={tab}
      report={report}
      period={period}
      reportRows={reportRows}
      aiInsights={aiInsights}
    />
  );
}

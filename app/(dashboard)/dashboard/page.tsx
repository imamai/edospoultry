import { createServiceClient, getOrgContext } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Dashboard" };

type ServiceClient = ReturnType<typeof createServiceClient>;

function getPeriodRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let daysBack: number;
  switch (period) {
    case "week":    daysBack = 7;   break;
    case "quarter": daysBack = 90;  break;
    case "year":    daysBack = 365; break;
    default:        daysBack = 30;
  }
  return {
    start: new Date(now.getTime() - daysBack * 86400000).toISOString().split("T")[0],
    end,
  };
}

async function getDashboardData(supabase: ServiceClient, orgId: string, periodStart: string, periodEnd: string) {
  const today      = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [
    farmersRes, flocksRes, ordersRes, todayEggsRes, monthRevenueRes,
    eggKpiRes, feedKpiRes, weightsKpiRes, revenueKpiRes,
    expensesKpiRes, vaccKpiRes, feedInvRes, vaccInvRes,
  ] = await Promise.all([
    supabase.from("farmers").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("farmer_flocks").select("current_quantity").eq("organization_id", orgId).eq("status", "active"),
    supabase.from("sales_orders").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("created_at", monthStart),
    supabase.from("egg_production_records").select("total_eggs_laid").eq("organization_id", orgId).eq("production_date", today),
    supabase.from("sales_orders").select("total_amount").eq("organization_id", orgId).gte("created_at", monthStart).in("status", ["confirmed", "delivered"]),
    supabase.from("egg_production_records").select("total_eggs_laid, mortality_count, hen_count").eq("organization_id", orgId).gte("production_date", periodStart).lte("production_date", periodEnd),
    supabase.from("feed_consumption").select("quantity_kg, total_cost").eq("organization_id", orgId).gte("consumption_date", periodStart).lte("consumption_date", periodEnd),
    supabase.from("bird_weights").select("avg_weight_g, fcr").eq("organization_id", orgId).gte("weigh_date", periodStart).lte("weigh_date", periodEnd),
    supabase.from("sales_orders").select("total_amount").eq("organization_id", orgId).gte("order_date", periodStart).lte("order_date", periodEnd).not("status", "in", "(draft,cancelled)"),
    supabase.from("flock_expenses").select("total_amount").eq("organization_id", orgId).gte("expense_date", periodStart).lte("expense_date", periodEnd),
    supabase.from("vaccination_schedules").select("completed_date").eq("organization_id", orgId).gte("scheduled_date", periodStart).lte("scheduled_date", periodEnd),
    supabase.from("feed_inventory").select("product_name, quantity_kg, minimum_stock_kg").eq("organization_id", orgId),
    supabase.from("vaccine_inventory").select("vaccine_name, quantity_doses, minimum_stock").eq("organization_id", orgId),
  ]);

  type FlockRow   = { current_quantity: number | null };
  type EggRow     = { total_eggs_laid: number | null; mortality_count: number | null; hen_count: number | null };
  type FeedRow    = { quantity_kg: number | null; total_cost: number | null };
  type WeightRow  = { avg_weight_g: number | null; fcr: number | null };
  type AmountRow  = { total_amount: number | null };
  type VaccRow    = { completed_date: string | null };
  type FeedInvRow = { product_name: string; quantity_kg: number | null; minimum_stock_kg: number | null };
  type VaccInvRow = { vaccine_name: string; quantity_doses: number | null; minimum_stock: number | null };

  const flocks     = (flocksRes.data    ?? []) as FlockRow[];
  const eggRows    = (eggKpiRes.data    ?? []) as EggRow[];
  const feedRows   = (feedKpiRes.data   ?? []) as FeedRow[];
  const wRows      = (weightsKpiRes.data ?? []) as WeightRow[];
  const revRows    = (revenueKpiRes.data ?? []) as AmountRow[];
  const expRows    = (expensesKpiRes.data ?? []) as AmountRow[];
  const vaccRows   = (vaccKpiRes.data   ?? []) as VaccRow[];
  const feedInv    = (feedInvRes.data   ?? []) as FeedInvRow[];
  const vaccInv    = (vaccInvRes.data   ?? []) as VaccInvRow[];

  const activeFlocks   = flocks.length;
  const birdPopulation = flocks.reduce((s, f) => s + (f.current_quantity ?? 0), 0);

  const eggProduction  = eggRows.reduce((s, e) => s + (e.total_eggs_laid  ?? 0), 0);
  const totalMortality = eggRows.reduce((s, e) => s + (e.mortality_count  ?? 0), 0);
  const totalHens      = eggRows.reduce((s, e) => s + (e.hen_count        ?? 0), 0);
  const mortalityPct   = totalHens > 0 ? (totalMortality / totalHens) * 100 : 0;

  const feedConsumptionKg = feedRows.reduce((s, r) => s + Number(r.quantity_kg  ?? 0), 0);
  const feedCost          = feedRows.reduce((s, r) => s + Number(r.total_cost   ?? 0), 0);

  const avgWeight = wRows.length
    ? wRows.reduce((s, w) => s + Number(w.avg_weight_g ?? 0), 0) / wRows.length : 0;
  const fcrFiltered = wRows.filter(w => w.fcr != null);
  const avgFCR = fcrFiltered.length
    ? fcrFiltered.reduce((s, w) => s + Number(w.fcr ?? 0), 0) / fcrFiltered.length : 0;

  const revenue  = revRows.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const expenses = expRows.reduce((s, e) => s + Number(e.total_amount ?? 0), 0);
  const profit   = revenue - expenses;

  const vaccCompliance = vaccRows.length > 0
    ? (vaccRows.filter(v => v.completed_date != null).length / vaccRows.length) * 100 : 0;

  const allInvItems = [
    ...feedInv.map(f => ({ name: f.product_name, qty: Number(f.quantity_kg ?? 0), min: Number(f.minimum_stock_kg ?? 500), unit: "kg" })),
    ...vaccInv.map(v => ({ name: v.vaccine_name,  qty: Number(v.quantity_doses ?? 0), min: Number(v.minimum_stock ?? 100),  unit: "doses" })),
  ];
  const invHealthPct = allInvItems.length > 0
    ? (allInvItems.filter(i => i.qty >= i.min).length / allInvItems.length) * 100 : 100;
  const lowStockItems = allInvItems.filter(i => i.qty < i.min);

  // Snapshot stats (existing)
  const todayEggs = ((todayEggsRes.data ?? []) as { total_eggs_laid: number | null }[])
    .reduce((s, r) => s + (r.total_eggs_laid ?? 0), 0);
  const monthRevenue = ((monthRevenueRes.data ?? []) as { total_amount: number | null }[])
    .reduce((s, r) => s + (r.total_amount ?? 0), 0);

  return {
    // snapshot (top row)
    farmers: farmersRes.count ?? 0,
    monthOrders: ordersRes.count ?? 0,
    todayEggs,
    monthRevenue,
    // KPIs
    activeFlocks,
    birdPopulation,
    eggProduction,
    mortalityPct,
    feedConsumptionKg,
    feedCost,
    avgWeight,
    avgFCR,
    revenue,
    expenses,
    profit,
    vaccCompliance,
    invHealthPct,
    lowStockItems,
  };
}

async function getRecentOrders(supabase: ServiceClient, orgId: string) {
  const { data } = await supabase
    .from("sales_orders")
    .select(`id, order_number, order_type, status, total_amount, created_at, farmers(full_name, phone_number)`)
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

async function getWardActivity(supabase: ServiceClient) {
  const { data } = await supabase
    .from("mv_ward_sales_daily")
    .select("ward_id, sale_date, total_revenue, orders_count")
    .order("sale_date", { ascending: false })
    .limit(30);
  return data ?? [];
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { period?: string };
}) {
  const period = searchParams.period ?? "month";
  const { start: periodStart, end: periodEnd } = getPeriodRange(period);
  const { orgId } = await getOrgContext();
  const supabase  = createServiceClient();

  const empty = {
    farmers: 0, monthOrders: 0, todayEggs: 0, monthRevenue: 0,
    activeFlocks: 0, birdPopulation: 0, eggProduction: 0, mortalityPct: 0,
    feedConsumptionKg: 0, feedCost: 0, avgWeight: 0, avgFCR: 0,
    revenue: 0, expenses: 0, profit: 0, vaccCompliance: 0,
    invHealthPct: 100, lowStockItems: [] as { name: string; qty: number; min: number; unit: string }[],
  };

  if (!orgId) {
    return <DashboardClient stats={empty} recentOrders={[]} wardActivity={[]} period={period} periodStart={periodStart} periodEnd={periodEnd} />;
  }

  const [stats, recentOrders, wardActivity] = await Promise.all([
    getDashboardData(supabase, orgId, periodStart, periodEnd),
    getRecentOrders(supabase, orgId),
    getWardActivity(supabase),
  ]);

  return <DashboardClient stats={stats} recentOrders={recentOrders} wardActivity={wardActivity} period={period} periodStart={periodStart} periodEnd={periodEnd} />;
}

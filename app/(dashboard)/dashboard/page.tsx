import { createServerClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Dashboard" };

async function getDashboardStats(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const [farmers, flocks, orders, eggs, revenue] = await Promise.all([
    supabase.from("farmers").select("id", { count: "exact", head: true }),
    supabase.from("farmer_flocks").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("sales_orders").select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase.from("egg_production_records").select("total_eggs_laid")
      .eq("record_date", today),
    supabase.from("sales_orders").select("total_amount")
      .gte("created_at", monthStart)
      .in("status", ["confirmed", "delivered"]),
  ]);

  const todayEggs = ((eggs.data ?? []) as { total_eggs_laid: number | null }[]).reduce((s, r) => s + (r.total_eggs_laid ?? 0), 0);
  const monthRevenue = ((revenue.data ?? []) as { total_amount: number | null }[]).reduce((s, r) => s + (r.total_amount ?? 0), 0);

  return {
    farmers: farmers.count ?? 0,
    activeFlocks: flocks.count ?? 0,
    monthOrders: orders.count ?? 0,
    todayEggs,
    monthRevenue,
  };
}

async function getRecentOrders(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data } = await supabase
    .from("sales_orders")
    .select(`
      id, order_number, order_type, status, total_amount, created_at,
      farmers(full_name, phone_number)
    `)
    .order("created_at", { ascending: false })
    .limit(8);
  return data ?? [];
}

async function getWardActivity(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data } = await supabase
    .from("mv_ward_sales_daily")
    .select("ward_id, sale_date, total_revenue, orders_count")
    .order("sale_date", { ascending: false })
    .limit(30);
  return data ?? [];
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const [stats, recentOrders, wardActivity] = await Promise.all([
    getDashboardStats(supabase),
    getRecentOrders(supabase),
    getWardActivity(supabase),
  ]);

  return <DashboardClient stats={stats} recentOrders={recentOrders} wardActivity={wardActivity} />;
}

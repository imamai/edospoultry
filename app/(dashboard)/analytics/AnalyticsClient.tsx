"use client";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

interface Props {
  wardSales: { ward_id: string; sale_date: string; total_revenue: number; orders_count: number; chicks_sold: number; egg_trays_sold: number }[];
  agentRankings: { agent_id: string; agent_name: string; county_name: string; period_month: string; total_orders: number; total_sales: number; commission_earned: number; county_rank: number; national_rank: number }[];
  layerPerformance: { week_start: string; county_name: string; total_eggs: number; saleable_eggs: number; avg_hdp: number; feed_per_dozen_kg: number }[];
  mortalityHotspots: { ward_id: string; ward_name: string; subcounty_name: string; county_name: string; avg_daily_mortality_pct: number; risk_level: string }[];
  etimsCompliance: { organization_id: string; period_month: string; total_orders_gte5k: number; validated_count: number; compliance_pct: number }[];
}

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a", medium: "#f59e0b", high: "#f97316", critical: "#dc2626",
};

export function AnalyticsClient({ wardSales, agentRankings, layerPerformance, mortalityHotspots, etimsCompliance }: Props) {
  // Aggregate ward sales by date
  const revenueByDate = Object.values(
    wardSales.reduce<Record<string, { date: string; revenue: number; orders: number }>>(
      (acc, r) => {
        acc[r.sale_date] = acc[r.sale_date]
          ? { ...acc[r.sale_date], revenue: acc[r.sale_date].revenue + r.total_revenue, orders: acc[r.sale_date].orders + r.orders_count }
          : { date: r.sale_date, revenue: r.total_revenue, orders: r.orders_count };
        return acc;
      }, {}
    )
  ).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  // HDP trend by week
  const hdpTrend = Object.values(
    layerPerformance.reduce<Record<string, { week: string; avgHdp: number; count: number }>>(
      (acc, r) => {
        if (!acc[r.week_start]) acc[r.week_start] = { week: r.week_start, avgHdp: 0, count: 0 };
        acc[r.week_start].avgHdp += r.avg_hdp;
        acc[r.week_start].count++;
        return acc;
      }, {}
    )
  ).map(r => ({ week: r.week, avgHdp: r.count ? r.avgHdp / r.count : 0 }))
   .sort((a, b) => a.week.localeCompare(b.week)).slice(-12);

  const card = "bg-card border border-border rounded-2xl p-5";
  const sectionTitle = "text-sm font-semibold mb-4";

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Analytics"
        subtitle="Ward-level insights, agent performance, and compliance"
      />

      {/* Revenue + Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={card}>
          <h3 className={sectionTitle}>Daily Revenue — Last 30 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                labelFormatter={l => formatDate(l as string)}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Bar dataKey="revenue" fill="#16a34a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={card}>
          <h3 className={sectionTitle}>Hen Day Production (HDP) — 12 Weeks</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hdpTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} domain={[0, 100]} />
              <Tooltip
                formatter={(v: number) => [`${v.toFixed(1)}%`, "Avg HDP"]}
                labelFormatter={l => `Week of ${formatDate(l as string)}`}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Line type="monotone" dataKey="avgHdp" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Agent Rankings + Mortality Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={card}>
          <h3 className={sectionTitle}>Top Agents — This Month</h3>
          <div className="space-y-2">
            {agentRankings.slice(0, 10).map((a, i) => (
              <div key={a.agent_id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < 3 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground"}`}>
                  {a.national_rank}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.agent_name}</p>
                  <p className="text-xs text-muted-foreground">{a.county_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{formatCurrency(a.total_sales)}</p>
                  <p className="text-xs text-muted-foreground">{a.total_orders} orders</p>
                </div>
              </div>
            ))}
            {agentRankings.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No agent data yet</p>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className={card}>
          <h3 className={sectionTitle}>Mortality Hotspots</h3>
          <div className="space-y-2">
            {mortalityHotspots.slice(0, 10).map(h => (
              <div key={h.ward_id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{h.ward_name}</p>
                  <p className="text-xs text-muted-foreground">{h.subcounty_name}, {h.county_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: RISK_COLORS[h.risk_level] ?? "#6b7280" }}>
                    {h.avg_daily_mortality_pct.toFixed(2)}%/day
                  </span>
                  <StatusBadge status={h.risk_level} />
                </div>
              </div>
            ))}
            {mortalityHotspots.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No mortality data yet</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* eTIMS Compliance */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={card}>
        <h3 className={sectionTitle}>eTIMS / KRA Compliance — Last 6 Months</h3>
        <div className="grid grid-cols-6 gap-3">
          {etimsCompliance.map(e => (
            <div key={e.period_month} className="text-center">
              <div
                className="w-full rounded-xl"
                style={{
                  height: "60px",
                  background: `linear-gradient(to top, ${e.compliance_pct >= 90 ? "#16a34a" : e.compliance_pct >= 70 ? "#f59e0b" : "#dc2626"} ${e.compliance_pct}%, hsl(var(--muted)) ${e.compliance_pct}%)`,
                }}
              />
              <p className="text-xs font-bold mt-1">{e.compliance_pct.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">{e.period_month.slice(0, 7)}</p>
            </div>
          ))}
          {etimsCompliance.length === 0 && (
            <div className="col-span-6 text-center py-8 text-muted-foreground text-sm">
              No eTIMS data yet. Orders ≥ KES 5,000 will generate compliance metrics.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

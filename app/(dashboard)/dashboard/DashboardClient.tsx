"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, Bird, ShoppingCart, Egg, TrendingUp, TrendingDown,
  Activity, Wheat, DollarSign, Scale, Target, Syringe,
  ShieldCheck, AlertTriangle, Package, PieChart,
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

interface LowStockItem {
  name: string;
  qty: number;
  min: number;
  unit: string;
}

interface Stats {
  // snapshot
  farmers: number;
  monthOrders: number;
  todayEggs: number;
  monthRevenue: number;
  // period KPIs
  activeFlocks: number;
  birdPopulation: number;
  eggProduction: number;
  mortalityPct: number;
  feedConsumptionKg: number;
  feedCost: number;
  avgWeight: number;
  avgFCR: number;
  revenue: number;
  expenses: number;
  profit: number;
  vaccCompliance: number;
  invHealthPct: number;
  lowStockItems: LowStockItem[];
}

interface Props {
  stats: Stats;
  recentOrders: {
    id: string;
    order_number: string;
    order_type: string;
    status: string;
    total_amount: number;
    created_at: string;
    farmers?: { full_name: string; phone_number: string } | null;
  }[];
  wardActivity: {
    ward_id: string;
    sale_date: string;
    total_revenue: number;
    orders_count: number;
  }[];
  period: string;
  periodStart: string;
  periodEnd: string;
}

const PERIODS = [
  { key: "week",    label: "Week"    },
  { key: "month",   label: "Month"   },
  { key: "quarter", label: "Quarter" },
  { key: "year",    label: "Year"    },
];

export function DashboardClient({ stats, recentOrders, wardActivity, period, periodStart, periodEnd }: Props) {
  const revenueByDay = Object.values(
    wardActivity.reduce<Record<string, { date: string; revenue: number; orders: number }>>(
      (acc, r) => {
        const key = r.sale_date;
        acc[key] = acc[key]
          ? { ...acc[key], revenue: acc[key].revenue + r.total_revenue, orders: acc[key].orders + r.orders_count }
          : { date: key, revenue: r.total_revenue, orders: r.orders_count };
        return acc;
      },
      {}
    )
  ).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);

  const { mortalityPct, avgFCR, vaccCompliance, invHealthPct, profit } = stats;

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Dashboard"
        subtitle={new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      />

      {/* ── Snapshot row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Registered Farmers"  value={stats.farmers}      icon={Users}        delay={0}    />
        <StatCard title="Orders This Month"    value={stats.monthOrders}  icon={ShoppingCart} delay={0.05} />
        <StatCard title="Eggs Today"           value={stats.todayEggs}    icon={Egg} suffix=" eggs" delay={0.1} />
        <StatCard title="Revenue This Month"   value={stats.monthRevenue} icon={TrendingUp} prefix="KES " iconColor="text-amber-600" delay={0.15} />
      </div>

      {/* ── Period KPIs ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            KPI Overview · {periodStart} → {periodEnd}
          </p>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Link
                key={p.key}
                href={`/dashboard?period=${p.key}`}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  period === p.key
                    ? "bg-edos-600 text-white"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Flocks & Production */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Active Flocks"   value={stats.activeFlocks}   icon={Bird}     iconColor="text-edos-600"  delay={0.2}  />
          <StatCard title="Bird Population" value={stats.birdPopulation} icon={Bird}     iconColor="text-blue-600"  delay={0.25} />
          <StatCard title="Egg Production"  value={stats.eggProduction}  icon={Egg}  suffix=" eggs" iconColor="text-yellow-600" delay={0.3} />
          <StatCard
            title="Mortality %"
            value={mortalityPct}
            suffix="%"
            decimals={2}
            icon={Activity}
            iconColor={mortalityPct > 5 ? "text-red-600" : "text-green-600"}
            delay={0.35}
          />
        </div>

        {/* Feed & Growth */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Feed Consumed"  value={stats.feedConsumptionKg} suffix=" kg" decimals={1} icon={Wheat}      iconColor="text-amber-600"  delay={0.4}  />
          <StatCard title="Feed Cost"      value={stats.feedCost}          prefix="KES " decimals={0} icon={DollarSign} iconColor="text-orange-600" delay={0.45} />
          <StatCard title="Avg Bird Weight" value={stats.avgWeight}         suffix=" g"  decimals={0} icon={Scale}      iconColor="text-purple-600" delay={0.5}  />
          <StatCard
            title="Feed Conv. Ratio"
            value={avgFCR}
            decimals={2}
            icon={Target}
            iconColor={avgFCR === 0 ? "text-muted-foreground" : avgFCR <= 2 ? "text-green-600" : "text-red-600"}
            delay={0.55}
          />
        </div>

        {/* Financials */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <StatCard title="Revenue"  value={stats.revenue}  prefix="KES " decimals={0} icon={TrendingUp}   iconColor="text-green-600" delay={0.6}  />
          <StatCard title="Expenses" value={stats.expenses} prefix="KES " decimals={0} icon={TrendingDown}  iconColor="text-red-600"   delay={0.65} />
          <StatCard
            title="Profit"
            value={profit}
            prefix="KES "
            decimals={0}
            icon={PieChart}
            iconColor={profit >= 0 ? "text-green-600" : "text-red-600"}
            delay={0.7}
          />
          <StatCard
            title="Vacc. Compliance"
            value={vaccCompliance}
            suffix="%"
            decimals={1}
            icon={Syringe}
            iconColor={vaccCompliance >= 80 ? "text-green-600" : "text-orange-500"}
            delay={0.75}
          />
        </div>

        {/* Inventory */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatCard
            title="Inventory Health"
            value={invHealthPct}
            suffix="%"
            decimals={1}
            icon={ShieldCheck}
            iconColor={invHealthPct >= 80 ? "text-green-600" : "text-orange-500"}
            delay={0.8}
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.35, ease: "easeOut" }}
            className="bg-card border border-border rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-edos-50 dark:bg-edos-950/30">
                <AlertTriangle size={20} className={stats.lowStockItems.length > 0 ? "text-red-600" : "text-green-600"} />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Low Stock Alerts</p>
                <p className="text-3xl font-bold">{stats.lowStockItems.length}</p>
              </div>
            </div>
            {stats.lowStockItems.length === 0 ? (
              <p className="text-xs text-muted-foreground">All items are above minimum stock levels.</p>
            ) : (
              <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                {stats.lowStockItems.map((item, i) => (
                  <li key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Package size={12} className="text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[160px]">{item.name}</span>
                    </span>
                    <span className="text-red-600 font-medium whitespace-nowrap ml-2">
                      {item.qty.toFixed(item.unit === "kg" ? 1 : 0)} / {item.min} {item.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-4">Revenue Trend — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueByDay} margin={{ left: 0, right: 4, bottom: 0, top: 4 }}>
              <defs>
                <linearGradient id="edosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), "Revenue"]}
                labelFormatter={l => formatDate(l as string)}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#edosGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-4">Daily Orders — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueByDay} margin={{ left: 0, right: 4, bottom: 0, top: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(v: number) => [formatNumber(v), "Orders"]}
                labelFormatter={l => formatDate(l as string)}
                contentStyle={{ borderRadius: "0.75rem", border: "1px solid hsl(var(--border))", fontSize: 12 }}
              />
              <Bar dataKey="orders" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ── Recent Orders ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Order #", "Farmer", "Type", "Status", "Amount", "Date"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-edos-700">{order.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{(order.farmers as { full_name: string; phone_number: string } | null)?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{(order.farmers as { full_name: string; phone_number: string } | null)?.phone_number}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{order.order_type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><StatusBadge status={order.status} dot /></td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(order.total_amount)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(order.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

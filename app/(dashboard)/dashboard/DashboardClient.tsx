"use client";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, Bird, ShoppingCart, Egg, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";

interface Props {
  stats: {
    farmers: number;
    activeFlocks: number;
    monthOrders: number;
    todayEggs: number;
    monthRevenue: number;
  };
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
}

export function DashboardClient({ stats, recentOrders, wardActivity }: Props) {
  // Aggregate ward activity into daily revenue chart
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

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        title="Dashboard"
        subtitle={`${new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`}
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Registered Farmers" value={stats.farmers} icon={Users} delay={0} />
        <StatCard title="Active Flocks" value={stats.activeFlocks} icon={Bird} delay={0.05} />
        <StatCard title="Orders This Month" value={stats.monthOrders} icon={ShoppingCart} delay={0.1} />
        <StatCard title="Eggs Today" value={stats.todayEggs} icon={Egg} suffix=" eggs" delay={0.15} />
        <StatCard
          title="Revenue This Month"
          value={stats.monthRevenue}
          prefix="KES "
          icon={TrendingUp}
          iconColor="text-amber-600"
          delay={0.2}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold mb-4">Revenue Trend — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueByDay} margin={{ left: 0, right: 4, bottom: 0, top: 4 }}>
              <defs>
                <linearGradient id="edosGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
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

        {/* Daily orders */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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

      {/* Recent orders */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
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
                    No orders yet. Orders will appear here once farmers start placing them.
                  </td>
                </tr>
              ) : (
                recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-edos-700">{order.order_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{order.farmers?.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.farmers?.phone_number}</p>
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

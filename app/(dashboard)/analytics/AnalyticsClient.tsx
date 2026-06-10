"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Activity, Wheat, Syringe, Pill, Target, TrendingUp,
  Egg, Bird, Package, Users, Box, DollarSign, BarChart3, FileBarChart2, Brain,
} from "lucide-react";
import { AIForecastingClient } from "./AIForecastingClient";
import type { AIInsights } from "./page";
import { PageHeader }    from "@/components/shared/PageHeader";
import { StatusBadge }   from "@/components/shared/StatusBadge";
import { ExportToolbar, type ExportCol } from "@/components/shared/ExportToolbar";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";

// ── Overview tab types ────────────────────────────────────────
interface Props {
  wardSales: { ward_id: string; sale_date: string; total_revenue: number; orders_count: number; chicks_sold: number; egg_trays_sold: number }[];
  agentRankings: { agent_id: string; agent_name: string; county_name: string; period_month: string; total_orders: number; total_sales: number; commission_earned: number; county_rank: number; national_rank: number }[];
  layerPerformance: { week_start: string; county_name: string; total_eggs: number; saleable_eggs: number; avg_hdp: number; feed_per_dozen_kg: number }[];
  mortalityHotspots: { ward_id: string; ward_name: string; subcounty_name: string; county_name: string; avg_daily_mortality_pct: number; risk_level: string }[];
  etimsCompliance: { organization_id: string; period_month: string; total_orders_gte5k: number; validated_count: number; compliance_pct: number }[];
  tab: string;
  report: string;
  period: string;
  reportRows: Record<string, unknown>[];
  aiInsights: AIInsights | null;
}

// ── Report catalogue ─────────────────────────────────────────
const REPORTS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: "mortality",            label: "Mortality",            icon: Activity     },
  { key: "feed_consumption",     label: "Feed Consumption",     icon: Wheat        },
  { key: "vaccination",          label: "Vaccination",          icon: Syringe      },
  { key: "medication",           label: "Medication",           icon: Pill         },
  { key: "production",           label: "Production Targets",   icon: Target       },
  { key: "profitability",        label: "Profitability",        icon: TrendingUp   },
  { key: "egg_production",       label: "Egg Production",       icon: Egg          },
  { key: "flock_performance",    label: "Flock Performance",    icon: Bird         },
  { key: "supplier_performance", label: "Supplier Performance", icon: Package      },
  { key: "customer_purchase",    label: "Customer Purchase",    icon: Users        },
  { key: "inventory_valuation",  label: "Inventory Valuation",  icon: Box          },
  { key: "cash_flow",            label: "Cash Flow",            icon: DollarSign   },
];

const PERIODS = [
  { key: "month",   label: "This Month" },
  { key: "quarter", label: "Quarter"    },
  { key: "year",    label: "Year"       },
  { key: "all",     label: "All Time"   },
];

// ── Column definitions per report ────────────────────────────
const REPORT_COLUMNS: Record<string, ExportCol[]> = {
  mortality: [
    { key: "period_month",  header: "Month"        },
    { key: "flock_code",    header: "Flock"        },
    { key: "total_deaths",  header: "Deaths"       },
    { key: "total_hen_days",header: "Hen Days"     },
    { key: "mortality_pct", header: "Mortality %"  },
    { key: "risk_level",    header: "Risk"         },
  ],
  feed_consumption: [
    { key: "period_month",        header: "Month"              },
    { key: "flock_code",          header: "Flock"              },
    { key: "feed_type",           header: "Type"               },
    { key: "product_name",        header: "Product"            },
    { key: "total_kg",            header: "Total (kg)"         },
    { key: "avg_cost_per_kg",     header: "Avg Cost/kg"        },
    { key: "total_cost",          header: "Total Cost (KES)"   },
    { key: "avg_feed_per_bird_g", header: "Feed/Bird (g)"      },
  ],
  vaccination: [
    { key: "period_month",     header: "Month"       },
    { key: "flock_code",       header: "Flock"       },
    { key: "vaccine_type",     header: "Vaccine"     },
    { key: "disease_target",   header: "Disease"     },
    { key: "total_scheduled",  header: "Scheduled"   },
    { key: "total_completed",  header: "Completed"   },
    { key: "compliance_pct",   header: "Compliance %" },
  ],
  medication: [
    { key: "period_month",        header: "Month"            },
    { key: "flock_code",          header: "Flock"            },
    { key: "medication_name",     header: "Medication"       },
    { key: "disease_treated",     header: "Disease"          },
    { key: "route",               header: "Route"            },
    { key: "treatment_courses",   header: "Courses"          },
    { key: "total_birds_treated", header: "Birds Treated"    },
    { key: "total_cost",          header: "Total Cost (KES)" },
    { key: "supplier",            header: "Supplier"         },
  ],
  production: [
    { key: "period_start",    header: "Period Start"    },
    { key: "period_end",      header: "Period End"      },
    { key: "metric",          header: "Metric"          },
    { key: "period_type",     header: "Type"            },
    { key: "target_value",    header: "Target"          },
    { key: "actual_value",    header: "Actual"          },
    { key: "achievement_pct", header: "Achievement %"   },
    { key: "unit",            header: "Unit"            },
  ],
  profitability: [
    { key: "period_month",      header: "Month"          },
    { key: "total_revenue",     header: "Revenue (KES)"  },
    { key: "total_expenses",    header: "Expenses (KES)" },
    { key: "net_profit",        header: "Net Profit (KES)"},
    { key: "profit_margin_pct", header: "Margin %"       },
  ],
  egg_production: [
    { key: "week_start",    header: "Week"           },
    { key: "flock_code",    header: "Flock"          },
    { key: "total_eggs",    header: "Total Eggs"     },
    { key: "saleable_eggs", header: "Saleable"       },
    { key: "cracked_eggs",  header: "Cracked"        },
    { key: "grade_a",       header: "Grade A"        },
    { key: "grade_b",       header: "Grade B"        },
    { key: "avg_hdp",       header: "HDP %"          },
    { key: "mortality_count",header: "Mortality"     },
  ],
  flock_performance: [
    { key: "flock_code",          header: "Flock"             },
    { key: "bird_category",       header: "Category"          },
    { key: "breed",               header: "Breed"             },
    { key: "status",              header: "Status"            },
    { key: "initial_quantity",    header: "Initial Birds"     },
    { key: "current_quantity",    header: "Current Birds"     },
    { key: "total_eggs_produced", header: "Total Eggs"        },
    { key: "avg_hdp",             header: "Avg HDP %"         },
    { key: "mortality_pct",       header: "Mortality %"       },
    { key: "avg_weight_g",        header: "Avg Weight (g)"    },
    { key: "avg_fcr",             header: "FCR"               },
    { key: "total_feed_kg",       header: "Feed (kg)"         },
    { key: "total_expenses",      header: "Expenses (KES)"    },
  ],
  supplier_performance: [
    { key: "period_month",       header: "Month"          },
    { key: "supplier_name",      header: "Supplier"       },
    { key: "category",           header: "Category"       },
    { key: "transaction_count",  header: "Transactions"   },
    { key: "total_spend",        header: "Total Spend (KES)" },
  ],
  customer_purchase: [
    { key: "period_month",       header: "Month"              },
    { key: "farmer_name",        header: "Customer"           },
    { key: "phone_number",       header: "Phone"              },
    { key: "total_orders",       header: "Orders"             },
    { key: "total_spent",        header: "Total Spent (KES)"  },
    { key: "total_paid",         header: "Paid (KES)"         },
    { key: "total_outstanding",  header: "Outstanding (KES)"  },
    { key: "total_chicks",       header: "Chicks"             },
    { key: "total_egg_trays",    header: "Egg Trays"          },
  ],
  inventory_valuation: [
    { key: "inventory_type", header: "Type"          },
    { key: "item_name",      header: "Item"          },
    { key: "category",       header: "Category"      },
    { key: "supplier",       header: "Supplier"      },
    { key: "quantity",       header: "Qty"           },
    { key: "unit",           header: "Unit"          },
    { key: "unit_price",     header: "Unit Price"    },
    { key: "total_value",    header: "Value (KES)"   },
    { key: "stock_status",   header: "Status"        },
    { key: "expiry_date",    header: "Expiry"        },
  ],
  cash_flow: [
    { key: "period_month",       header: "Month"                },
    { key: "total_inflow",       header: "Inflow (KES)"         },
    { key: "total_outflow",      header: "Outflow (KES)"        },
    { key: "net_cash_flow",      header: "Net Cash Flow (KES)"  },
    { key: "chick_sales",        header: "Chick Sales (KES)"    },
    { key: "egg_sales",          header: "Egg Sales (KES)"      },
    { key: "other_sales",        header: "Other Sales (KES)"    },
    { key: "feed_expense",       header: "Feed (KES)"           },
    { key: "medication_expense", header: "Medication (KES)"     },
    { key: "vaccine_expense",    header: "Vaccine (KES)"        },
    { key: "labor_expense",      header: "Labor (KES)"          },
    { key: "other_expense",      header: "Other Expense (KES)"  },
  ],
};

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a", medium: "#f59e0b", high: "#f97316", critical: "#dc2626",
};

const card = "bg-card border border-border rounded-2xl p-5";

// ── Helpers ───────────────────────────────────────────────────
function fmt(val: unknown, key: string): string {
  if (val == null) return "—";
  const s = String(val);
  if (key.includes("cost") || key.includes("spend") || key.includes("spent") ||
      key.includes("revenue") || key.includes("expense") || key.includes("profit") ||
      key.includes("inflow") || key.includes("outflow") || key.includes("cash_flow") ||
      key.includes("outstanding") || key.includes("paid") || key.includes("value")) {
    const n = Number(val);
    return isNaN(n) ? s : formatCurrency(n);
  }
  if (key.includes("pct") || key.includes("margin") || key.includes("compliance") ||
      key.includes("hdp") || key.includes("achievement")) {
    const n = Number(val);
    return isNaN(n) ? s : `${n.toFixed(1)}%`;
  }
  if (key.includes("_kg") || key === "total_kg") {
    const n = Number(val);
    return isNaN(n) ? s : `${Number(n.toFixed(1)).toLocaleString()} kg`;
  }
  return s;
}

// ── Report mini-chart ─────────────────────────────────────────
function ReportChart({ reportKey, rows }: { reportKey: string; rows: Record<string, unknown>[] }) {
  if (!rows.length) return null;

  if (reportKey === "profitability") {
    const data = [...rows].reverse().map(r => ({
      month: String(r.period_month ?? "").slice(0, 7),
      Revenue:  Number(r.total_revenue  ?? 0),
      Expenses: Number(r.total_expenses ?? 0),
      Profit:   Number(r.net_profit     ?? 0),
    }));
    return (
      <div className={`${card} mb-5`}>
        <h4 className="text-sm font-semibold mb-4">Monthly P&L</h4>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n]}
              contentStyle={{ borderRadius: "0.75rem", fontSize: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="Revenue"  stroke="#16a34a" fill="url(#gRev)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Expenses" stroke="#dc2626" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Profit"   stroke="#2563eb" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (reportKey === "cash_flow") {
    const data = [...rows].reverse().map(r => ({
      month:   String(r.period_month ?? "").slice(0, 7),
      Inflow:  Number(r.total_inflow  ?? 0),
      Outflow: Number(r.total_outflow ?? 0),
      Net:     Number(r.net_cash_flow ?? 0),
    }));
    return (
      <div className={`${card} mb-5`}>
        <h4 className="text-sm font-semibold mb-4">Monthly Cash Flow</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number, n: string) => [formatCurrency(v), n]}
              contentStyle={{ borderRadius: "0.75rem", fontSize: 12 }} />
            <Legend />
            <Bar dataKey="Inflow"  fill="#16a34a" radius={[3,3,0,0]} />
            <Bar dataKey="Outflow" fill="#dc2626" radius={[3,3,0,0]} />
            <Bar dataKey="Net"     fill="#2563eb" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (reportKey === "mortality") {
    const data = [...rows]
      .slice(0, 12)
      .reverse()
      .map(r => ({
        month: String(r.period_month ?? "").slice(0, 7),
        "Mortality %": Number(r.mortality_pct ?? 0),
      }));
    return (
      <div className={`${card} mb-5`}>
        <h4 className="text-sm font-semibold mb-4">Mortality % Trend</h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(2)}%`, "Mortality"]}
              contentStyle={{ borderRadius: "0.75rem", fontSize: 12 }} />
            <Line type="monotone" dataKey="Mortality %" stroke="#dc2626" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (reportKey === "egg_production") {
    const data = [...rows]
      .slice(0, 12)
      .reverse()
      .map(r => ({
        week: String(r.week_start ?? "").slice(5),
        "HDP %":      Number(r.avg_hdp    ?? 0),
        "Total Eggs": Number(r.total_eggs ?? 0),
      }));
    return (
      <div className={`${card} mb-5`}>
        <h4 className="text-sm font-semibold mb-4">Egg Production Trend</h4>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="week" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ borderRadius: "0.75rem", fontSize: 12 }} />
            <Bar dataKey="Total Eggs" fill="#f59e0b" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}

// ── Main component ────────────────────────────────────────────
export function AnalyticsClient({
  wardSales, agentRankings, layerPerformance, mortalityHotspots, etimsCompliance,
  tab, report, period, reportRows, aiInsights,
}: Props) {
  // ── Overview aggregations ──────────────────────────────────
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

  const activeReport = REPORTS.find(r => r.key === report) ?? REPORTS[0];
  const columns      = REPORT_COLUMNS[report] ?? [];

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        title="Analytics & Reports"
        subtitle="Ward-level insights, agent performance, and detailed reports"
      />

      {/* ── Main tab bar ── */}
      <div className="flex gap-2 border-b border-border pb-1">
        <Link
          href="/analytics"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors ${
            tab === "overview"
              ? "bg-edos-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BarChart3 size={15} /> Overview
        </Link>
        <Link
          href="/analytics?tab=reports"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors ${
            tab === "reports"
              ? "bg-edos-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileBarChart2 size={15} /> Reports
        </Link>
        <Link
          href="/analytics?tab=ai"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-colors ${
            tab === "ai"
              ? "bg-purple-600 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Brain size={15} /> AI &amp; Forecasting
        </Link>
      </div>

      {/* ══════════════════════════════════════════════════════
          OVERVIEW TAB
      ══════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <>
          {/* Revenue + HDP */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={card}>
              <h3 className="text-sm font-semibold mb-4">Daily Revenue — Last 30 Days</h3>
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
              <h3 className="text-sm font-semibold mb-4">Hen Day Production (HDP) — 12 Weeks</h3>
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
              <h3 className="text-sm font-semibold mb-4">Top Agents — This Month</h3>
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
                {!agentRankings.length && <p className="text-sm text-muted-foreground text-center py-8">No agent data yet</p>}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className={card}>
              <h3 className="text-sm font-semibold mb-4">Mortality Hotspots</h3>
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
                {!mortalityHotspots.length && <p className="text-sm text-muted-foreground text-center py-8">No mortality data yet</p>}
              </div>
            </motion.div>
          </div>

          {/* eTIMS Compliance */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={card}>
            <h3 className="text-sm font-semibold mb-4">eTIMS / KRA Compliance — Last 6 Months</h3>
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
              {!etimsCompliance.length && (
                <div className="col-span-6 text-center py-8 text-muted-foreground text-sm">
                  No eTIMS data yet. Orders ≥ KES 5,000 will generate compliance metrics.
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════
          REPORTS TAB
      ══════════════════════════════════════════════════════ */}
      {tab === "reports" && (
        <div className="flex gap-6">

          {/* ── Report selector sidebar ── */}
          <nav className="w-52 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">
              Report Type
            </p>
            <div className="space-y-0.5">
              {REPORTS.map(({ key, label, icon: Icon }) => (
                <Link
                  key={key}
                  href={`/analytics?tab=reports&report=${key}&period=${period}`}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                    report === key
                      ? "bg-edos-600 text-white font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </nav>

          {/* ── Report content ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Header row: title + period + export */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {(() => { const Icon = activeReport.icon; return <Icon size={18} className="text-edos-600" />; })()}
                <h2 className="text-lg font-bold">{activeReport.label} Report</h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Period filter */}
                <div className="flex gap-1">
                  {PERIODS.map(p => (
                    <Link
                      key={p.key}
                      href={`/analytics?tab=reports&report=${report}&period=${p.key}`}
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

                {/* Export */}
                {reportRows.length > 0 && (
                  <ExportToolbar
                    data={reportRows}
                    columns={columns}
                    filename={`${report}_report`}
                    title={`${activeReport.label} Report`}
                  />
                )}
              </div>
            </div>

            {/* Summary row */}
            <p className="text-xs text-muted-foreground">
              {reportRows.length === 0
                ? "No data for the selected period."
                : `${formatNumber(reportRows.length)} rows`}
            </p>

            {/* Mini chart (for supported reports) */}
            <ReportChart reportKey={report} rows={reportRows} />

            {/* Data table */}
            {reportRows.length > 0 && columns.length > 0 && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {columns.map(col => (
                          <th
                            key={col.key}
                            className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                          >
                            {col.header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportRows.slice(0, 200).map((row, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          {columns.map(col => {
                            const raw = row[col.key];
                            // special: risk_level / stock_status badge
                            if (col.key === "risk_level" || col.key === "stock_status") {
                              return (
                                <td key={col.key} className="px-4 py-2.5">
                                  <StatusBadge status={String(raw ?? "")} />
                                </td>
                              );
                            }
                            // flock from nested object (production report)
                            if (col.key === "farmer_flocks") {
                              const ff = raw as { flock_code?: string } | null;
                              return <td key={col.key} className="px-4 py-2.5 text-muted-foreground">{ff?.flock_code ?? "—"}</td>;
                            }
                            return (
                              <td
                                key={col.key}
                                className={`px-4 py-2.5 ${
                                  col.key === "risk_level" || col.key === "stock_status" ? "" :
                                  col.key.includes("pct") || col.key.includes("_pct") ? "font-medium" : ""
                                }`}
                              >
                                {fmt(raw, col.key)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {reportRows.length > 200 && (
                  <p className="px-4 py-3 text-xs text-muted-foreground border-t border-border">
                    Showing 200 of {reportRows.length} rows. Export to see all data.
                  </p>
                )}
              </div>
            )}

            {reportRows.length === 0 && (
              <div className={`${card} text-center py-16`}>
                {(() => { const Icon = activeReport.icon; return <Icon size={40} className="mx-auto text-muted-foreground mb-3 opacity-40" />; })()}
                <p className="text-sm text-muted-foreground">No data found for this period.</p>
                <p className="text-xs text-muted-foreground mt-1">Try selecting a wider period or check that data has been entered.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          AI & FORECASTING TAB
      ══════════════════════════════════════════════════════ */}
      {tab === "ai" && (
        aiInsights ? (
          <AIForecastingClient insights={aiInsights} />
        ) : (
          <div className={`${card} text-center py-16`}>
            <Brain size={40} className="mx-auto text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground">Unable to load AI insights.</p>
            <p className="text-xs text-muted-foreground mt-1">Ensure you are signed in to an organisation account.</p>
          </div>
        )
      )}
    </div>
  );
}

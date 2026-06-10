"use client";
import { motion } from "framer-motion";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import {
  Wheat, Activity, TrendingUp, Egg, ShieldAlert,
  DollarSign, Syringe, AlertTriangle, CheckCircle2, Clock, Zap,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { AIInsights } from "./page";

interface Props {
  insights: AIInsights;
}

const card = "bg-card border border-border rounded-2xl p-5";

// ── Confidence badge ──────────────────────────────────────────
function ConfBadge({ level }: { level: "high" | "medium" | "low" }) {
  const cls =
    level === "high"   ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
    : level === "medium" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Zap size={9} /> {level}
    </span>
  );
}

// ── Risk badge ────────────────────────────────────────────────
function RiskBadge({ level }: { level: string }) {
  const cls =
    level === "critical" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
    : level === "high"   ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
    : level === "medium" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {level}
    </span>
  );
}

// ── Trend arrow ───────────────────────────────────────────────
function TrendIcon({ trend }: { trend: "rising" | "stable" | "falling" | "declining" }) {
  if (trend === "rising")   return <span className="text-green-600 text-xs font-bold">↑ Rising</span>;
  if (trend === "falling" || trend === "declining") return <span className="text-red-500 text-xs font-bold">↓ Declining</span>;
  return <span className="text-muted-foreground text-xs">→ Stable</span>;
}

// ── Urgency badge ─────────────────────────────────────────────
function UrgencyBadge({ urgency }: { urgency: string }) {
  const cls =
    urgency === "overdue"  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
    : urgency === "due_soon" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
    : urgency === "upcoming" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
    : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
  const label =
    urgency === "overdue" ? "Overdue" : urgency === "due_soon" ? "Due Soon"
    : urgency === "upcoming" ? "Upcoming" : "Current";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
}

// ── Module header ─────────────────────────────────────────────
function ModuleHeader({
  icon: Icon, title, subtitle, color,
}: { icon: React.ElementType; title: string; subtitle: string; color: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={17} className="text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-base">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────
function Empty({ message = "Not enough historical data yet." }: { message?: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground mt-1">This model will activate once data accumulates.</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function AIForecastingClient({ insights }: Props) {
  const {
    feedForecasts, mortalityPredictions, revenueForecast,
    eggForecasts, diseaseRisks, feedOptimizations, vaccinationRecs,
  } = insights;

  const criticalAlerts = [
    ...diseaseRisks.filter(r => r.risk_level === "critical" || r.risk_level === "high"),
    ...mortalityPredictions.filter(r => r.risk_level === "critical" || r.risk_level === "high"),
    ...vaccinationRecs.filter(r => r.urgency === "overdue"),
  ].length;

  return (
    <div className="space-y-6">

      {/* ── Summary alert bar ── */}
      {criticalAlerts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
        >
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300 font-medium">
            {criticalAlerts} high-priority alert{criticalAlerts > 1 ? "s" : ""} require attention — review Disease Risk and Mortality sections below.
          </p>
        </motion.div>
      )}

      {/* ── 2-column grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MODULE 1 — Feed Demand Forecasting
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={card}
        >
          <ModuleHeader
            icon={Wheat}
            title="Feed Demand Forecasting"
            subtitle="Linear trend on monthly feed consumption — predicted demand for next 30 days per flock"
            color="bg-amber-500"
          />
          {!feedForecasts.length ? <Empty /> : (
            <>
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={feedForecasts.slice(0, 8)} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="flock_code" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v}kg`} />
                    <Tooltip
                      formatter={(v: number, n: string) => [
                        n === "forecast_next_30d_kg" ? `${formatNumber(v)} kg` : formatCurrency(v),
                        n === "forecast_next_30d_kg" ? "Forecast (kg)" : "Est. Cost",
                      ]}
                      contentStyle={{ borderRadius: "0.75rem", fontSize: 11 }}
                    />
                    <Bar dataKey="avg_monthly_kg"       name="Avg (kg)"       fill="hsl(var(--muted))"  radius={[3,3,0,0]} />
                    <Bar dataKey="forecast_next_30d_kg" name="Forecast (kg)"  fill="#f59e0b"             radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {feedForecasts.slice(0, 6).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <div>
                      <span className="font-medium font-mono text-xs">{r.flock_code}</span>
                      <span className="ml-2 text-muted-foreground text-xs capitalize">{r.feed_type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{formatNumber(r.forecast_next_30d_kg)} kg</span>
                      <span className="text-muted-foreground text-xs">{formatCurrency(r.forecast_cost_kes)}</span>
                      <ConfBadge level={r.confidence} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                Total 30-day feed spend estimate:{" "}
                <strong>{formatCurrency(feedForecasts.reduce((s, r) => s + r.forecast_cost_kes, 0))}</strong>
              </p>
            </>
          )}
        </motion.div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MODULE 2 — Mortality Prediction
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={card}
        >
          <ModuleHeader
            icon={Activity}
            title="Mortality Prediction"
            subtitle="Trend analysis on historical mortality rates — 30-day risk forecast per flock"
            color="bg-red-500"
          />
          {!mortalityPredictions.length ? <Empty /> : (
            <div className="space-y-3">
              {mortalityPredictions.slice(0, 8).map((r, i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{r.flock_code}</span>
                      <RiskBadge level={r.risk_level} />
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendIcon trend={r.trend} />
                      <span className="text-xs text-muted-foreground">Score: {r.risk_score}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Current: <strong className="text-foreground">{r.current_mortality_pct}%</strong></span>
                    <span>30d forecast: <strong className="text-foreground">{r.predicted_30d_mortality_pct}%</strong></span>
                  </div>
                  {r.drivers.length > 0 && (
                    <p className="text-xs text-muted-foreground">{r.drivers[0]}</p>
                  )}
                  <p className="text-xs font-medium" style={{
                    color: r.risk_level === "critical" ? "#dc2626"
                      : r.risk_level === "high" ? "#f97316"
                      : r.risk_level === "medium" ? "#f59e0b"
                      : "#16a34a"
                  }}>
                    {r.recommendation}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MODULE 3 — Revenue Forecasting
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={card}
        >
          <ModuleHeader
            icon={TrendingUp}
            title="Revenue Forecasting"
            subtitle="OLS regression on monthly P&L — 3-month revenue projection with confidence bands"
            color="bg-green-600"
          />
          {revenueForecast.length < 2 ? <Empty /> : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueForecast} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}   />
                    </linearGradient>
                    <linearGradient id="gForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, n: string) => [formatCurrency(v), n]}
                    contentStyle={{ borderRadius: "0.75rem", fontSize: 11 }}
                  />
                  <ReferenceLine
                    x={revenueForecast.find(r => r.type === "forecast")?.month}
                    stroke="#94a3b8"
                    strokeDasharray="4 2"
                    label={{ value: "Forecast →", fontSize: 10, fill: "#94a3b8" }}
                  />
                  <Area type="monotone" dataKey="upper_bound" stroke="none" fill="url(#gForecast)" name="Upper bound" />
                  <Area
                    type="monotone" dataKey="revenue" stroke="#16a34a" fill="url(#gActual)"
                    strokeWidth={2} dot={false} name="Revenue"
                  />
                  <Area type="monotone" dataKey="lower_bound" stroke="none" fill="white" name="Lower bound" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-3 flex gap-4">
                {revenueForecast.filter(r => r.type === "forecast").map((r, i) => (
                  <div key={i} className="flex-1 rounded-xl bg-muted/50 p-3 text-center">
                    <p className="text-xs text-muted-foreground">{r.month}</p>
                    <p className="font-bold text-sm mt-0.5">{formatCurrency(r.revenue)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatCurrency(r.lower_bound)} – {formatCurrency(r.upper_bound)}
                    </p>
                    <div className="mt-1"><ConfBadge level={r.confidence} /></div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MODULE 4 — Egg Production Forecasting
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={card}
        >
          <ModuleHeader
            icon={Egg}
            title="Egg Production Forecasting"
            subtitle="8-week HDP trend regression — next-week egg count and HDP prediction per flock"
            color="bg-yellow-500"
          />
          {!eggForecasts.length ? <Empty /> : (
            <>
              <div className="mb-4">
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={eggForecasts.slice(0, 8)} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="flock_code" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip contentStyle={{ borderRadius: "0.75rem", fontSize: 11 }} />
                    <Bar dataKey="current_avg_hdp"       name="Current HDP %"  fill="hsl(var(--muted))" radius={[3,3,0,0]} />
                    <Bar dataKey="forecast_next_week_hdp" name="Forecast HDP %" fill="#eab308"           radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {eggForecasts.slice(0, 6).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold">{r.flock_code}</span>
                      <TrendIcon trend={r.trend} />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span>HDP: <strong>{r.forecast_next_week_hdp}%</strong></span>
                      <span className="text-muted-foreground">{formatNumber(r.forecast_next_week_eggs)} eggs</span>
                      <ConfBadge level={r.confidence} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MODULE 5 — Disease Risk Detection
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`${card} xl:col-span-2`}
        >
          <ModuleHeader
            icon={ShieldAlert}
            title="Disease Risk Detection"
            subtitle="Composite risk score: mortality rate (40pts) + vaccination gap (30pts) + medication frequency (30pts)"
            color="bg-orange-500"
          />
          {!diseaseRisks.length ? <Empty /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {["Flock", "Risk Level", "Score", "Avg Mortality", "Vax Gap (days)", "Med Courses", "Risk Factors"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {diseaseRisks.slice(0, 12).map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs font-semibold">{r.flock_code}</td>
                      <td className="px-3 py-2.5"><RiskBadge level={r.risk_level} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${r.risk_score}%`, background: r.alert_color }}
                            />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: r.alert_color }}>{r.risk_score}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{r.mortality_signal}%</td>
                      <td className="px-3 py-2.5 text-xs">
                        {r.vaccination_gap_days !== null ? (
                          <span className={r.vaccination_gap_days > 90 ? "text-red-600 font-semibold" : r.vaccination_gap_days > 45 ? "text-amber-600" : "text-muted-foreground"}>
                            {r.vaccination_gap_days}d
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        <span className={r.medication_frequency >= 4 ? "text-red-600 font-semibold" : r.medication_frequency >= 2 ? "text-amber-600" : ""}>
                          {r.medication_frequency}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-xs">
                        {r.risk_factors.length > 0 ? r.risk_factors[0] : (
                          <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={11} /> No significant risk factors</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MODULE 6 — Feed Cost Optimization
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={card}
        >
          <ModuleHeader
            icon={DollarSign}
            title="Feed Cost Optimization"
            subtitle="Compares your average cost/kg against the median market price across all your purchases"
            color="bg-blue-600"
          />
          {!feedOptimizations.length ? <Empty /> : (
            <>
              <div className="mb-4">
                <div className="space-y-3">
                  {feedOptimizations.map((r, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm capitalize">{r.feed_type}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                            r.status === "overpaying" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                            : r.status === "review"   ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                          }`}>
                            {r.status === "overpaying" ? `+${r.overpay_pct}% over market`
                             : r.status === "review"   ? "Review"
                             : "Optimal"}
                          </span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-semibold">KES {r.org_avg_cost_per_kg}/kg</span>
                          <span className="text-muted-foreground ml-1">(market: KES {r.benchmark_cost_per_kg})</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, 50 + (r.overpay_pct / 2))}%`,
                            background: r.status === "overpaying" ? "#dc2626" : r.status === "review" ? "#f59e0b" : "#16a34a",
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{r.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
              {feedOptimizations.some(r => r.potential_monthly_saving > 0) && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                    Total potential monthly saving:{" "}
                    {formatCurrency(feedOptimizations.reduce((s, r) => s + r.potential_monthly_saving, 0))}
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            MODULE 7 — Vaccination Recommendation Engine
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={card}
        >
          <ModuleHeader
            icon={Syringe}
            title="Vaccination Recommendation Engine"
            subtitle="Based on standard poultry vaccination intervals — schedules overdue, due-soon, and upcoming doses"
            color="bg-purple-600"
          />
          {!vaccinationRecs.length ? <Empty message="No vaccination records found. Record vaccinations to activate this module." /> : (
            <div className="space-y-2">
              {vaccinationRecs.slice(0, 12).map((r, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="mt-0.5">
                    {r.urgency === "overdue" || r.urgency === "due_soon"
                      ? <AlertTriangle size={14} className="text-red-500" />
                      : r.urgency === "upcoming"
                      ? <Clock size={14} className="text-amber-500" />
                      : <CheckCircle2 size={14} className="text-green-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold">{r.flock_code}</span>
                      <span className="text-xs text-muted-foreground">{r.vaccine_type}</span>
                      <UrgencyBadge urgency={r.urgency} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.recommendation}</p>
                    <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span>Last: {r.last_vaccinated ?? "—"}</span>
                      <span>Next due: <strong className="text-foreground">{r.next_due_date}</strong></span>
                    </div>
                  </div>
                </div>
              ))}
              {vaccinationRecs.length > 12 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{vaccinationRecs.length - 12} more — showing priority items first
                </p>
              )}
            </div>
          )}
        </motion.div>

      </div>

      {/* ── Methodology note ── */}
      <div className="rounded-xl bg-muted/40 border border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          <strong>Methodology:</strong> All models use ordinary least-squares regression on your historical farm data —
          no external APIs or black-box ML. Feed and egg forecasts use 12-month windows;
          risk scores are rule-based composites calibrated to FAO poultry management benchmarks.
          Confidence ratings reflect data volume and regression R² fit.
        </p>
      </div>
    </div>
  );
}

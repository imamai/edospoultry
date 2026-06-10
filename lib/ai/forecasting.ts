/**
 * Statistical AI & Forecasting engine — rule-based + OLS linear regression.
 * All computation is pure TypeScript; no external ML APIs required.
 */

// ── Linear regression (OLS) ───────────────────────────────────────────────
export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}

export function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) {
    const c = n === 1 ? points[0].y : 0;
    return { slope: 0, intercept: c, r2: 0, predict: () => c };
  }
  const sumX  = points.reduce((s, p) => s + p.x, 0);
  const sumY  = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) || 0;
  const intercept = (sumY - slope * sumX) / n;
  const meanY     = sumY / n;
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  return { slope, intercept, r2, predict: (x: number) => Math.max(0, slope * x + intercept) };
}

function confLevel(r2: number, n: number): "high" | "medium" | "low" {
  if (n < 3) return "low";
  if (r2 >= 0.7 && n >= 6) return "high";
  if (r2 >= 0.4 || n >= 4) return "medium";
  return "low";
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ── 1. Feed Demand Forecasting ────────────────────────────────────────────
export interface FeedForecastRow {
  flock_code: string;
  feed_type: string;
  avg_monthly_kg: number;
  trend_kg_per_month: number;
  forecast_next_30d_kg: number;
  forecast_cost_kes: number;
  avg_cost_per_kg: number;
  confidence: "high" | "medium" | "low";
  data_points: number;
}

export interface FeedConsumptionInput {
  flock_code: string;
  period_month: string;
  feed_type: string;
  total_kg: number;
  avg_cost_per_kg: number;
}

export function forecastFeedDemand(rows: FeedConsumptionInput[]): FeedForecastRow[] {
  const groups = groupBy(rows, r => `${r.flock_code}::${r.feed_type}`);
  const results: FeedForecastRow[] = [];

  Object.entries(groups).forEach(([key, entries]) => {
    const sorted   = [...entries].sort((a, b) => a.period_month.localeCompare(b.period_month));
    const points   = sorted.map((r, i) => ({ x: i, y: r.total_kg }));
    const reg      = linearRegression(points);
    const avgKg    = sorted.reduce((s, r) => s + r.total_kg, 0) / sorted.length;
    const avgCpk   = sorted.reduce((s, r) => s + (r.avg_cost_per_kg ?? 0), 0) / sorted.length;
    const forecast = Math.max(0, reg.predict(sorted.length));
    const [flock_code, feed_type] = key.split("::");
    results.push({
      flock_code,
      feed_type,
      avg_monthly_kg:       Math.round(avgKg),
      trend_kg_per_month:   Math.round(reg.slope * 10) / 10,
      forecast_next_30d_kg: Math.round(forecast),
      forecast_cost_kes:    Math.round(forecast * avgCpk),
      avg_cost_per_kg:      Math.round(avgCpk * 100) / 100,
      confidence:           confLevel(reg.r2, sorted.length),
      data_points:          sorted.length,
    });
  });

  return results.sort((a, b) => b.forecast_next_30d_kg - a.forecast_next_30d_kg);
}

// ── 2. Mortality Prediction ───────────────────────────────────────────────
export interface MortalityPredictionRow {
  flock_code: string;
  current_mortality_pct: number;
  trend: "rising" | "stable" | "falling";
  predicted_30d_mortality_pct: number;
  risk_level: "low" | "medium" | "high" | "critical";
  risk_score: number;
  drivers: string[];
  recommendation: string;
}

export interface MortalityInput {
  flock_code: string;
  period_month: string;
  mortality_pct: number;
  total_deaths: number;
  risk_level: string;
}

export function predictMortalityRisk(rows: MortalityInput[]): MortalityPredictionRow[] {
  const groups = groupBy(rows, r => r.flock_code);
  const results: MortalityPredictionRow[] = [];

  Object.entries(groups).forEach(([flock_code, entries]) => {
    const sorted    = [...entries].sort((a, b) => a.period_month.localeCompare(b.period_month));
    const points    = sorted.map((r, i) => ({ x: i, y: r.mortality_pct }));
    const reg       = linearRegression(points);
    const last      = sorted[sorted.length - 1].mortality_pct;
    const predicted = Math.max(0, reg.predict(sorted.length));

    const trend: "rising" | "stable" | "falling" =
      reg.slope > 0.1 ? "rising" : reg.slope < -0.1 ? "falling" : "stable";

    const drivers: string[] = [];
    if (last > 3)           drivers.push(`Current rate ${last.toFixed(1)}% exceeds 3% threshold`);
    if (trend === "rising") drivers.push(`Upward trend (+${reg.slope.toFixed(2)}%/month)`);
    const highMonths = sorted.filter(r => r.mortality_pct > 5).length;
    if (highMonths >= 2)    drivers.push(`${highMonths} months with >5% mortality`);

    const score =
      (Math.min(last / 10, 1) * 40) +
      (trend === "rising" ? 30 : trend === "stable" ? 10 : 0) +
      (Math.min(highMonths / 3, 1) * 30);

    const risk_level: "low" | "medium" | "high" | "critical" =
      score >= 70 ? "critical" : score >= 45 ? "high" : score >= 20 ? "medium" : "low";

    const recommendation =
      risk_level === "critical" ? "Immediate veterinary inspection required"
      : risk_level === "high"   ? "Schedule vet visit within 3 days; review biosecurity"
      : risk_level === "medium" ? "Monitor daily; verify vaccination schedule is current"
      : "Continue current management; maintain records";

    results.push({
      flock_code,
      current_mortality_pct:      Math.round(last * 100) / 100,
      trend,
      predicted_30d_mortality_pct: Math.round(predicted * 100) / 100,
      risk_level,
      risk_score: Math.round(score),
      drivers,
      recommendation,
    });
  });

  return results.sort((a, b) => b.risk_score - a.risk_score);
}

// ── 3. Revenue Forecasting ────────────────────────────────────────────────
export interface RevenueForecastRow {
  month: string;
  type: "actual" | "forecast";
  revenue: number;
  lower_bound: number;
  upper_bound: number;
  confidence: "high" | "medium" | "low";
}

export interface ProfitabilityInput {
  period_month: string;
  total_revenue: number;
  total_expenses: number;
  net_profit: number;
}

export function forecastRevenue(rows: ProfitabilityInput[]): RevenueForecastRow[] {
  const sorted = [...rows].sort((a, b) => a.period_month.localeCompare(b.period_month));
  const result: RevenueForecastRow[] = sorted.map(r => ({
    month:       r.period_month.slice(0, 7),
    type:        "actual" as const,
    revenue:     r.total_revenue,
    lower_bound: r.total_revenue,
    upper_bound: r.total_revenue,
    confidence:  "high" as const,
  }));

  if (sorted.length < 2) return result;

  const points = sorted.map((r, i) => ({ x: i, y: r.total_revenue }));
  const reg    = linearRegression(points);
  const stdDev = Math.sqrt(
    points.reduce((s, p) => s + Math.pow(p.y - reg.predict(p.x), 2), 0) / points.length
  );
  const conf = confLevel(reg.r2, sorted.length);

  const lastDate = new Date(sorted[sorted.length - 1].period_month.slice(0, 7) + "-01");
  for (let i = 1; i <= 3; i++) {
    const d = new Date(lastDate);
    d.setMonth(d.getMonth() + i);
    const month     = d.toISOString().slice(0, 7);
    const predicted = Math.max(0, reg.predict(sorted.length - 1 + i));
    const margin    = stdDev * (1 + i * 0.15);
    result.push({
      month,
      type:        "forecast",
      revenue:     Math.round(predicted),
      lower_bound: Math.round(Math.max(0, predicted - margin)),
      upper_bound: Math.round(predicted + margin),
      confidence:  conf,
    });
  }
  return result;
}

// ── 4. Egg Production Forecasting ────────────────────────────────────────
export interface EggForecastRow {
  flock_code: string;
  current_avg_hdp: number;
  trend: "rising" | "stable" | "declining";
  forecast_next_week_hdp: number;
  forecast_next_week_eggs: number;
  current_flock_size: number;
  confidence: "high" | "medium" | "low";
}

export interface EggProductionInput {
  flock_code: string;
  week_start: string;
  avg_hdp: number;
  total_eggs: number;
}

export function forecastEggProduction(rows: EggProductionInput[]): EggForecastRow[] {
  const groups = groupBy(rows, r => r.flock_code);
  const results: EggForecastRow[] = [];

  Object.entries(groups).forEach(([flock_code, entries]) => {
    const sorted      = [...entries].sort((a, b) => a.week_start.localeCompare(b.week_start));
    const recent      = sorted.slice(-8);
    const points      = recent.map((r, i) => ({ x: i, y: r.avg_hdp }));
    const reg         = linearRegression(points);
    const last        = recent[recent.length - 1];
    const currentHdp  = last?.avg_hdp ?? 0;
    const currentEggs = last?.total_eggs ?? 0;
    const flockSize   = currentHdp > 0 ? Math.round((currentEggs * 100) / currentHdp) : 0;
    const forecastHdp = Math.min(100, Math.max(0, reg.predict(recent.length)));

    results.push({
      flock_code,
      current_avg_hdp:         Math.round(currentHdp * 10) / 10,
      trend:                   reg.slope > 0.5 ? "rising" : reg.slope < -0.5 ? "declining" : "stable",
      forecast_next_week_hdp:  Math.round(forecastHdp * 10) / 10,
      forecast_next_week_eggs: Math.round((forecastHdp / 100) * flockSize),
      current_flock_size:      flockSize,
      confidence:              confLevel(reg.r2, recent.length),
    });
  });

  return results.sort((a, b) => b.forecast_next_week_eggs - a.forecast_next_week_eggs);
}

// ── 5. Disease Risk Detection ─────────────────────────────────────────────
export interface DiseaseRiskRow {
  flock_code: string;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
  mortality_signal: number;
  vaccination_gap_days: number | null;
  medication_frequency: number;
  risk_factors: string[];
  alert_color: string;
}

export interface VaccinationInput {
  flock_code: string;
  vaccination_date: string;
  vaccine_type: string;
}

export interface MedicationUsageInput {
  flock_code: string;
  period_month: string;
  treatment_courses: number;
}

export function detectDiseaseRisk(
  mortalityRows: MortalityInput[],
  vaccinationRows: VaccinationInput[],
  medicationRows: MedicationUsageInput[]
): DiseaseRiskRow[] {
  const allFlocksSet = new Set<string>([
    ...mortalityRows.map(r => r.flock_code),
    ...vaccinationRows.map(r => r.flock_code),
    ...medicationRows.map(r => r.flock_code),
  ]);
  const allFlocks = Array.from(allFlocksSet);
  const now       = Date.now();
  const results: DiseaseRiskRow[] = [];

  allFlocks.forEach(flock_code => {
    const mRows = mortalityRows
      .filter(r => r.flock_code === flock_code)
      .sort((a, b) => b.period_month.localeCompare(a.period_month))
      .slice(0, 3);
    const mortalitySignal = mRows.length
      ? mRows.reduce((s, r) => s + r.mortality_pct, 0) / mRows.length
      : 0;

    const vRows = vaccinationRows
      .filter(r => r.flock_code === flock_code)
      .sort((a, b) => b.vaccination_date.localeCompare(a.vaccination_date));
    const lastVax = vRows[0]?.vaccination_date;
    const vaccinationGapDays = lastVax
      ? Math.floor((now - new Date(lastVax).getTime()) / 86400000)
      : null;

    const medRows           = medicationRows.filter(r => r.flock_code === flock_code);
    const medicationFrequency = medRows.reduce((s, r) => s + (r.treatment_courses ?? 0), 0);

    const risk_factors: string[] = [];
    let score = 0;

    if (mortalitySignal > 5)      { score += 35; risk_factors.push(`High avg mortality ${mortalitySignal.toFixed(1)}%`); }
    else if (mortalitySignal > 2) { score += 15; risk_factors.push(`Elevated mortality ${mortalitySignal.toFixed(1)}%`); }

    if (vaccinationGapDays !== null && vaccinationGapDays > 90) {
      score += 30; risk_factors.push(`No vaccination in ${vaccinationGapDays} days`);
    } else if (vaccinationGapDays !== null && vaccinationGapDays > 45) {
      score += 15; risk_factors.push(`Vaccination overdue (${vaccinationGapDays} days)`);
    }

    if (medicationFrequency >= 4)      { score += 35; risk_factors.push(`${medicationFrequency} treatment courses — frequent illness`); }
    else if (medicationFrequency >= 2) { score += 15; risk_factors.push(`${medicationFrequency} treatment courses in period`); }

    const risk_level: "low" | "medium" | "high" | "critical" =
      score >= 65 ? "critical" : score >= 40 ? "high" : score >= 20 ? "medium" : "low";

    results.push({
      flock_code,
      risk_score: score,
      risk_level,
      mortality_signal:     Math.round(mortalitySignal * 10) / 10,
      vaccination_gap_days: vaccinationGapDays,
      medication_frequency: medicationFrequency,
      risk_factors,
      alert_color:
        risk_level === "critical" ? "#dc2626"
        : risk_level === "high"   ? "#f97316"
        : risk_level === "medium" ? "#f59e0b"
        : "#16a34a",
    });
  });

  return results.sort((a, b) => b.risk_score - a.risk_score);
}

// ── 6. Feed Cost Optimization ─────────────────────────────────────────────
export interface FeedCostOptimizationRow {
  feed_type: string;
  org_avg_cost_per_kg: number;
  benchmark_cost_per_kg: number;
  overpay_pct: number;
  monthly_kg: number;
  potential_monthly_saving: number;
  status: "optimal" | "review" | "overpaying";
  recommendation: string;
}

export function optimizeFeedCost(rows: FeedConsumptionInput[]): FeedCostOptimizationRow[] {
  const groups = groupBy(rows.filter(r => r.avg_cost_per_kg > 0), r => r.feed_type);
  const results: FeedCostOptimizationRow[] = [];

  Object.entries(groups).forEach(([feed_type, entries]) => {
    const costs  = entries.map(e => e.avg_cost_per_kg);
    const sorted = [...costs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const orgAvg = costs.reduce((s, v) => s + v, 0) / costs.length;
    const totalKg = entries.reduce((s, r) => s + r.total_kg, 0) /
      Math.max(1, entries.reduce((acc, r) => { acc.add(r.period_month); return acc; }, new Set<string>()).size);
    const overpayPct     = ((orgAvg - median) / median) * 100;
    const monthlySaving  = totalKg * Math.max(0, orgAvg - median);

    const status: "optimal" | "review" | "overpaying" =
      overpayPct > 15 ? "overpaying" : overpayPct > 5 ? "review" : "optimal";

    results.push({
      feed_type,
      org_avg_cost_per_kg:      Math.round(orgAvg * 100) / 100,
      benchmark_cost_per_kg:    Math.round(median * 100) / 100,
      overpay_pct:              Math.round(overpayPct * 10) / 10,
      monthly_kg:               Math.round(totalKg),
      potential_monthly_saving: Math.round(monthlySaving),
      status,
      recommendation:
        status === "overpaying"
          ? `Negotiate with suppliers — paying ${overpayPct.toFixed(0)}% above market. Save ~KES ${Math.round(monthlySaving).toLocaleString()}/month`
          : status === "review"
          ? "Slightly above average — explore bulk purchase options"
          : "Cost at or below market rate — maintain current suppliers",
    });
  });

  return results.sort((a, b) => b.potential_monthly_saving - a.potential_monthly_saving);
}

// ── 7. Vaccination Recommendation Engine ──────────────────────────────────
export interface VaccinationRecommendationRow {
  flock_code: string;
  vaccine_type: string;
  last_vaccinated: string | null;
  days_since_last: number | null;
  recommended_interval_days: number;
  next_due_date: string;
  urgency: "overdue" | "due_soon" | "upcoming" | "current";
  days_until_due: number;
  recommendation: string;
}

const VACCINE_INTERVALS: Record<string, number> = {
  "Newcastle":              28,
  "Gumboro":                21,
  "Infectious Bronchitis":  28,
  "Marek's":               365,
  "Fowl Pox":              180,
  "Fowl Typhoid":           90,
  "Coccidiosis":            28,
  "default":                30,
};

export function vaccinationRecommendations(
  vaccinationRows: VaccinationInput[],
  _flockCodes: string[]
): VaccinationRecommendationRow[] {
  const groups = groupBy(vaccinationRows, r => `${r.flock_code}::${r.vaccine_type}`);
  const now    = new Date();
  const results: VaccinationRecommendationRow[] = [];

  Object.entries(groups).forEach(([key, entries]) => {
    const sorted   = [...entries].sort((a, b) => b.vaccination_date.localeCompare(a.vaccination_date));
    const last     = sorted[0];
    const [flock_code, vaccine_type] = key.split("::");
    const interval = VACCINE_INTERVALS[vaccine_type] ?? VACCINE_INTERVALS["default"];
    const lastDate = new Date(last.vaccination_date);
    const daysSince    = Math.floor((now.getTime() - lastDate.getTime()) / 86400000);
    const daysUntilDue = interval - daysSince;
    const dueDate      = new Date(lastDate.getTime() + interval * 86400000);

    const urgency: "overdue" | "due_soon" | "upcoming" | "current" =
      daysUntilDue <= 0  ? "overdue"
      : daysUntilDue <= 7  ? "due_soon"
      : daysUntilDue <= 21 ? "upcoming"
      : "current";

    results.push({
      flock_code,
      vaccine_type,
      last_vaccinated:           last.vaccination_date,
      days_since_last:           daysSince,
      recommended_interval_days: interval,
      next_due_date:             dueDate.toISOString().slice(0, 10),
      urgency,
      days_until_due:            daysUntilDue,
      recommendation:
        urgency === "overdue"  ? `OVERDUE by ${Math.abs(daysUntilDue)} days — vaccinate immediately`
        : urgency === "due_soon" ? `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"} — schedule this week`
        : urgency === "upcoming" ? `Due in ${daysUntilDue} days — plan next vaccination`
        : `On schedule — next dose ${dueDate.toISOString().slice(0, 10)}`,
    });
  });

  return results.sort((a, b) => a.days_until_due - b.days_until_due);
}

-- ============================================================
-- EdosHatch — Report Materialized Views & Refresh Function
-- Migration: 20260610000001
-- Adds 11 materialized views + 1 regular view for the
-- Analytics › Reports section. All org-scoped.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. MORTALITY REPORT
--    Monthly deaths, mortality %, and risk level per flock
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_mortality AS
SELECT
  e.organization_id,
  e.flock_id,
  ff.flock_code,
  DATE_TRUNC('month', e.production_date)::date AS period_month,
  SUM(e.mortality_count)                       AS total_deaths,
  SUM(e.hen_count)                             AS total_hen_days,
  ROUND(
    CASE WHEN SUM(e.hen_count) > 0
         THEN SUM(e.mortality_count)::numeric / SUM(e.hen_count) * 100
         ELSE 0 END, 3
  ) AS mortality_pct,
  CASE
    WHEN SUM(e.hen_count) = 0 THEN 'low'
    WHEN SUM(e.mortality_count)::numeric / SUM(e.hen_count) * 100 < 1   THEN 'low'
    WHEN SUM(e.mortality_count)::numeric / SUM(e.hen_count) * 100 < 3   THEN 'medium'
    WHEN SUM(e.mortality_count)::numeric / SUM(e.hen_count) * 100 < 5   THEN 'high'
    ELSE 'critical'
  END AS risk_level
FROM   public.egg_production_records e
LEFT JOIN public.farmer_flocks ff ON ff.id = e.flock_id
GROUP BY e.organization_id, e.flock_id, ff.flock_code,
         DATE_TRUNC('month', e.production_date)::date;

CREATE INDEX idx_mv_mortality_org_month
  ON public.mv_report_mortality (organization_id, period_month);

-- ============================================================
-- 2. FEED CONSUMPTION REPORT
--    Monthly feed usage by flock and product
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_feed_consumption AS
SELECT
  fc.organization_id,
  fc.flock_id,
  ff.flock_code,
  fc.feed_type,
  fc.product_name,
  DATE_TRUNC('month', fc.consumption_date)::date AS period_month,
  SUM(fc.quantity_kg)                             AS total_kg,
  ROUND(AVG(fc.cost_per_kg), 4)                   AS avg_cost_per_kg,
  SUM(fc.total_cost)                              AS total_cost,
  ROUND(AVG(fc.birds_count), 0)                   AS avg_birds,
  ROUND(AVG(fc.feed_per_bird_g), 1)               AS avg_feed_per_bird_g
FROM   public.feed_consumption fc
LEFT JOIN public.farmer_flocks ff ON ff.id = fc.flock_id
GROUP BY fc.organization_id, fc.flock_id, ff.flock_code,
         fc.feed_type, fc.product_name,
         DATE_TRUNC('month', fc.consumption_date)::date;

CREATE INDEX idx_mv_feed_cons_org_month
  ON public.mv_report_feed_consumption (organization_id, period_month);

-- ============================================================
-- 3. VACCINATION REPORT
--    Monthly vaccination schedule compliance per flock
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_vaccination AS
SELECT
  vs.organization_id,
  vs.flock_id,
  ff.flock_code,
  vs.vaccine_type,
  vs.disease_target,
  DATE_TRUNC('month', vs.scheduled_date)::date AS period_month,
  COUNT(*)                                      AS total_scheduled,
  COUNT(vs.completed_date)                      AS total_completed,
  ROUND(
    COUNT(vs.completed_date)::numeric / NULLIF(COUNT(*), 0) * 100, 1
  ) AS compliance_pct
FROM   public.vaccination_schedules vs
LEFT JOIN public.farmer_flocks ff ON ff.id = vs.flock_id
GROUP BY vs.organization_id, vs.flock_id, ff.flock_code,
         vs.vaccine_type, vs.disease_target,
         DATE_TRUNC('month', vs.scheduled_date)::date;

CREATE INDEX idx_mv_vaccination_org_month
  ON public.mv_report_vaccination (organization_id, period_month);

-- ============================================================
-- 4. MEDICATION REPORT
--    Monthly treatment events by flock and medication
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_medication AS
SELECT
  mr.organization_id,
  mr.flock_id,
  ff.flock_code,
  mr.medication_name,
  mr.active_ingredient,
  mr.disease_treated,
  mr.route,
  mr.supplier,
  DATE_TRUNC('month', mr.start_date)::date AS period_month,
  COUNT(*)                                  AS treatment_courses,
  SUM(mr.birds_treated)                    AS total_birds_treated,
  SUM(mr.total_cost)                       AS total_cost
FROM   public.medication_records mr
LEFT JOIN public.farmer_flocks ff ON ff.id = mr.flock_id
GROUP BY mr.organization_id, mr.flock_id, ff.flock_code,
         mr.medication_name, mr.active_ingredient, mr.disease_treated,
         mr.route, mr.supplier,
         DATE_TRUNC('month', mr.start_date)::date;

CREATE INDEX idx_mv_medication_org_month
  ON public.mv_report_medication (organization_id, period_month);

-- ============================================================
-- 5. PROFITABILITY REPORT
--    Monthly revenue vs expenses and net profit per org
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_profitability AS
SELECT
  org_id AS organization_id,
  period_month,
  SUM(CASE WHEN flow = 'revenue' THEN amount ELSE 0     END) AS total_revenue,
  SUM(CASE WHEN flow = 'expense' THEN amount ELSE 0     END) AS total_expenses,
  SUM(CASE WHEN flow = 'revenue' THEN amount ELSE -amount END) AS net_profit,
  ROUND(
    CASE WHEN SUM(CASE WHEN flow = 'revenue' THEN amount ELSE 0 END) > 0
         THEN SUM(CASE WHEN flow = 'revenue' THEN amount ELSE -amount END) /
              SUM(CASE WHEN flow = 'revenue' THEN amount ELSE 0 END) * 100
         ELSE 0 END, 2
  ) AS profit_margin_pct
FROM (
  SELECT organization_id AS org_id,
         DATE_TRUNC('month', order_date::date)::date AS period_month,
         total_amount AS amount, 'revenue' AS flow
  FROM   public.sales_orders
  WHERE  status NOT IN ('draft', 'cancelled')
  UNION ALL
  SELECT organization_id AS org_id,
         DATE_TRUNC('month', expense_date)::date AS period_month,
         total_amount AS amount, 'expense' AS flow
  FROM   public.flock_expenses
) sub
GROUP BY org_id, period_month;

CREATE INDEX idx_mv_profitability_org_month
  ON public.mv_report_profitability (organization_id, period_month);

-- ============================================================
-- 6. EGG PRODUCTION REPORT
--    Weekly egg output, grades, HDP, and mortality per flock
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_egg_production AS
SELECT
  e.organization_id,
  e.flock_id,
  ff.flock_code,
  DATE_TRUNC('week', e.production_date)::date AS week_start,
  SUM(e.total_eggs_laid)                       AS total_eggs,
  SUM(e.saleable_eggs)                         AS saleable_eggs,
  SUM(e.cracked_eggs)                          AS cracked_eggs,
  SUM(e.grade_a_count)                         AS grade_a,
  SUM(e.grade_b_count)                         AS grade_b,
  SUM(e.grade_c_count)                         AS grade_c,
  ROUND(AVG(e.hen_day_production), 2)          AS avg_hdp,
  ROUND(AVG(e.hen_count), 0)                   AS avg_hen_count,
  SUM(e.mortality_count)                       AS mortality_count
FROM   public.egg_production_records e
LEFT JOIN public.farmer_flocks ff ON ff.id = e.flock_id
GROUP BY e.organization_id, e.flock_id, ff.flock_code,
         DATE_TRUNC('week', e.production_date)::date;

CREATE INDEX idx_mv_egg_prod_org_week
  ON public.mv_report_egg_production (organization_id, week_start);

-- ============================================================
-- 7. FLOCK PERFORMANCE REPORT
--    Lifetime aggregated KPIs per flock
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_flock_performance AS
SELECT
  ff.organization_id,
  ff.id          AS flock_id,
  ff.flock_code,
  ff.bird_category,
  ff.breed,
  ff.initial_quantity,
  ff.current_quantity,
  ff.placement_date,
  ff.status,
  ff.purpose,
  COALESCE(ep.total_eggs,      0)  AS total_eggs_produced,
  COALESCE(ep.avg_hdp,         0)  AS avg_hdp,
  COALESCE(ep.total_mortality, 0)  AS total_mortality,
  ROUND(
    CASE WHEN ff.initial_quantity > 0
         THEN COALESCE(ep.total_mortality, 0)::numeric / ff.initial_quantity * 100
         ELSE 0 END, 2
  ) AS mortality_pct,
  COALESCE(bw.avg_weight_g, 0)    AS avg_weight_g,
  COALESCE(bw.avg_fcr,      0)    AS avg_fcr,
  COALESCE(fc.total_feed_kg,   0) AS total_feed_kg,
  COALESCE(fc.total_feed_cost, 0) AS total_feed_cost,
  COALESCE(exp.total_expenses, 0) AS total_expenses
FROM public.farmer_flocks ff
LEFT JOIN (
  SELECT flock_id,
         SUM(total_eggs_laid)        AS total_eggs,
         ROUND(AVG(hen_day_production), 2) AS avg_hdp,
         SUM(mortality_count)        AS total_mortality
  FROM   public.egg_production_records
  GROUP BY flock_id
) ep  ON ep.flock_id  = ff.id
LEFT JOIN (
  SELECT flock_id,
         ROUND(AVG(avg_weight_g), 0) AS avg_weight_g,
         ROUND(AVG(fcr), 3)          AS avg_fcr
  FROM   public.bird_weights
  GROUP BY flock_id
) bw  ON bw.flock_id  = ff.id
LEFT JOIN (
  SELECT flock_id,
         SUM(quantity_kg)  AS total_feed_kg,
         SUM(total_cost)   AS total_feed_cost
  FROM   public.feed_consumption
  GROUP BY flock_id
) fc  ON fc.flock_id  = ff.id
LEFT JOIN (
  SELECT flock_id,
         SUM(total_amount) AS total_expenses
  FROM   public.flock_expenses
  GROUP BY flock_id
) exp ON exp.flock_id = ff.id;

CREATE INDEX idx_mv_flock_perf_org
  ON public.mv_report_flock_performance (organization_id);

-- ============================================================
-- 8. SUPPLIER PERFORMANCE REPORT
--    Monthly supplier spend from flock_expenses + medication
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_supplier_performance AS
SELECT
  organization_id,
  supplier_name,
  category,
  DATE_TRUNC('month', txn_date)::date AS period_month,
  COUNT(*)    AS transaction_count,
  SUM(amount) AS total_spend
FROM (
  SELECT organization_id,
         vendor           AS supplier_name,
         category::text   AS category,
         expense_date     AS txn_date,
         total_amount     AS amount
  FROM   public.flock_expenses
  WHERE  vendor IS NOT NULL AND vendor <> ''
  UNION ALL
  SELECT organization_id,
         supplier         AS supplier_name,
         'medication'     AS category,
         start_date       AS txn_date,
         total_cost       AS amount
  FROM   public.medication_records
  WHERE  supplier IS NOT NULL AND supplier <> ''
    AND  total_cost IS NOT NULL
) sub
GROUP BY organization_id, supplier_name, category,
         DATE_TRUNC('month', txn_date)::date;

CREATE INDEX idx_mv_supplier_org_month
  ON public.mv_report_supplier_performance (organization_id, period_month);

-- ============================================================
-- 9. CUSTOMER PURCHASE REPORT
--    Monthly purchase history per farmer/customer
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_customer_purchase AS
SELECT
  so.organization_id,
  so.farmer_id,
  f.full_name     AS farmer_name,
  f.phone_number,
  DATE_TRUNC('month', so.order_date::date)::date AS period_month,
  COUNT(*)                                        AS total_orders,
  SUM(so.total_amount)                            AS total_spent,
  SUM(so.amount_paid)                             AS total_paid,
  SUM(so.balance_due)                             AS total_outstanding,
  SUM(so.chick_quantity)                          AS total_chicks,
  SUM(so.egg_trays)                               AS total_egg_trays
FROM   public.sales_orders so
LEFT JOIN public.farmers f ON f.id = so.farmer_id
WHERE  so.status NOT IN ('draft', 'cancelled')
GROUP BY so.organization_id, so.farmer_id, f.full_name, f.phone_number,
         DATE_TRUNC('month', so.order_date::date)::date;

CREATE INDEX idx_mv_cust_purchase_org_month
  ON public.mv_report_customer_purchase (organization_id, period_month);

-- ============================================================
-- 10. INVENTORY VALUATION REPORT
--     Regular view (not materialized) — always reflects current stock
-- ============================================================

CREATE VIEW public.vw_report_inventory_valuation AS
SELECT
  organization_id,
  'feed'                            AS inventory_type,
  product_name                      AS item_name,
  feed_type                         AS category,
  supplier,
  quantity_kg                       AS quantity,
  'kg'                              AS unit,
  unit_price_per_kg                 AS unit_price,
  ROUND(quantity_kg * COALESCE(unit_price_per_kg, 0), 2) AS total_value,
  minimum_stock_kg                  AS minimum_stock,
  CASE
    WHEN quantity_kg <= 0                      THEN 'out_of_stock'
    WHEN quantity_kg < minimum_stock_kg        THEN 'low_stock'
    ELSE 'adequate'
  END AS stock_status,
  expiry_date
FROM public.feed_inventory
UNION ALL
SELECT
  organization_id,
  'vaccine'                         AS inventory_type,
  vaccine_name                      AS item_name,
  disease_target                    AS category,
  supplier,
  quantity_doses::numeric           AS quantity,
  'doses'                           AS unit,
  unit_price                        AS unit_price,
  ROUND(quantity_doses * COALESCE(unit_price, 0), 2) AS total_value,
  minimum_stock::numeric            AS minimum_stock,
  CASE
    WHEN quantity_doses <= 0                   THEN 'out_of_stock'
    WHEN quantity_doses < minimum_stock        THEN 'low_stock'
    ELSE 'adequate'
  END AS stock_status,
  expiry_date
FROM public.vaccine_inventory;

-- ============================================================
-- 11. CASH FLOW REPORT
--     Monthly inflows (payments received) vs outflows (expenses)
-- ============================================================

CREATE MATERIALIZED VIEW public.mv_report_cash_flow AS
SELECT
  organization_id,
  period_month,
  SUM(CASE WHEN flow_type = 'inflow'  THEN amount ELSE 0 END) AS total_inflow,
  SUM(CASE WHEN flow_type = 'outflow' THEN amount ELSE 0 END) AS total_outflow,
  SUM(CASE WHEN flow_type = 'inflow'  THEN amount ELSE -amount END) AS net_cash_flow,
  -- inflow breakdown
  SUM(CASE WHEN category = 'chick_sales' THEN amount ELSE 0 END) AS chick_sales,
  SUM(CASE WHEN category = 'egg_sales'   THEN amount ELSE 0 END) AS egg_sales,
  SUM(CASE WHEN category = 'other_sales' THEN amount ELSE 0 END) AS other_sales,
  -- outflow breakdown (matches expense_category enum)
  SUM(CASE WHEN category = 'feed'         THEN amount ELSE 0 END) AS feed_expense,
  SUM(CASE WHEN category = 'medication'   THEN amount ELSE 0 END) AS medication_expense,
  SUM(CASE WHEN category = 'vaccine'      THEN amount ELSE 0 END) AS vaccine_expense,
  SUM(CASE WHEN category = 'labor'        THEN amount ELSE 0 END) AS labor_expense,
  SUM(CASE WHEN category NOT IN ('feed','medication','vaccine','labor','chick_sales','egg_sales','other_sales')
           THEN amount ELSE 0 END)                                 AS other_expense
FROM (
  -- inflows: actual payments received on orders
  SELECT organization_id,
         DATE_TRUNC('month', order_date::date)::date AS period_month,
         amount_paid AS amount,
         'inflow'    AS flow_type,
         CASE order_type
           WHEN 'chicks' THEN 'chick_sales'
           WHEN 'eggs'   THEN 'egg_sales'
           ELSE               'other_sales'
         END AS category
  FROM   public.sales_orders
  WHERE  status NOT IN ('draft', 'cancelled')
    AND  amount_paid > 0
  UNION ALL
  -- outflows: flock operating expenses
  SELECT organization_id,
         DATE_TRUNC('month', expense_date)::date AS period_month,
         total_amount AS amount,
         'outflow'    AS flow_type,
         category::text AS category
  FROM   public.flock_expenses
) sub
GROUP BY organization_id, period_month;

CREATE INDEX idx_mv_cash_flow_org_month
  ON public.mv_report_cash_flow (organization_id, period_month);

-- ============================================================
-- REFRESH FUNCTION
--    Call fn_refresh_report_mvs() from a scheduled job or
--    alongside fn_refresh_all_mvs() to keep reports up to date.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_refresh_report_mvs()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_report_mortality;
  REFRESH MATERIALIZED VIEW public.mv_report_feed_consumption;
  REFRESH MATERIALIZED VIEW public.mv_report_vaccination;
  REFRESH MATERIALIZED VIEW public.mv_report_medication;
  REFRESH MATERIALIZED VIEW public.mv_report_profitability;
  REFRESH MATERIALIZED VIEW public.mv_report_egg_production;
  REFRESH MATERIALIZED VIEW public.mv_report_flock_performance;
  REFRESH MATERIALIZED VIEW public.mv_report_supplier_performance;
  REFRESH MATERIALIZED VIEW public.mv_report_customer_purchase;
  REFRESH MATERIALIZED VIEW public.mv_report_cash_flow;
END;
$$;

COMMIT;

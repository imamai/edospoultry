-- ============================================================
-- EdosHatch — Materialized Views & Analytics
-- Refresh strategy: pg_cron nightly + on-demand trigger
-- ============================================================

BEGIN;

-- ============================================================
-- MV 1: Ward-level daily sales summary
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_ward_sales_daily AS
SELECT
  w.id                                                     AS ward_id,
  w.name                                                   AS ward_name,
  sc.id                                                    AS subcounty_id,
  sc.name                                                  AS subcounty_name,
  c.id                                                     AS county_id,
  c.name                                                   AS county_name,
  DATE(so.order_date)                                      AS sale_date,
  so.organization_id,
  COUNT(so.id)                                             AS total_orders,
  COALESCE(SUM(so.chick_quantity)    FILTER (WHERE so.order_type = 'chicks'), 0) AS total_chicks_sold,
  COALESCE(SUM(so.egg_trays)         FILTER (WHERE so.order_type = 'eggs'),   0) AS total_trays_sold,
  COALESCE(SUM(so.total_amount),     0)                    AS total_revenue,
  COALESCE(SUM(so.amount_paid),      0)                    AS total_collected,
  COUNT(DISTINCT so.farmer_id)                             AS unique_farmers_served,
  COUNT(DISTINCT so.agent_id)                              AS unique_agents_active
FROM public.sales_orders so
JOIN public.wards w ON w.id = so.delivery_ward_id
JOIN public.subcounties sc ON sc.id = w.subcounty_id
JOIN public.counties c ON c.id = w.county_id
WHERE so.status NOT IN ('draft','cancelled')
GROUP BY w.id, w.name, sc.id, sc.name, c.id, c.name, DATE(so.order_date), so.organization_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ward_sales_pk
  ON public.mv_ward_sales_daily(ward_id, sale_date, organization_id);
CREATE INDEX IF NOT EXISTS idx_mv_ward_sales_county
  ON public.mv_ward_sales_daily(county_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_mv_ward_sales_org_date
  ON public.mv_ward_sales_daily(organization_id, sale_date);

-- ============================================================
-- MV 2: Layer performance by ward (weekly)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_layer_performance AS
SELECT
  w.id                                                     AS ward_id,
  w.name                                                   AS ward_name,
  sc.id                                                    AS subcounty_id,
  sc.name                                                  AS subcounty_name,
  c.id                                                     AS county_id,
  ep.organization_id,
  DATE_TRUNC('week', ep.production_date)::date             AS week_start,
  COUNT(DISTINCT ep.flock_id)                              AS active_flocks,
  COUNT(DISTINCT ep.farmer_id)                             AS active_farmers,
  SUM(ep.total_eggs_laid)                                  AS total_eggs,
  SUM(ep.saleable_eggs)                                    AS saleable_eggs,
  SUM(ep.cracked_eggs)                                     AS cracked_eggs,
  SUM(ep.grade_a_count)                                    AS grade_a_total,
  SUM(ep.grade_b_count)                                    AS grade_b_total,
  SUM(ep.grade_c_count)                                    AS grade_c_total,
  ROUND(AVG(ep.hen_day_production), 2)                     AS avg_hen_day_production,
  SUM(ep.feed_consumption_kg)                              AS total_feed_kg,
  ROUND(
    CASE WHEN SUM(ep.saleable_eggs) > 0
    THEN SUM(ep.feed_consumption_kg) / (SUM(ep.saleable_eggs)::numeric / 12)
    ELSE NULL END, 3
  )                                                        AS feed_per_dozen_kg,
  SUM(ep.mortality_count)                                  AS total_mortality
FROM public.egg_production_records ep
JOIN public.farmers f ON f.id = ep.farmer_id
JOIN public.wards w ON w.id = f.ward_id
JOIN public.subcounties sc ON sc.id = w.subcounty_id
JOIN public.counties c ON c.id = w.county_id
GROUP BY w.id, w.name, sc.id, sc.name, c.id, ep.organization_id, DATE_TRUNC('week', ep.production_date)::date
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_layer_perf_pk
  ON public.mv_layer_performance(ward_id, week_start, organization_id);
CREATE INDEX IF NOT EXISTS idx_mv_layer_perf_county
  ON public.mv_layer_performance(county_id, week_start);

-- ============================================================
-- MV 3: Agent performance rankings (monthly)
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_agent_rankings AS
SELECT
  p.id                                                     AS agent_id,
  p.full_name                                              AS agent_name,
  p.county_id,
  c.name                                                   AS county_name,
  DATE_TRUNC('month', so.order_date)::date                 AS period_month,
  so.organization_id,
  COUNT(so.id)                                             AS total_orders,
  COALESCE(SUM(so.chick_quantity) FILTER (WHERE so.order_type = 'chicks'), 0) AS chicks_sold,
  COALESCE(SUM(so.egg_trays)      FILTER (WHERE so.order_type = 'eggs'),   0) AS egg_trays_sold,
  COALESCE(SUM(so.total_amount), 0)                        AS total_sales_value,
  COALESCE(SUM(so.total_amount) * 0.025, 0)               AS estimated_commission,
  COUNT(DISTINCT so.farmer_id)                             AS unique_farmers,
  COUNT(DISTINCT fv.id)                                    AS farm_visits,
  RANK() OVER (
    PARTITION BY so.organization_id, DATE_TRUNC('month', so.order_date)::date, p.county_id
    ORDER BY SUM(so.total_amount) DESC
  )                                                        AS county_rank,
  RANK() OVER (
    PARTITION BY so.organization_id, DATE_TRUNC('month', so.order_date)::date
    ORDER BY SUM(so.total_amount) DESC
  )                                                        AS national_rank
FROM public.profiles p
JOIN public.sales_orders so ON so.agent_id = p.id AND so.status NOT IN ('draft','cancelled')
LEFT JOIN public.counties c ON c.id = p.county_id
LEFT JOIN public.farmer_visits fv ON fv.agent_id = p.id
  AND DATE_TRUNC('month', fv.visit_date) = DATE_TRUNC('month', so.order_date)
WHERE p.role = 'agent'
GROUP BY p.id, p.full_name, p.county_id, c.name, DATE_TRUNC('month', so.order_date)::date, so.organization_id
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_agent_rankings_pk
  ON public.mv_agent_rankings(agent_id, period_month, organization_id);
CREATE INDEX IF NOT EXISTS idx_mv_agent_rank_org_month
  ON public.mv_agent_rankings(organization_id, period_month);
CREATE INDEX IF NOT EXISTS idx_mv_agent_rank_county
  ON public.mv_agent_rankings(county_id, period_month);

-- ============================================================
-- MV 4: Mortality hotspots
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_mortality_hotspots AS
SELECT
  w.id                                                     AS ward_id,
  w.name                                                   AS ward_name,
  sc.id                                                    AS subcounty_id,
  c.id                                                     AS county_id,
  f.organization_id,
  DATE_TRUNC('month', ep.production_date)::date            AS period_month,
  COUNT(DISTINCT ep.flock_id)                              AS flocks_tracked,
  SUM(ep.mortality_count)                                  AS total_deaths,
  ROUND(AVG(ep.mortality_count::numeric / NULLIF(ep.hen_count, 0) * 100), 3) AS avg_daily_mortality_pct,
  CASE
    WHEN AVG(ep.mortality_count::numeric / NULLIF(ep.hen_count, 0) * 100) > 0.5 THEN 'critical'
    WHEN AVG(ep.mortality_count::numeric / NULLIF(ep.hen_count, 0) * 100) > 0.2 THEN 'high'
    WHEN AVG(ep.mortality_count::numeric / NULLIF(ep.hen_count, 0) * 100) > 0.1 THEN 'medium'
    ELSE 'low'
  END                                                      AS risk_level
FROM public.egg_production_records ep
JOIN public.farmers f ON f.id = ep.farmer_id
JOIN public.wards w ON w.id = f.ward_id
JOIN public.subcounties sc ON sc.id = w.subcounty_id
JOIN public.counties c ON c.id = w.county_id
WHERE ep.production_date >= CURRENT_DATE - interval '90 days'
GROUP BY w.id, w.name, sc.id, c.id, f.organization_id, DATE_TRUNC('month', ep.production_date)::date
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_mortality_hotspots_pk
  ON public.mv_mortality_hotspots(ward_id, period_month, organization_id);
CREATE INDEX IF NOT EXISTS idx_mv_mortality_county
  ON public.mv_mortality_hotspots(county_id, period_month);

-- ============================================================
-- MV 5: eTIMS compliance
-- ============================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_etims_compliance AS
SELECT
  so.organization_id,
  DATE_TRUNC('month', so.order_date)::date                 AS period_month,
  COUNT(so.id)                                             AS total_orders,
  COUNT(ei.id)                                             AS invoiced_orders,
  COUNT(so.id) FILTER (WHERE so.total_amount >= 5000)      AS orders_requiring_etims,
  COUNT(ei.id) FILTER (WHERE ei.kra_validation_status = 'validated') AS validated_invoices,
  ROUND(
    COUNT(ei.id)::numeric / NULLIF(COUNT(so.id) FILTER (WHERE so.total_amount >= 5000), 0) * 100, 1
  )                                                        AS compliance_pct
FROM public.sales_orders so
LEFT JOIN public.etims_invoices ei ON ei.order_id = so.id
WHERE so.status NOT IN ('draft','cancelled')
GROUP BY so.organization_id, DATE_TRUNC('month', so.order_date)::date
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_etims_compliance_pk
  ON public.mv_etims_compliance(organization_id, period_month);
CREATE INDEX IF NOT EXISTS idx_mv_etims_org_month
  ON public.mv_etims_compliance(organization_id, period_month);

-- ============================================================
-- REGULAR VIEW: Active flock summary (no materialization needed)
-- ============================================================

CREATE OR REPLACE VIEW public.vw_active_flocks AS
SELECT
  ff.id,
  ff.organization_id,
  ff.farmer_id,
  fa.full_name                                             AS farmer_name,
  fa.phone_number                                          AS farmer_phone,
  fa.ward_id,
  w.name                                                   AS ward_name,
  sc.name                                                  AS subcounty_name,
  co.name                                                  AS county_name,
  ff.bird_category,
  ff.breed,
  ff.initial_quantity,
  ff.current_quantity,
  ff.placement_date,
  CURRENT_DATE - ff.placement_date                        AS age_days,
  ROUND((CURRENT_DATE - ff.placement_date)::numeric / 7, 1) AS age_weeks,
  ff.status,
  ff.purpose,
  -- Latest egg production (layers only)
  ep.total_eggs_laid                                       AS eggs_today,
  ep.hen_day_production                                    AS hdp_today,
  ep.feed_consumption_kg                                   AS feed_today_kg
FROM public.farmer_flocks ff
JOIN public.farmers fa ON fa.id = ff.farmer_id
LEFT JOIN public.wards w ON w.id = fa.ward_id
LEFT JOIN public.subcounties sc ON sc.id = w.subcounty_id
LEFT JOIN public.counties co ON co.id = w.county_id
LEFT JOIN LATERAL (
  SELECT total_eggs_laid, hen_day_production, feed_consumption_kg
  FROM public.egg_production_records
  WHERE flock_id = ff.id AND production_date = CURRENT_DATE
  LIMIT 1
) ep ON true
WHERE ff.status = 'active';

-- ============================================================
-- FUNCTION: Refresh all materialized views
-- Call via pg_cron or manual trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_refresh_all_mvs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_ward_sales_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_layer_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_agent_rankings;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_mortality_hotspots;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_etims_compliance;
END;
$$;

-- ============================================================
-- ANALYTICS SQL QUERIES (stored as comments for Superset)
-- ============================================================

COMMENT ON MATERIALIZED VIEW public.mv_ward_sales_daily IS
'Superset: Ward-level sales heatmap — join with Kenya GeoJSON for choropleth';

COMMENT ON MATERIALIZED VIEW public.mv_layer_performance IS
'Superset: Layer health dashboard — HDP%, FCR, breakage by ward/week';

COMMENT ON MATERIALIZED VIEW public.mv_agent_rankings IS
'Superset: Agent leaderboard — top 10 agents per county per month';

COMMIT;

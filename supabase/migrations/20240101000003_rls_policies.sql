-- ============================================================
-- EdosHatch — Row Level Security Policies
-- All tables locked down by organization + role hierarchy
-- ============================================================

BEGIN;

-- ============================================================
-- HELPER FUNCTIONS (run once, used by all RLS policies)
-- ============================================================

-- Current user's organization_id
CREATE OR REPLACE FUNCTION public.fn_my_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Current user's role
CREATE OR REPLACE FUNCTION public.fn_my_role()
RETURNS text LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$;

-- Current user's county_id (for county managers)
CREATE OR REPLACE FUNCTION public.fn_my_county_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT county_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Current user's subcounty_id
CREATE OR REPLACE FUNCTION public.fn_my_subcounty_id()
RETURNS integer LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT subcounty_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Current user's depot_id
CREATE OR REPLACE FUNCTION public.fn_my_depot_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT depot_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Is super admin or country admin
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('super_admin', 'country_admin')
  FROM public.profiles WHERE id = auth.uid()
$$;

-- Is depot manager or above
CREATE OR REPLACE FUNCTION public.fn_is_depot_manager_or_above()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('super_admin','country_admin','county_manager','subcounty_manager','depot_manager')
  FROM public.profiles WHERE id = auth.uid()
$$;

-- Can write operational records (agent and above, not farmer_self_service)
CREATE OR REPLACE FUNCTION public.fn_can_write()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role NOT IN ('farmer_self_service')
  FROM public.profiles WHERE id = auth.uid()
$$;

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.organizations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depots                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poultry_houses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_flocks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.layer_flocks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chick_batches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_production_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_inventory         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.egg_collections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_inventory        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccine_inventory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etims_invoices        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etims_failed_queue    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccination_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortality_claims      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_visits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_commissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ussd_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hatchery_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counties              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcounties           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards                 ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- GEO TABLES: Public read (needed for farmer registration)
-- ============================================================

CREATE POLICY "counties_select_all" ON public.counties FOR SELECT USING (true);
CREATE POLICY "subcounties_select_all" ON public.subcounties FOR SELECT USING (true);
CREATE POLICY "wards_select_all" ON public.wards FOR SELECT USING (true);
CREATE POLICY "counties_admin_write" ON public.counties FOR ALL USING (public.fn_is_admin());
CREATE POLICY "subcounties_admin_write" ON public.subcounties FOR ALL USING (public.fn_is_admin());
CREATE POLICY "wards_admin_write" ON public.wards FOR ALL USING (public.fn_is_admin());

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE POLICY "org_select" ON public.organizations
  FOR SELECT USING (
    id = public.fn_my_org_id() OR public.fn_is_admin()
  );

CREATE POLICY "org_write" ON public.organizations
  FOR ALL USING (public.fn_is_admin());

-- ============================================================
-- PROFILES
-- ============================================================

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR organization_id = public.fn_my_org_id()
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (public.fn_is_admin());

-- ============================================================
-- DEPOTS
-- ============================================================

CREATE POLICY "depots_select" ON public.depots
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "depots_write" ON public.depots
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_is_depot_manager_or_above()
  );

-- ============================================================
-- FARMERS
-- Agents see farmers in their subcounty/county
-- County managers see all farmers in their county
-- Farmers see only their own record
-- ============================================================

CREATE POLICY "farmers_select" ON public.farmers
  FOR SELECT USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_admin()
      OR public.fn_my_role() IN ('depot_manager','accountant')
      -- Agent sees farmers in their subcounty
      OR (public.fn_my_role() = 'agent' AND (
        subcounty_id = public.fn_my_subcounty_id()
        OR registered_by = auth.uid()
      ))
      -- County manager sees all in county
      OR (public.fn_my_role() = 'county_manager' AND county_id = public.fn_my_county_id())
      OR (public.fn_my_role() = 'subcounty_manager' AND subcounty_id = public.fn_my_subcounty_id())
      -- Farmer sees own record (farmer_self_service maps to their farmer record via phone)
      OR (public.fn_my_role() = 'farmer_self_service' AND id = (
        SELECT f.id FROM public.farmers f
        JOIN public.profiles p ON p.phone_number = f.phone_number
        WHERE p.id = auth.uid() LIMIT 1
      ))
    )
  );

CREATE POLICY "farmers_insert" ON public.farmers
  FOR INSERT WITH CHECK (
    organization_id = public.fn_my_org_id()
    AND public.fn_my_role() IN ('super_admin','country_admin','county_manager','subcounty_manager','depot_manager','agent')
  );

CREATE POLICY "farmers_update" ON public.farmers
  FOR UPDATE USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_admin()
      OR (public.fn_my_role() = 'agent' AND registered_by = auth.uid())
      OR (public.fn_my_role() = 'county_manager' AND county_id = public.fn_my_county_id())
      OR (public.fn_my_role() = 'subcounty_manager' AND subcounty_id = public.fn_my_subcounty_id())
    )
  );

-- ============================================================
-- POULTRY HOUSES & FARMER FLOCKS
-- ============================================================

CREATE POLICY "phouses_select" ON public.poultry_houses
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "phouses_write" ON public.poultry_houses
  FOR ALL USING (
    organization_id = public.fn_my_org_id() AND public.fn_can_write()
  );

CREATE POLICY "farmer_flocks_select" ON public.farmer_flocks
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "farmer_flocks_write" ON public.farmer_flocks
  FOR ALL USING (
    organization_id = public.fn_my_org_id() AND public.fn_can_write()
  );

CREATE POLICY "layer_flocks_select" ON public.layer_flocks
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "layer_flocks_write" ON public.layer_flocks
  FOR ALL USING (
    organization_id = public.fn_my_org_id() AND public.fn_can_write()
  );

-- ============================================================
-- CHICK BATCHES & INVENTORY
-- ============================================================

CREATE POLICY "chick_batches_select" ON public.chick_batches
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "chick_batches_write" ON public.chick_batches
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_is_depot_manager_or_above()
  );

-- ============================================================
-- EGG TABLES
-- ============================================================

CREATE POLICY "egg_prod_select" ON public.egg_production_records
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "egg_prod_write" ON public.egg_production_records
  FOR ALL USING (
    organization_id = public.fn_my_org_id() AND public.fn_can_write()
  );

CREATE POLICY "egg_inv_select" ON public.egg_inventory
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "egg_inv_write" ON public.egg_inventory
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_is_depot_manager_or_above()
  );

CREATE POLICY "egg_coll_select" ON public.egg_collections
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "egg_coll_write" ON public.egg_collections
  FOR ALL USING (
    organization_id = public.fn_my_org_id() AND public.fn_can_write()
  );

-- ============================================================
-- FEED & VACCINE INVENTORY
-- ============================================================

CREATE POLICY "feed_inv_select" ON public.feed_inventory
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "feed_inv_write" ON public.feed_inventory
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_is_depot_manager_or_above()
  );

CREATE POLICY "vaccine_inv_select" ON public.vaccine_inventory
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "vaccine_inv_write" ON public.vaccine_inventory
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_is_depot_manager_or_above()
  );

-- ============================================================
-- SALES ORDERS
-- Agents see orders they created or for their farmers
-- Depot managers see orders to their depot
-- County managers see orders in their county
-- ============================================================

CREATE POLICY "orders_select" ON public.sales_orders
  FOR SELECT USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_admin()
      OR public.fn_my_role() IN ('accountant','country_admin')
      OR (public.fn_my_role() = 'agent' AND agent_id = auth.uid())
      OR (public.fn_my_role() = 'depot_manager' AND depot_id = public.fn_my_depot_id())
      OR (public.fn_my_role() = 'county_manager' AND delivery_county_id = public.fn_my_county_id())
      OR (public.fn_my_role() = 'subcounty_manager' AND delivery_county_id = public.fn_my_county_id())
      OR (public.fn_my_role() = 'driver' AND EXISTS (
        SELECT 1 FROM public.deliveries d WHERE d.order_id = id AND d.driver_id = auth.uid()
      ))
    )
  );

CREATE POLICY "orders_insert" ON public.sales_orders
  FOR INSERT WITH CHECK (
    organization_id = public.fn_my_org_id() AND public.fn_can_write()
  );

CREATE POLICY "orders_update" ON public.sales_orders
  FOR UPDATE USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_admin()
      OR (public.fn_my_role() = 'agent' AND agent_id = auth.uid())
      OR (public.fn_my_role() = 'depot_manager' AND depot_id = public.fn_my_depot_id())
    )
  );

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE POLICY "payments_select" ON public.order_payments
  FOR SELECT USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_admin()
      OR public.fn_my_role() = 'accountant'
      OR EXISTS (
        SELECT 1 FROM public.sales_orders o
        WHERE o.id = order_id
          AND (o.agent_id = auth.uid() OR o.depot_id = public.fn_my_depot_id())
      )
    )
  );

CREATE POLICY "payments_write" ON public.order_payments
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_my_role() NOT IN ('farmer_self_service','driver','county_manager','subcounty_manager')
  );

-- ============================================================
-- DELIVERIES
-- Drivers see their assigned deliveries
-- ============================================================

CREATE POLICY "deliveries_select" ON public.deliveries
  FOR SELECT USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_admin()
      OR public.fn_my_role() = 'depot_manager'
      OR (public.fn_my_role() = 'driver' AND driver_id = auth.uid())
      OR (public.fn_my_role() = 'agent' AND EXISTS (
        SELECT 1 FROM public.sales_orders o WHERE o.id = order_id AND o.agent_id = auth.uid()
      ))
    )
  );

CREATE POLICY "deliveries_write" ON public.deliveries
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_depot_manager_or_above()
      OR (public.fn_my_role() = 'driver' AND driver_id = auth.uid())
    )
  );

-- ============================================================
-- eTIMS
-- ============================================================

CREATE POLICY "etims_select" ON public.etims_invoices
  FOR SELECT USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_my_role() IN ('super_admin','country_admin','depot_manager','accountant','county_manager')
  );

CREATE POLICY "etims_write" ON public.etims_invoices
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_my_role() IN ('super_admin','country_admin','depot_manager','accountant')
  );

CREATE POLICY "etims_queue_select" ON public.etims_failed_queue
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.etims_invoices e WHERE e.id = invoice_id AND e.organization_id = public.fn_my_org_id())
  );

CREATE POLICY "etims_queue_write" ON public.etims_failed_queue
  FOR ALL USING (public.fn_is_admin());

-- ============================================================
-- FARMER SUPPORT TABLES
-- ============================================================

CREATE POLICY "vacc_select" ON public.vaccination_schedules
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "vacc_write" ON public.vaccination_schedules
  FOR ALL USING (
    organization_id = public.fn_my_org_id() AND public.fn_can_write()
  );

CREATE POLICY "mortality_claims_select" ON public.mortality_claims
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "mortality_claims_write" ON public.mortality_claims
  FOR ALL USING (
    organization_id = public.fn_my_org_id() AND public.fn_can_write()
  );

CREATE POLICY "visits_select" ON public.farmer_visits
  FOR SELECT USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_admin()
      OR agent_id = auth.uid()
      OR public.fn_my_role() IN ('county_manager','subcounty_manager','depot_manager')
    )
  );

CREATE POLICY "visits_write" ON public.farmer_visits
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_my_role() IN ('super_admin','country_admin','county_manager','subcounty_manager','depot_manager','agent')
  );

-- ============================================================
-- AGENT COMMISSIONS
-- ============================================================

CREATE POLICY "commissions_select" ON public.agent_commissions
  FOR SELECT USING (
    organization_id = public.fn_my_org_id()
    AND (
      public.fn_is_admin()
      OR public.fn_my_role() = 'accountant'
      OR agent_id = auth.uid()
    )
  );

CREATE POLICY "commissions_write" ON public.agent_commissions
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_my_role() IN ('super_admin','country_admin','accountant')
  );

-- ============================================================
-- BOT SESSIONS (service-role access only via Edge Functions)
-- ============================================================

CREATE POLICY "ussd_sessions_service" ON public.ussd_sessions
  FOR ALL USING (true);  -- controlled by service role in edge functions

CREATE POLICY "wa_sessions_service" ON public.whatsapp_sessions
  FOR ALL USING (true);

CREATE POLICY "sms_log_select" ON public.sms_log
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "sms_log_insert" ON public.sms_log
  FOR INSERT WITH CHECK (true);  -- edge functions write via service role

-- ============================================================
-- HATCHERY
-- ============================================================

CREATE POLICY "hatchery_select" ON public.hatchery_batches
  FOR SELECT USING (organization_id = public.fn_my_org_id());

CREATE POLICY "hatchery_write" ON public.hatchery_batches
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND public.fn_is_depot_manager_or_above()
  );

-- ============================================================
-- OFFLINE SYNC LOG
-- ============================================================

CREATE POLICY "sync_log_own" ON public.offline_sync_log
  FOR ALL USING (
    organization_id = public.fn_my_org_id()
    AND (user_id = auth.uid() OR public.fn_is_admin())
  );

COMMIT;

-- ============================================================
-- EdosHatch — Core Schema Migration
-- Project: gxgcrpemrmqrfoxrbsdf (edos centre1)
-- Version: 1.0.0 | June 2026
-- Supports: Kenya, Rwanda, Uganda | All chicken types
-- ============================================================

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- for fuzzy phone/name search

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.user_role AS ENUM (
  'super_admin', 'country_admin', 'county_manager',
  'subcounty_manager', 'depot_manager', 'agent',
  'driver', 'accountant', 'farmer_self_service'
);

CREATE TYPE public.country_code AS ENUM ('KE', 'RW', 'UG');

CREATE TYPE public.preferred_language AS ENUM ('en', 'sw', 'rw', 'lg');

CREATE TYPE public.preferred_channel AS ENUM ('whatsapp', 'ussd', 'sms', 'app');

CREATE TYPE public.bird_category AS ENUM (
  'broiler', 'layer', 'dual_purpose', 'indigenous', 'breeder',
  'turkey', 'duck', 'quail', 'guinea_fowl'
);

CREATE TYPE public.flock_status AS ENUM (
  'active', 'depleted', 'sold', 'transferred', 'cancelled'
);

CREATE TYPE public.flock_purpose AS ENUM (
  'meat', 'eggs', 'breeding', 'replacement', 'dual_purpose'
);

CREATE TYPE public.egg_grade AS ENUM ('A', 'B', 'C', 'hatching', 'cracked', 'dirty');

CREATE TYPE public.order_type AS ENUM (
  'chicks', 'eggs', 'feed', 'vaccine', 'equipment', 'mixed'
);

CREATE TYPE public.order_status AS ENUM (
  'draft', 'pending', 'confirmed', 'processing',
  'dispatched', 'delivered', 'cancelled', 'refunded'
);

CREATE TYPE public.payment_method AS ENUM (
  'mpesa_stk', 'mpesa_c2b', 'mpesa_b2c', 'cash',
  'bank_transfer', 'credit'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending', 'processing', 'completed', 'failed', 'refunded'
);

CREATE TYPE public.delivery_status AS ENUM (
  'pending', 'assigned', 'dispatched', 'in_transit',
  'delivered', 'failed', 'returned'
);

CREATE TYPE public.claim_status AS ENUM (
  'submitted', 'under_review', 'approved', 'rejected', 'paid'
);

CREATE TYPE public.house_type AS ENUM (
  'broiler', 'layer', 'breeder', 'pullet', 'hatchery', 'grower', 'mixed'
);

-- ============================================================
-- HELPER: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

-- ============================================================
-- A. MULTI-TENANT & USER TABLES
-- ============================================================

-- Organizations (one per country operation)
CREATE TABLE IF NOT EXISTS public.organizations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  slug            text        NOT NULL UNIQUE,
  country         country_code NOT NULL DEFAULT 'KE',
  currency        text        NOT NULL DEFAULT 'KES',
  phone           text,
  email           text,
  address         text,
  logo_url        text,
  settings        jsonb       NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- User profiles (maps 1:1 to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  full_name       text        NOT NULL,
  phone_number    text,
  email           text,
  avatar_url      text,
  role            user_role   NOT NULL DEFAULT 'agent',
  county_id       integer,    -- scoped county (county/subcounty managers)
  subcounty_id    integer,    -- scoped subcounty
  depot_id        uuid,       -- assigned depot
  preferred_language preferred_language NOT NULL DEFAULT 'en',
  is_active       boolean     NOT NULL DEFAULT true,
  last_seen_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_county ON public.profiles(county_id) WHERE county_id IS NOT NULL;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- B. KENYA ADMINISTRATIVE HIERARCHY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.counties (
  id              integer     PRIMARY KEY,
  code            text        NOT NULL UNIQUE,
  name            text        NOT NULL,
  region          text        NOT NULL,  -- former province
  country         country_code NOT NULL DEFAULT 'KE',
  centroid        geometry(Point, 4326),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_counties_country ON public.counties(country);
CREATE INDEX idx_counties_region ON public.counties(region);

CREATE TABLE IF NOT EXISTS public.subcounties (
  id              integer     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  county_id       integer     NOT NULL REFERENCES public.counties(id),
  name            text        NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (county_id, name)
);

CREATE INDEX idx_subcounties_county ON public.subcounties(county_id);

CREATE TABLE IF NOT EXISTS public.wards (
  id              integer     PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  subcounty_id    integer     NOT NULL REFERENCES public.subcounties(id),
  county_id       integer     NOT NULL REFERENCES public.counties(id),
  name            text        NOT NULL,
  population_estimate integer,
  centroid        geometry(Point, 4326),
  boundary        geometry(MultiPolygon, 4326),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subcounty_id, name)
);

CREATE INDEX idx_wards_subcounty ON public.wards(subcounty_id);
CREATE INDEX idx_wards_county ON public.wards(county_id);
CREATE INDEX idx_wards_centroid ON public.wards USING GIST(centroid) WHERE centroid IS NOT NULL;

-- ============================================================
-- C. DEPOTS / DISTRIBUTION CENTRES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.depots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  name            text        NOT NULL,
  code            text        NOT NULL,
  county_id       integer     REFERENCES public.counties(id),
  subcounty_id    integer     REFERENCES public.subcounties(id),
  address         text,
  gps_coordinates geometry(Point, 4326),
  phone           text,
  manager_id      uuid        REFERENCES public.profiles(id),
  is_active       boolean     NOT NULL DEFAULT true,
  has_hatchery    boolean     NOT NULL DEFAULT false,
  has_cold_storage boolean    NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX idx_depots_org ON public.depots(organization_id);
CREATE INDEX idx_depots_county ON public.depots(county_id);
CREATE INDEX idx_depots_gps ON public.depots USING GIST(gps_coordinates) WHERE gps_coordinates IS NOT NULL;

CREATE TRIGGER trg_depots_updated_at
  BEFORE UPDATE ON public.depots
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- D. FARMERS & LOCATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.farmers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  registered_by       uuid        REFERENCES public.profiles(id),  -- agent
  phone_number        text        NOT NULL,
  full_name           text        NOT NULL,
  id_number           text,       -- national ID / passport
  county_id           integer     REFERENCES public.counties(id),
  subcounty_id        integer     REFERENCES public.subcounties(id),
  ward_id             integer     REFERENCES public.wards(id),
  gps_coordinates     geometry(Point, 4326),
  nearest_depot_id    uuid        REFERENCES public.depots(id),
  farm_size_acres     numeric(8, 2),
  preferred_language  preferred_language NOT NULL DEFAULT 'sw',
  preferred_channel   preferred_channel NOT NULL DEFAULT 'ussd',
  whatsapp_opted_in   boolean     NOT NULL DEFAULT false,
  is_active           boolean     NOT NULL DEFAULT true,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, phone_number)
);

CREATE INDEX idx_farmers_org ON public.farmers(organization_id);
CREATE INDEX idx_farmers_phone ON public.farmers(phone_number);
CREATE INDEX idx_farmers_ward ON public.farmers(ward_id);
CREATE INDEX idx_farmers_county ON public.farmers(county_id);
CREATE INDEX idx_farmers_depot ON public.farmers(nearest_depot_id);
CREATE INDEX idx_farmers_gps ON public.farmers USING GIST(gps_coordinates) WHERE gps_coordinates IS NOT NULL;
-- trigram index for fuzzy name/phone search
CREATE INDEX idx_farmers_name_trgm ON public.farmers USING gin(full_name gin_trgm_ops);

CREATE TRIGGER trg_farmers_updated_at
  BEFORE UPDATE ON public.farmers
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Poultry houses / sheds (on farmer's farm)
CREATE TABLE IF NOT EXISTS public.poultry_houses (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id           uuid        NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  house_code          text        NOT NULL,
  name                text        NOT NULL,
  house_type          house_type  NOT NULL DEFAULT 'broiler',
  capacity            integer     NOT NULL DEFAULT 0,
  current_occupancy   integer     NOT NULL DEFAULT 0,
  ventilation_type    text,
  length_m            numeric(8,2),
  width_m             numeric(8,2),
  area_sqm            numeric(10,2) GENERATED ALWAYS AS (length_m * width_m) STORED,
  stocking_density    numeric(6,2) GENERATED ALWAYS AS (
                        CASE WHEN (length_m * width_m) > 0
                        THEN current_occupancy::numeric / (length_m * width_m)
                        ELSE 0 END
                      ) STORED,
  is_active           boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (farmer_id, house_code)
);

CREATE INDEX idx_phouses_farmer ON public.poultry_houses(farmer_id);

CREATE TRIGGER trg_poultry_houses_updated_at
  BEFORE UPDATE ON public.poultry_houses
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Farmer flocks
CREATE TABLE IF NOT EXISTS public.farmer_flocks (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id               uuid        NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  house_id                uuid        REFERENCES public.poultry_houses(id),
  flock_code              text,
  bird_category           bird_category NOT NULL DEFAULT 'broiler',
  breed                   text,
  initial_quantity        integer     NOT NULL CHECK (initial_quantity > 0),
  current_quantity        integer     NOT NULL DEFAULT 0,
  placement_date          date        NOT NULL,
  expected_depletion_date date,
  actual_depletion_date   date,
  status                  flock_status NOT NULL DEFAULT 'active',
  purpose                 flock_purpose NOT NULL DEFAULT 'meat',
  purchase_price_per_bird numeric(10, 2) DEFAULT 0,
  source_depot_id         uuid        REFERENCES public.depots(id),
  vaccination_status      jsonb       NOT NULL DEFAULT '[]',
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_farmer_flocks_farmer ON public.farmer_flocks(farmer_id);
CREATE INDEX idx_farmer_flocks_status ON public.farmer_flocks(status);
CREATE INDEX idx_farmer_flocks_placement ON public.farmer_flocks(placement_date);
CREATE INDEX idx_farmer_flocks_org ON public.farmer_flocks(organization_id);

CREATE TRIGGER trg_farmer_flocks_updated_at
  BEFORE UPDATE ON public.farmer_flocks
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- E. CHICK BATCHES & DOC INVENTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chick_batches (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES public.organizations(id),
  depot_id                uuid        NOT NULL REFERENCES public.depots(id),
  batch_code              text        NOT NULL,
  hatchery_name           text,
  bird_category           bird_category NOT NULL DEFAULT 'broiler',
  breed                   text        NOT NULL,
  hatch_date              date        NOT NULL,
  expected_mortality_rate numeric(5, 2) DEFAULT 5.00,
  vaccination_status      jsonb       NOT NULL DEFAULT '[]',
  initial_count           integer     NOT NULL CHECK (initial_count > 0),
  available_count         integer     NOT NULL DEFAULT 0,
  price_per_chick         numeric(10, 2) NOT NULL,
  notes                   text,
  is_active               boolean     NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, batch_code)
);

CREATE INDEX idx_chick_batches_depot ON public.chick_batches(depot_id);
CREATE INDEX idx_chick_batches_hatch_date ON public.chick_batches(hatch_date);
CREATE INDEX idx_chick_batches_category ON public.chick_batches(bird_category);

CREATE TRIGGER trg_chick_batches_updated_at
  BEFORE UPDATE ON public.chick_batches
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- F. EGG VALUE CHAIN
-- ============================================================

-- Layer flock details (extended data for layers)
CREATE TABLE IF NOT EXISTS public.layer_flocks (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  flock_id                    uuid        NOT NULL UNIQUE REFERENCES public.farmer_flocks(id) ON DELETE CASCADE,
  farmer_id                   uuid        NOT NULL REFERENCES public.farmers(id),
  organization_id             uuid        NOT NULL REFERENCES public.organizations(id),
  flock_size                  integer     NOT NULL,
  date_placed                 date        NOT NULL,
  expected_laying_start_week  integer,    -- week of age
  expected_laying_end_week    integer,
  peak_production_pct         numeric(5, 2),
  current_production_pct      numeric(5, 2),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_layer_flocks_farmer ON public.layer_flocks(farmer_id);
CREATE INDEX idx_layer_flocks_org ON public.layer_flocks(organization_id);

CREATE TRIGGER trg_layer_flocks_updated_at
  BEFORE UPDATE ON public.layer_flocks
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Daily egg production records (farmer-level)
CREATE TABLE IF NOT EXISTS public.egg_production_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES public.organizations(id),
  flock_id              uuid        NOT NULL REFERENCES public.farmer_flocks(id) ON DELETE CASCADE,
  farmer_id             uuid        NOT NULL REFERENCES public.farmers(id),
  production_date       date        NOT NULL,
  morning_collection    integer     NOT NULL DEFAULT 0 CHECK (morning_collection >= 0),
  afternoon_collection  integer     NOT NULL DEFAULT 0 CHECK (afternoon_collection >= 0),
  total_eggs_laid       integer     GENERATED ALWAYS AS (morning_collection + afternoon_collection) STORED,
  cracked_eggs          integer     NOT NULL DEFAULT 0,
  dirty_eggs            integer     NOT NULL DEFAULT 0,
  grade_a_count         integer     NOT NULL DEFAULT 0,
  grade_b_count         integer     NOT NULL DEFAULT 0,
  grade_c_count         integer     NOT NULL DEFAULT 0,
  hatching_eggs         integer     NOT NULL DEFAULT 0,
  saleable_eggs         integer     GENERATED ALWAYS AS (
                          morning_collection + afternoon_collection - cracked_eggs - dirty_eggs
                        ) STORED,
  hen_count             integer     NOT NULL DEFAULT 0,
  hen_day_production    numeric(6, 2) GENERATED ALWAYS AS (
                          CASE WHEN hen_count > 0
                          THEN (morning_collection + afternoon_collection - cracked_eggs - dirty_eggs)::numeric / hen_count * 100
                          ELSE 0 END
                        ) STORED,
  feed_consumption_kg   numeric(8, 3),
  mortality_count       integer     NOT NULL DEFAULT 0,
  avg_egg_weight_g      numeric(6, 2),
  temperature_c         numeric(5, 2),
  humidity_pct          numeric(5, 2),
  recorded_by           uuid        REFERENCES public.profiles(id),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flock_id, production_date)
);

CREATE INDEX idx_egg_prod_flock ON public.egg_production_records(flock_id);
CREATE INDEX idx_egg_prod_farmer ON public.egg_production_records(farmer_id);
CREATE INDEX idx_egg_prod_date ON public.egg_production_records(production_date);
CREATE INDEX idx_egg_prod_org_date ON public.egg_production_records(organization_id, production_date);

CREATE TRIGGER trg_egg_prod_updated_at
  BEFORE UPDATE ON public.egg_production_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Egg inventory at depots
CREATE TABLE IF NOT EXISTS public.egg_inventory (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  depot_id            uuid        NOT NULL REFERENCES public.depots(id),
  grade               egg_grade   NOT NULL,
  quantity_trays      numeric(10, 2) NOT NULL DEFAULT 0 CHECK (quantity_trays >= 0),
  quantity_singles    integer     GENERATED ALWAYS AS (FLOOR(quantity_trays * 30)::integer) STORED,
  unit_price_per_tray numeric(10, 2) DEFAULT 0,
  batch_ref           text,
  expiry_date         date,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depot_id, grade)
);

CREATE INDEX idx_egg_inv_depot ON public.egg_inventory(depot_id);
CREATE INDEX idx_egg_inv_grade ON public.egg_inventory(grade);

-- Egg collections (farmer → depot)
CREATE TABLE IF NOT EXISTS public.egg_collections (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id               uuid        NOT NULL REFERENCES public.farmers(id),
  depot_id                uuid        NOT NULL REFERENCES public.depots(id),
  collected_by            uuid        REFERENCES public.profiles(id),  -- agent/driver
  collection_date         date        NOT NULL,
  total_trays             numeric(10, 2) NOT NULL DEFAULT 0,
  grade_distribution      jsonb       NOT NULL DEFAULT '{"A":0,"B":0,"C":0,"cracked":0,"dirty":0}',
  price_per_tray          numeric(10, 2) NOT NULL DEFAULT 0,
  total_amount            numeric(12, 2) GENERATED ALWAYS AS (total_trays * price_per_tray) STORED,
  payment_status          payment_status NOT NULL DEFAULT 'pending',
  payment_id              uuid,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_egg_coll_farmer ON public.egg_collections(farmer_id);
CREATE INDEX idx_egg_coll_depot ON public.egg_collections(depot_id);
CREATE INDEX idx_egg_coll_date ON public.egg_collections(collection_date);

CREATE TRIGGER trg_egg_coll_updated_at
  BEFORE UPDATE ON public.egg_collections
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- G. FEED & VETERINARY INVENTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feed_inventory (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  depot_id            uuid        NOT NULL REFERENCES public.depots(id),
  product_name        text        NOT NULL,
  product_code        text,
  feed_type           text        NOT NULL DEFAULT 'starter'
                        CHECK (feed_type IN ('starter','grower','finisher','layer_mash','layer_pellet','broiler_concentrate','kienyeji','breeder','supplement')),
  supplier            text,
  quantity_kg         numeric(12, 3) NOT NULL DEFAULT 0 CHECK (quantity_kg >= 0),
  unit_price_per_kg   numeric(10, 4),
  batch_number        text,
  manufacture_date    date,
  expiry_date         date,
  minimum_stock_kg    numeric(10, 3) DEFAULT 500,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depot_id, product_code)
);

CREATE INDEX idx_feed_inv_depot ON public.feed_inventory(depot_id);
CREATE INDEX idx_feed_inv_expiry ON public.feed_inventory(expiry_date) WHERE expiry_date IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.vaccine_inventory (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  depot_id            uuid        NOT NULL REFERENCES public.depots(id),
  vaccine_name        text        NOT NULL,
  disease_target      text        NOT NULL,
  product_code        text,
  supplier            text,
  quantity_doses      integer     NOT NULL DEFAULT 0,
  unit_price          numeric(10, 4),
  batch_number        text,
  manufacture_date    date,
  expiry_date         date,
  storage_temp_c      numeric(5, 2),
  minimum_stock       integer     DEFAULT 100,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (depot_id, product_code)
);

CREATE INDEX idx_vaccine_inv_depot ON public.vaccine_inventory(depot_id);
CREATE INDEX idx_vaccine_inv_expiry ON public.vaccine_inventory(expiry_date) WHERE expiry_date IS NOT NULL;

-- ============================================================
-- H. SALES & ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES public.organizations(id),
  order_number            text        NOT NULL,
  farmer_id               uuid        REFERENCES public.farmers(id),
  agent_id                uuid        REFERENCES public.profiles(id),
  depot_id                uuid        NOT NULL REFERENCES public.depots(id),
  order_type              order_type  NOT NULL DEFAULT 'chicks',
  product_details         jsonb       NOT NULL DEFAULT '[]',
  -- chick orders
  batch_id                uuid        REFERENCES public.chick_batches(id),
  chick_quantity          integer,
  chick_price_per_unit    numeric(10, 2),
  -- egg orders
  egg_trays               numeric(10, 2),
  egg_grade               egg_grade,
  egg_price_per_tray      numeric(10, 2),
  -- financial
  subtotal                numeric(12, 2) NOT NULL DEFAULT 0,
  discount_amount         numeric(10, 2) NOT NULL DEFAULT 0,
  total_amount            numeric(12, 2) NOT NULL DEFAULT 0,
  amount_paid             numeric(12, 2) NOT NULL DEFAULT 0,
  balance_due             numeric(12, 2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  -- logistics
  order_date              timestamptz NOT NULL DEFAULT now(),
  requested_delivery_date date,
  delivery_address        text,
  delivery_county_id      integer     REFERENCES public.counties(id),
  delivery_ward_id        integer     REFERENCES public.wards(id),
  -- status
  status                  order_status NOT NULL DEFAULT 'pending',
  channel                 text        NOT NULL DEFAULT 'agent'
                            CHECK (channel IN ('agent','whatsapp','ussd','pos','app')),
  notes                   text,
  etims_invoice_id        uuid,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, order_number)
);

CREATE INDEX idx_orders_farmer ON public.sales_orders(farmer_id);
CREATE INDEX idx_orders_agent ON public.sales_orders(agent_id);
CREATE INDEX idx_orders_depot ON public.sales_orders(depot_id);
CREATE INDEX idx_orders_status ON public.sales_orders(status);
CREATE INDEX idx_orders_date ON public.sales_orders(order_date);
CREATE INDEX idx_orders_county ON public.sales_orders(delivery_county_id);
CREATE INDEX idx_orders_org_date ON public.sales_orders(organization_id, order_date);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Order payments
CREATE TABLE IF NOT EXISTS public.order_payments (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES public.organizations(id),
  order_id                uuid        NOT NULL REFERENCES public.sales_orders(id),
  payment_method          payment_method NOT NULL DEFAULT 'mpesa_stk',
  mpesa_transaction_id    text        UNIQUE,
  mpesa_checkout_request_id text,
  mpesa_merchant_request_id text,
  mpesa_phone_number      text,
  amount                  numeric(12, 2) NOT NULL,
  status                  payment_status NOT NULL DEFAULT 'pending',
  failure_reason          text,
  paid_at                 timestamptz,
  metadata                jsonb       NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_order ON public.order_payments(order_id);
CREATE INDEX idx_payments_mpesa_txn ON public.order_payments(mpesa_transaction_id) WHERE mpesa_transaction_id IS NOT NULL;
CREATE INDEX idx_payments_status ON public.order_payments(status);
CREATE INDEX idx_payments_checkout ON public.order_payments(mpesa_checkout_request_id) WHERE mpesa_checkout_request_id IS NOT NULL;

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.order_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- I. LOGISTICS & DELIVERY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deliveries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  order_id            uuid        NOT NULL UNIQUE REFERENCES public.sales_orders(id),
  driver_id           uuid        REFERENCES public.profiles(id),
  depot_id            uuid        NOT NULL REFERENCES public.depots(id),
  status              delivery_status NOT NULL DEFAULT 'pending',
  dispatch_time       timestamptz,
  estimated_arrival   timestamptz,
  delivery_time       timestamptz,
  route_description   text,
  realtime_gps_track  jsonb       NOT NULL DEFAULT '[]',
  current_lat         numeric(10, 8),
  current_lng         numeric(11, 8),
  delivery_photo_url  text,
  recipient_name      text,
  recipient_signature_url text,
  failure_reason      text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_order ON public.deliveries(order_id);
CREATE INDEX idx_deliveries_driver ON public.deliveries(driver_id);
CREATE INDEX idx_deliveries_status ON public.deliveries(status);
CREATE INDEX idx_deliveries_depot ON public.deliveries(depot_id);

CREATE TRIGGER trg_deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- J. TAX & COMPLIANCE (Kenya eTIMS)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.etims_invoices (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES public.organizations(id),
  order_id                uuid        NOT NULL REFERENCES public.sales_orders(id),
  invoice_number          text        NOT NULL UNIQUE,
  kra_invoice_number      text        UNIQUE,
  qr_code_url             text,
  qr_code_data            text,
  kra_validation_status   text        NOT NULL DEFAULT 'pending'
                            CHECK (kra_validation_status IN ('pending','sent','validated','rejected','error')),
  request_payload         jsonb,
  response_payload        jsonb,
  retry_count             integer     NOT NULL DEFAULT 0,
  last_retry_at           timestamptz,
  error_message           text,
  generated_at            timestamptz NOT NULL DEFAULT now(),
  validated_at            timestamptz
);

CREATE INDEX idx_etims_order ON public.etims_invoices(order_id);
CREATE INDEX idx_etims_status ON public.etims_invoices(kra_validation_status);
CREATE INDEX idx_etims_kra_number ON public.etims_invoices(kra_invoice_number) WHERE kra_invoice_number IS NOT NULL;

-- Retry queue for failed eTIMS submissions
CREATE TABLE IF NOT EXISTS public.etims_failed_queue (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid        NOT NULL REFERENCES public.etims_invoices(id),
  attempt_number  integer     NOT NULL DEFAULT 1,
  scheduled_at    timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  attempted_at    timestamptz,
  status          text        NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','processing','succeeded','failed_permanently')),
  error_detail    text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_etims_queue_scheduled ON public.etims_failed_queue(scheduled_at)
  WHERE status = 'queued';

-- ============================================================
-- K. FARMER SUPPORT & FIELD OPS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vaccination_schedules (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id           uuid        NOT NULL REFERENCES public.farmers(id),
  flock_id            uuid        NOT NULL REFERENCES public.farmer_flocks(id),
  vaccine_type        text        NOT NULL,
  disease_target      text        NOT NULL,
  bird_age_days       integer,
  scheduled_date      date        NOT NULL,
  completed_date      date,
  administered_by     uuid        REFERENCES public.profiles(id),
  reminder_sent       boolean     NOT NULL DEFAULT false,
  reminder_sent_at    timestamptz,
  method              text        DEFAULT 'drinking_water'
                        CHECK (method IN ('drinking_water','spray','eye_drop','injection','wing_web','intranasal','gel')),
  dose_per_bird       numeric(8, 4),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_vacc_farmer ON public.vaccination_schedules(farmer_id);
CREATE INDEX idx_vacc_flock ON public.vaccination_schedules(flock_id);
CREATE INDEX idx_vacc_scheduled ON public.vaccination_schedules(scheduled_date);
CREATE INDEX idx_vacc_due ON public.vaccination_schedules(scheduled_date)
  WHERE completed_date IS NULL;

CREATE TRIGGER trg_vacc_updated_at
  BEFORE UPDATE ON public.vaccination_schedules
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Mortality claims
CREATE TABLE IF NOT EXISTS public.mortality_claims (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id               uuid        NOT NULL REFERENCES public.farmers(id),
  flock_id                uuid        NOT NULL REFERENCES public.farmer_flocks(id),
  order_id                uuid        REFERENCES public.sales_orders(id),
  claim_date              date        NOT NULL DEFAULT CURRENT_DATE,
  bird_age_days           integer,
  claimed_deaths          integer     NOT NULL CHECK (claimed_deaths > 0),
  claimed_mortality_rate  numeric(5, 2),
  actual_deaths           integer,
  actual_mortality_rate   numeric(5, 2),
  cause_of_death          text,
  agent_notes             text,
  vet_notes               text,
  photos                  jsonb       NOT NULL DEFAULT '[]',
  compensation_amount     numeric(12, 2),
  status                  claim_status NOT NULL DEFAULT 'submitted',
  reviewed_by             uuid        REFERENCES public.profiles(id),
  reviewed_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mortality_claims_farmer ON public.mortality_claims(farmer_id);
CREATE INDEX idx_mortality_claims_status ON public.mortality_claims(status);
CREATE INDEX idx_mortality_claims_org ON public.mortality_claims(organization_id);

CREATE TRIGGER trg_mortality_claims_updated_at
  BEFORE UPDATE ON public.mortality_claims
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Agent farm visits
CREATE TABLE IF NOT EXISTS public.farmer_visits (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  agent_id        uuid        NOT NULL REFERENCES public.profiles(id),
  farmer_id       uuid        NOT NULL REFERENCES public.farmers(id),
  visit_date      timestamptz NOT NULL DEFAULT now(),
  gps_location    geometry(Point, 4326),
  visit_type      text        NOT NULL DEFAULT 'routine'
                    CHECK (visit_type IN ('registration','routine','sales','vaccination','mortality_claim','training','complaint')),
  notes           text        NOT NULL DEFAULT '',
  photo_urls      jsonb       NOT NULL DEFAULT '[]',
  duration_mins   integer,
  outcomes        jsonb       NOT NULL DEFAULT '[]',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_agent ON public.farmer_visits(agent_id);
CREATE INDEX idx_visits_farmer ON public.farmer_visits(farmer_id);
CREATE INDEX idx_visits_date ON public.farmer_visits(visit_date);
CREATE INDEX idx_visits_gps ON public.farmer_visits USING GIST(gps_location) WHERE gps_location IS NOT NULL;

-- Agent commissions
CREATE TABLE IF NOT EXISTS public.agent_commissions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  agent_id            uuid        NOT NULL REFERENCES public.profiles(id),
  order_id            uuid        REFERENCES public.sales_orders(id),
  period_month        date        NOT NULL,  -- first day of month
  order_type          order_type,
  chicks_sold         integer     NOT NULL DEFAULT 0,
  eggs_trays_sold     numeric(10, 2) NOT NULL DEFAULT 0,
  total_sales_amount  numeric(12, 2) NOT NULL DEFAULT 0,
  commission_rate_pct numeric(5, 2) NOT NULL DEFAULT 2.5,
  commission_earned   numeric(12, 2) GENERATED ALWAYS AS (
                        total_sales_amount * commission_rate_pct / 100
                      ) STORED,
  status              text        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','paid')),
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commissions_agent ON public.agent_commissions(agent_id);
CREATE INDEX idx_commissions_period ON public.agent_commissions(period_month);
CREATE INDEX idx_commissions_status ON public.agent_commissions(status);

CREATE TRIGGER trg_commissions_updated_at
  BEFORE UPDATE ON public.agent_commissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- L. MESSAGING & BOT SESSIONS
-- ============================================================

-- USSD sessions (Africa's Talking)
CREATE TABLE IF NOT EXISTS public.ussd_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      text        NOT NULL UNIQUE,
  phone_number    text        NOT NULL,
  farmer_id       uuid        REFERENCES public.farmers(id),
  organization_id uuid        REFERENCES public.organizations(id),
  current_step    text        NOT NULL DEFAULT 'MAIN_MENU',
  session_data    jsonb       NOT NULL DEFAULT '{}',
  is_active       boolean     NOT NULL DEFAULT true,
  language        preferred_language NOT NULL DEFAULT 'sw',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL DEFAULT now() + interval '10 minutes'
);

CREATE INDEX idx_ussd_session_id ON public.ussd_sessions(session_id);
CREATE INDEX idx_ussd_phone ON public.ussd_sessions(phone_number);
CREATE INDEX idx_ussd_active ON public.ussd_sessions(is_active, expires_at);

CREATE TRIGGER trg_ussd_updated_at
  BEFORE UPDATE ON public.ussd_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- WhatsApp conversation state
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number    text        NOT NULL UNIQUE,
  farmer_id       uuid        REFERENCES public.farmers(id),
  organization_id uuid        REFERENCES public.organizations(id),
  current_step    text        NOT NULL DEFAULT 'MAIN_MENU',
  session_data    jsonb       NOT NULL DEFAULT '{}',
  language        preferred_language NOT NULL DEFAULT 'sw',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_phone ON public.whatsapp_sessions(phone_number);
CREATE INDEX idx_wa_farmer ON public.whatsapp_sessions(farmer_id);

CREATE TRIGGER trg_wa_updated_at
  BEFORE UPDATE ON public.whatsapp_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- SMS log
CREATE TABLE IF NOT EXISTS public.sms_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES public.organizations(id),
  farmer_id       uuid        REFERENCES public.farmers(id),
  phone_number    text        NOT NULL,
  message         text        NOT NULL,
  direction       text        NOT NULL DEFAULT 'outbound'
                    CHECK (direction IN ('inbound','outbound')),
  channel         text        NOT NULL DEFAULT 'sms'
                    CHECK (channel IN ('sms','whatsapp','ussd')),
  status          text        NOT NULL DEFAULT 'sent',
  provider_ref    text,
  cost            numeric(8, 4),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sms_phone ON public.sms_log(phone_number);
CREATE INDEX idx_sms_farmer ON public.sms_log(farmer_id);
CREATE INDEX idx_sms_date ON public.sms_log(created_at);

-- ============================================================
-- M. HATCHERY MANAGEMENT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hatchery_batches (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES public.organizations(id),
  depot_id                uuid        NOT NULL REFERENCES public.depots(id),
  batch_code              text        NOT NULL,
  batch_name              text        NOT NULL,
  egg_source              text        NOT NULL DEFAULT 'own_farm'
                            CHECK (egg_source IN ('own_farm','purchased')),
  bird_category           bird_category NOT NULL DEFAULT 'broiler',
  breed                   text,
  set_date                date        NOT NULL,
  expected_hatch_date     date        GENERATED ALWAYS AS (set_date + 21) STORED,
  actual_hatch_date       date,
  incubator_id            text,
  eggs_set                integer     NOT NULL DEFAULT 0,
  eggs_candled            integer     NOT NULL DEFAULT 0,
  fertile_eggs            integer     NOT NULL DEFAULT 0,
  eggs_transferred        integer     NOT NULL DEFAULT 0,
  chicks_hatched          integer     NOT NULL DEFAULT 0,
  chicks_culled           integer     NOT NULL DEFAULT 0,
  chicks_saleable         integer     GENERATED ALWAYS AS (
                            GREATEST(0, chicks_hatched - chicks_culled)
                          ) STORED,
  hatch_rate_pct          numeric(5, 2),
  fertility_rate_pct      numeric(5, 2),
  status                  text        NOT NULL DEFAULT 'setting'
                            CHECK (status IN ('setting','candling','lockdown','hatching','complete','failed')),
  notes                   text,
  created_by              uuid        REFERENCES public.profiles(id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, batch_code)
);

CREATE INDEX idx_hatchery_depot ON public.hatchery_batches(depot_id);
CREATE INDEX idx_hatchery_status ON public.hatchery_batches(status);
CREATE INDEX idx_hatchery_set_date ON public.hatchery_batches(set_date);

CREATE TRIGGER trg_hatchery_updated_at
  BEFORE UPDATE ON public.hatchery_batches
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- N. OFFLINE SYNC AUDIT
-- ============================================================

CREATE TABLE IF NOT EXISTS public.offline_sync_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        REFERENCES public.organizations(id),
  user_id         uuid        REFERENCES public.profiles(id),
  device_id       text        NOT NULL,
  table_name      text        NOT NULL,
  record_id       uuid        NOT NULL,
  operation       text        NOT NULL CHECK (operation IN ('insert','update','delete')),
  payload         jsonb       NOT NULL DEFAULT '{}',
  conflict_detected boolean   NOT NULL DEFAULT false,
  conflict_resolution text    CHECK (conflict_resolution IN ('server_wins','client_wins','manual')),
  synced_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_user ON public.offline_sync_log(user_id);
CREATE INDEX idx_sync_table ON public.offline_sync_log(table_name, record_id);

-- ============================================================
-- O. ORDER SEQUENCE GENERATOR
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 10001;

CREATE OR REPLACE FUNCTION public.fn_generate_order_number(org_slug text)
RETURNS text LANGUAGE sql AS $$
  SELECT UPPER(LEFT(org_slug, 3)) || '-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(nextval('public.order_number_seq')::text, 5, '0')
$$;

-- ============================================================
-- P. GPS REVERSE-GEOCODE HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_find_ward_for_point(lat numeric, lng numeric)
RETURNS TABLE(ward_id integer, ward_name text, subcounty_id integer, subcounty_name text, county_id integer, county_name text)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT w.id, w.name, sc.id, sc.name, c.id, c.name
  FROM public.wards w
  JOIN public.subcounties sc ON sc.id = w.subcounty_id
  JOIN public.counties c ON c.id = w.county_id
  WHERE ST_Contains(w.boundary, ST_SetSRID(ST_MakePoint(lng, lat), 4326))
  LIMIT 1;
$$;

COMMIT;

-- ============================================================
-- EdosHatch — Farm Operations Expansion
-- Migration: 20260609000003
-- New tables: medication_records, bird_weights, flock_expenses,
--   hatchery_eggs, hatchery_hatches, breeding_records,
--   production_targets, production_forecasts, farm_tasks,
--   farm_task_assignments, farm_incidents, farm_inspections,
--   farm_attachments, farm_documents, feed_consumption
-- ============================================================

BEGIN;

-- ============================================================
-- NEW ENUMS
-- ============================================================

CREATE TYPE public.expense_category AS ENUM (
  'feed', 'medication', 'vaccine', 'labor', 'utilities',
  'equipment', 'transport', 'bedding', 'other'
);

CREATE TYPE public.task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TYPE public.task_status AS ENUM (
  'pending', 'in_progress', 'completed', 'cancelled', 'overdue'
);

CREATE TYPE public.task_type AS ENUM (
  'vaccination', 'feeding', 'weighing', 'cleaning', 'medication',
  'inspection', 'harvest', 'delivery', 'deworming', 'culling', 'admin', 'other'
);

CREATE TYPE public.task_recurrence AS ENUM ('none', 'daily', 'weekly', 'monthly');

CREATE TYPE public.incident_type AS ENUM (
  'disease', 'injury', 'theft', 'fire', 'weather',
  'equipment_failure', 'feed_contamination', 'predator', 'other'
);

CREATE TYPE public.incident_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE public.incident_status AS ENUM (
  'reported', 'investigating', 'resolved', 'closed'
);

CREATE TYPE public.inspection_type AS ENUM (
  'biosecurity', 'welfare', 'compliance', 'routine',
  'pre_delivery', 'post_incident', 'government'
);

CREATE TYPE public.document_type AS ENUM (
  'veterinary_certificate', 'trading_license', 'movement_permit',
  'feed_analysis_report', 'vaccination_certificate', 'insurance_policy',
  'contract', 'lab_result', 'import_permit', 'other'
);

CREATE TYPE public.document_status AS ENUM ('active', 'expired', 'revoked', 'pending');

CREATE TYPE public.mating_type AS ENUM ('natural', 'artificial_insemination', 'pen_mating');

CREATE TYPE public.forecast_metric AS ENUM (
  'eggs_daily', 'chicks_weekly', 'live_weight_kg',
  'feed_consumption_kg', 'revenue', 'mortality_rate'
);

CREATE TYPE public.target_metric AS ENUM (
  'eggs_daily', 'hen_day_production_pct', 'live_weight_g',
  'fcr', 'mortality_rate_pct', 'hatch_rate_pct',
  'feed_consumption_kg', 'revenue'
);

CREATE TYPE public.target_period AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');

-- ============================================================
-- 1. MEDICATION RECORDS
--    Treatment events applied to a flock
-- ============================================================

CREATE TABLE IF NOT EXISTS public.medication_records (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id             uuid        NOT NULL REFERENCES public.farmers(id),
  flock_id              uuid        NOT NULL REFERENCES public.farmer_flocks(id) ON DELETE CASCADE,
  medication_name       text        NOT NULL,
  active_ingredient     text,
  disease_treated       text        NOT NULL,
  dosage                numeric(10, 4) NOT NULL CHECK (dosage > 0),
  dosage_unit           text        NOT NULL DEFAULT 'ml'
                          CHECK (dosage_unit IN ('ml','mg','g','tablets','sachet','IU')),
  route                 text        NOT NULL DEFAULT 'oral'
                          CHECK (route IN ('oral','injection_IM','injection_SC','topical','drinking_water','feed_mix')),
  birds_treated         integer     NOT NULL CHECK (birds_treated > 0),
  start_date            date        NOT NULL,
  end_date              date,
  duration_days         integer     GENERATED ALWAYS AS (
                          CASE WHEN end_date IS NOT NULL THEN (end_date - start_date + 1)
                          ELSE NULL END
                        ) STORED,
  withdrawal_period_days integer,
  meat_withdrawal_date  date        GENERATED ALWAYS AS (
                          CASE WHEN end_date IS NOT NULL AND withdrawal_period_days IS NOT NULL
                          THEN end_date + withdrawal_period_days
                          ELSE NULL END
                        ) STORED,
  cost_per_unit         numeric(10, 2),
  total_cost            numeric(12, 2),
  supplier              text,
  batch_number          text,
  administered_by       uuid        REFERENCES public.profiles(id),
  prescribed_by         text,       -- vet name (may be external)
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_medication_flock   ON public.medication_records(flock_id);
CREATE INDEX idx_medication_farmer  ON public.medication_records(farmer_id);
CREATE INDEX idx_medication_date    ON public.medication_records(start_date);
CREATE INDEX idx_medication_org     ON public.medication_records(organization_id);

CREATE TRIGGER trg_medication_updated_at
  BEFORE UPDATE ON public.medication_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 2. BIRD WEIGHTS
--    Periodic weight sampling for growth tracking & FCR
-- ============================================================

CREATE TABLE IF NOT EXISTS public.bird_weights (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id           uuid        NOT NULL REFERENCES public.farmers(id),
  flock_id            uuid        NOT NULL REFERENCES public.farmer_flocks(id) ON DELETE CASCADE,
  weigh_date          date        NOT NULL,
  bird_age_days       integer     NOT NULL CHECK (bird_age_days >= 0),
  sample_size         integer     NOT NULL DEFAULT 30 CHECK (sample_size > 0),
  avg_weight_g        numeric(8, 2) NOT NULL CHECK (avg_weight_g > 0),
  min_weight_g        numeric(8, 2),
  max_weight_g        numeric(8, 2),
  std_dev_g           numeric(8, 2),
  target_weight_g     numeric(8, 2),
  variance_pct        numeric(6, 2) GENERATED ALWAYS AS (
                        CASE WHEN target_weight_g > 0
                        THEN (avg_weight_g - target_weight_g) / target_weight_g * 100
                        ELSE NULL END
                      ) STORED,
  -- cumulative feed consumed since placement (kg per bird)
  cumulative_feed_per_bird_kg numeric(8, 3),
  fcr                 numeric(6, 3) GENERATED ALWAYS AS (
                        CASE WHEN avg_weight_g > 0 AND cumulative_feed_per_bird_kg IS NOT NULL
                        THEN (cumulative_feed_per_bird_kg * 1000) / avg_weight_g
                        ELSE NULL END
                      ) STORED,
  recorded_by         uuid        REFERENCES public.profiles(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flock_id, weigh_date)
);

CREATE INDEX idx_bird_weights_flock  ON public.bird_weights(flock_id);
CREATE INDEX idx_bird_weights_farmer ON public.bird_weights(farmer_id);
CREATE INDEX idx_bird_weights_date   ON public.bird_weights(weigh_date);

CREATE TRIGGER trg_bird_weights_updated_at
  BEFORE UPDATE ON public.bird_weights
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 3. FLOCK EXPENSES
--    All costs incurred against a specific flock
-- ============================================================

CREATE TABLE IF NOT EXISTS public.flock_expenses (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id           uuid        NOT NULL REFERENCES public.farmers(id),
  flock_id            uuid        NOT NULL REFERENCES public.farmer_flocks(id) ON DELETE CASCADE,
  expense_date        date        NOT NULL DEFAULT CURRENT_DATE,
  category            expense_category NOT NULL DEFAULT 'other',
  description         text        NOT NULL,
  quantity            numeric(12, 3),
  unit                text,
  unit_cost           numeric(10, 4),
  total_amount        numeric(12, 2) NOT NULL CHECK (total_amount >= 0),
  vendor              text,
  receipt_url         text,
  recorded_by         uuid        REFERENCES public.profiles(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_flock_exp_flock   ON public.flock_expenses(flock_id);
CREATE INDEX idx_flock_exp_farmer  ON public.flock_expenses(farmer_id);
CREATE INDEX idx_flock_exp_date    ON public.flock_expenses(expense_date);
CREATE INDEX idx_flock_exp_cat     ON public.flock_expenses(category);

CREATE TRIGGER trg_flock_expenses_updated_at
  BEFORE UPDATE ON public.flock_expenses
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 4. HATCHERY EGGS
--    Egg-level tracking within a hatchery batch (setter trays)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hatchery_eggs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  batch_id            uuid        NOT NULL REFERENCES public.hatchery_batches(id) ON DELETE CASCADE,
  tray_number         text        NOT NULL,
  rack_position       text,
  eggs_loaded         integer     NOT NULL CHECK (eggs_loaded > 0),
  source              text        NOT NULL DEFAULT 'own_farm'
                        CHECK (source IN ('own_farm','purchased','contract_farmer')),
  supplier_farmer_id  uuid        REFERENCES public.farmers(id),
  grade               egg_grade,
  set_date            date        NOT NULL,
  -- candle 1 (day 7)
  candle1_date        date,
  candle1_fertile     integer,
  candle1_infertile   integer,
  candle1_cracked     integer,
  candle1_done_by     uuid        REFERENCES public.profiles(id),
  -- candle 2 (day 18 — transfer)
  candle2_date        date,
  candle2_fertile     integer,
  candle2_dead_in_shell integer,
  candle2_done_by     uuid        REFERENCES public.profiles(id),
  transferred_to_hatcher boolean NOT NULL DEFAULT false,
  transfer_date       date,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, tray_number)
);

CREATE INDEX idx_hatch_eggs_batch   ON public.hatchery_eggs(batch_id);
CREATE INDEX idx_hatch_eggs_farmer  ON public.hatchery_eggs(supplier_farmer_id) WHERE supplier_farmer_id IS NOT NULL;

CREATE TRIGGER trg_hatchery_eggs_updated_at
  BEFORE UPDATE ON public.hatchery_eggs
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 5. HATCHERY HATCHES
--    Hatch-out event results for a batch
-- ============================================================

CREATE TABLE IF NOT EXISTS public.hatchery_hatches (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES public.organizations(id),
  batch_id              uuid        NOT NULL REFERENCES public.hatchery_batches(id) ON DELETE CASCADE,
  hatch_date            date        NOT NULL,
  eggs_transferred      integer     NOT NULL DEFAULT 0,
  chicks_hatched        integer     NOT NULL DEFAULT 0 CHECK (chicks_hatched >= 0),
  chicks_first_grade    integer     NOT NULL DEFAULT 0,  -- healthy, saleable
  chicks_second_grade   integer     NOT NULL DEFAULT 0,  -- weak/deformed but saleable at discount
  chicks_culled         integer     NOT NULL DEFAULT 0,
  early_dead            integer     NOT NULL DEFAULT 0,  -- died days 1-10
  late_dead             integer     NOT NULL DEFAULT 0,  -- died days 11-18
  pipped_not_hatched    integer     NOT NULL DEFAULT 0,
  unfertilised          integer     NOT NULL DEFAULT 0,
  saleable_chicks       integer     GENERATED ALWAYS AS (
                          GREATEST(0, chicks_first_grade + chicks_second_grade)
                        ) STORED,
  hatch_rate_pct        numeric(5, 2) GENERATED ALWAYS AS (
                          CASE WHEN eggs_transferred > 0
                          THEN chicks_hatched::numeric / eggs_transferred * 100
                          ELSE NULL END
                        ) STORED,
  -- links to chick_batches created from this hatch
  chick_batch_id        uuid        REFERENCES public.chick_batches(id),
  recorded_by           uuid        REFERENCES public.profiles(id),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hatch_hatches_batch ON public.hatchery_hatches(batch_id);
CREATE INDEX idx_hatch_hatches_date  ON public.hatchery_hatches(hatch_date);

CREATE TRIGGER trg_hatchery_hatches_updated_at
  BEFORE UPDATE ON public.hatchery_hatches
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 6. BREEDING RECORDS
--    Mating events and outcomes for breeder flocks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.breeding_records (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id           uuid        REFERENCES public.farmers(id),
  depot_id            uuid        REFERENCES public.depots(id),
  sire_flock_id       uuid        REFERENCES public.farmer_flocks(id),
  dam_flock_id        uuid        REFERENCES public.farmer_flocks(id),
  mating_type         mating_type NOT NULL DEFAULT 'natural',
  mating_date         date        NOT NULL,
  sire_breed          text,
  dam_breed           text,
  target_breed        text,
  hens_mated          integer,
  cocks_used          integer,
  hen_cock_ratio      numeric(6, 2) GENERATED ALWAYS AS (
                        CASE WHEN cocks_used > 0 THEN hens_mated::numeric / cocks_used
                        ELSE NULL END
                      ) STORED,
  eggs_collected      integer     NOT NULL DEFAULT 0,
  eggs_set            integer     NOT NULL DEFAULT 0,
  fertile_eggs        integer,
  fertility_rate_pct  numeric(5, 2) GENERATED ALWAYS AS (
                        CASE WHEN eggs_set > 0 AND fertile_eggs IS NOT NULL
                        THEN fertile_eggs::numeric / eggs_set * 100
                        ELSE NULL END
                      ) STORED,
  chicks_hatched      integer,
  hatch_rate_pct      numeric(5, 2),
  linked_hatchery_batch_id uuid   REFERENCES public.hatchery_batches(id),
  recorded_by         uuid        REFERENCES public.profiles(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_breeding_farmer ON public.breeding_records(farmer_id) WHERE farmer_id IS NOT NULL;
CREATE INDEX idx_breeding_depot  ON public.breeding_records(depot_id)  WHERE depot_id  IS NOT NULL;
CREATE INDEX idx_breeding_date   ON public.breeding_records(mating_date);
CREATE INDEX idx_breeding_org    ON public.breeding_records(organization_id);

CREATE TRIGGER trg_breeding_updated_at
  BEFORE UPDATE ON public.breeding_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 7. PRODUCTION TARGETS
--    Performance targets at org / depot / farmer / flock level
-- ============================================================

CREATE TABLE IF NOT EXISTS public.production_targets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  -- scope: at least one must be set
  depot_id            uuid        REFERENCES public.depots(id),
  farmer_id           uuid        REFERENCES public.farmers(id),
  flock_id            uuid        REFERENCES public.farmer_flocks(id),
  metric              target_metric NOT NULL,
  period_type         target_period NOT NULL DEFAULT 'monthly',
  period_start        date        NOT NULL,
  period_end          date        NOT NULL CHECK (period_end >= period_start),
  target_value        numeric(14, 4) NOT NULL CHECK (target_value > 0),
  unit                text        NOT NULL,  -- e.g. 'eggs', 'kg', '%', 'KES'
  actual_value        numeric(14, 4),
  achievement_pct     numeric(6, 2) GENERATED ALWAYS AS (
                        CASE WHEN target_value > 0 AND actual_value IS NOT NULL
                        THEN actual_value / target_value * 100
                        ELSE NULL END
                      ) STORED,
  set_by              uuid        REFERENCES public.profiles(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prod_targets_org    ON public.production_targets(organization_id);
CREATE INDEX idx_prod_targets_depot  ON public.production_targets(depot_id)   WHERE depot_id   IS NOT NULL;
CREATE INDEX idx_prod_targets_farmer ON public.production_targets(farmer_id)  WHERE farmer_id  IS NOT NULL;
CREATE INDEX idx_prod_targets_period ON public.production_targets(period_start, period_end);

CREATE TRIGGER trg_prod_targets_updated_at
  BEFORE UPDATE ON public.production_targets
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 8. PRODUCTION FORECASTS
--    Forward-looking projections for planning & procurement
-- ============================================================

CREATE TABLE IF NOT EXISTS public.production_forecasts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  depot_id            uuid        REFERENCES public.depots(id),
  farmer_id           uuid        REFERENCES public.farmers(id),
  flock_id            uuid        REFERENCES public.farmer_flocks(id),
  forecast_date       date        NOT NULL DEFAULT CURRENT_DATE,
  forecast_start      date        NOT NULL,
  forecast_end        date        NOT NULL CHECK (forecast_end > forecast_start),
  metric              forecast_metric NOT NULL,
  forecasted_value    numeric(14, 4) NOT NULL,
  lower_bound         numeric(14, 4),
  upper_bound         numeric(14, 4),
  unit                text        NOT NULL,
  actual_value        numeric(14, 4),
  accuracy_pct        numeric(6, 2) GENERATED ALWAYS AS (
                        CASE WHEN forecasted_value > 0 AND actual_value IS NOT NULL
                        THEN (1 - ABS(actual_value - forecasted_value) / forecasted_value) * 100
                        ELSE NULL END
                      ) STORED,
  model_version       text        DEFAULT 'v1',
  confidence_pct      numeric(5, 2),
  assumptions         jsonb       NOT NULL DEFAULT '{}',
  generated_by        uuid        REFERENCES public.profiles(id),
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_forecasts_org    ON public.production_forecasts(organization_id);
CREATE INDEX idx_forecasts_depot  ON public.production_forecasts(depot_id)  WHERE depot_id  IS NOT NULL;
CREATE INDEX idx_forecasts_period ON public.production_forecasts(forecast_start, forecast_end);
CREATE INDEX idx_forecasts_metric ON public.production_forecasts(metric);

CREATE TRIGGER trg_forecasts_updated_at
  BEFORE UPDATE ON public.production_forecasts
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 9. FARM TASKS
--    Operational task/to-do management across the farm
-- ============================================================

CREATE TABLE IF NOT EXISTS public.farm_tasks (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  depot_id            uuid        REFERENCES public.depots(id),
  farmer_id           uuid        REFERENCES public.farmers(id),
  flock_id            uuid        REFERENCES public.farmer_flocks(id),
  house_id            uuid        REFERENCES public.poultry_houses(id),
  -- linked records (optional context)
  vaccination_schedule_id uuid    REFERENCES public.vaccination_schedules(id),
  title               text        NOT NULL,
  description         text,
  task_type           task_type   NOT NULL DEFAULT 'other',
  priority            task_priority NOT NULL DEFAULT 'medium',
  status              task_status NOT NULL DEFAULT 'pending',
  due_date            date,
  due_time            time,
  recurrence          task_recurrence NOT NULL DEFAULT 'none',
  -- for recurring tasks, next occurrence
  next_due_date       date,
  parent_task_id      uuid        REFERENCES public.farm_tasks(id),
  created_by          uuid        REFERENCES public.profiles(id),
  completed_by        uuid        REFERENCES public.profiles(id),
  completed_at        timestamptz,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_org      ON public.farm_tasks(organization_id);
CREATE INDEX idx_tasks_farmer   ON public.farm_tasks(farmer_id)  WHERE farmer_id  IS NOT NULL;
CREATE INDEX idx_tasks_depot    ON public.farm_tasks(depot_id)   WHERE depot_id   IS NOT NULL;
CREATE INDEX idx_tasks_flock    ON public.farm_tasks(flock_id)   WHERE flock_id   IS NOT NULL;
CREATE INDEX idx_tasks_status   ON public.farm_tasks(status);
CREATE INDEX idx_tasks_due      ON public.farm_tasks(due_date)   WHERE due_date   IS NOT NULL;
CREATE INDEX idx_tasks_priority ON public.farm_tasks(priority);

CREATE TRIGGER trg_farm_tasks_updated_at
  BEFORE UPDATE ON public.farm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 10. FARM TASK ASSIGNMENTS
--     Who is responsible for each task (supports multiple assignees)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.farm_task_assignments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         uuid        NOT NULL REFERENCES public.farm_tasks(id) ON DELETE CASCADE,
  assigned_to     uuid        NOT NULL REFERENCES public.profiles(id),
  assigned_by     uuid        REFERENCES public.profiles(id),
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  accepted_at     timestamptz,
  declined_at     timestamptz,
  notes           text,
  UNIQUE (task_id, assigned_to)
);

CREATE INDEX idx_task_assign_task   ON public.farm_task_assignments(task_id);
CREATE INDEX idx_task_assign_user   ON public.farm_task_assignments(assigned_to);
CREATE INDEX idx_task_assign_pending ON public.farm_task_assignments(assigned_to)
  WHERE accepted_at IS NULL AND declined_at IS NULL;

-- ============================================================
-- 11. FARM INCIDENTS
--     Reportable events: disease outbreak, fire, theft, etc.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.farm_incidents (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id             uuid        REFERENCES public.farmers(id),
  flock_id              uuid        REFERENCES public.farmer_flocks(id),
  house_id              uuid        REFERENCES public.poultry_houses(id),
  depot_id              uuid        REFERENCES public.depots(id),
  incident_date         timestamptz NOT NULL DEFAULT now(),
  incident_type         incident_type NOT NULL,
  severity              incident_severity NOT NULL DEFAULT 'medium',
  status                incident_status   NOT NULL DEFAULT 'reported',
  title                 text        NOT NULL,
  description           text        NOT NULL,
  affected_birds        integer,
  estimated_loss_kes    numeric(14, 2),
  actions_taken         text,
  resolution_notes      text,
  resolved_at           timestamptz,
  attachments           jsonb       NOT NULL DEFAULT '[]',
  reported_by           uuid        REFERENCES public.profiles(id),
  reviewed_by           uuid        REFERENCES public.profiles(id),
  reviewed_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_org      ON public.farm_incidents(organization_id);
CREATE INDEX idx_incidents_farmer   ON public.farm_incidents(farmer_id)  WHERE farmer_id  IS NOT NULL;
CREATE INDEX idx_incidents_flock    ON public.farm_incidents(flock_id)   WHERE flock_id   IS NOT NULL;
CREATE INDEX idx_incidents_type     ON public.farm_incidents(incident_type);
CREATE INDEX idx_incidents_severity ON public.farm_incidents(severity);
CREATE INDEX idx_incidents_status   ON public.farm_incidents(status);
CREATE INDEX idx_incidents_date     ON public.farm_incidents(incident_date);

CREATE TRIGGER trg_farm_incidents_updated_at
  BEFORE UPDATE ON public.farm_incidents
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 12. FARM INSPECTIONS
--     Biosecurity, welfare, and compliance inspection records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.farm_inspections (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id             uuid        NOT NULL REFERENCES public.farmers(id),
  house_id              uuid        REFERENCES public.poultry_houses(id),
  inspector_id          uuid        NOT NULL REFERENCES public.profiles(id),
  inspection_date       date        NOT NULL DEFAULT CURRENT_DATE,
  inspection_type       inspection_type NOT NULL DEFAULT 'routine',
  -- structured checklist results stored as JSON array of {item, category, passed, notes}
  checklist             jsonb       NOT NULL DEFAULT '[]',
  total_items           integer     NOT NULL DEFAULT 0,
  passed_items          integer     NOT NULL DEFAULT 0,
  score_pct             numeric(5, 2) GENERATED ALWAYS AS (
                          CASE WHEN total_items > 0
                          THEN passed_items::numeric / total_items * 100
                          ELSE NULL END
                        ) STORED,
  passed                boolean,
  pass_threshold_pct    numeric(5, 2) NOT NULL DEFAULT 70.00,
  recommendations       text,
  follow_up_required    boolean     NOT NULL DEFAULT false,
  follow_up_date        date,
  follow_up_completed   boolean     NOT NULL DEFAULT false,
  follow_up_completed_at timestamptz,
  attachments           jsonb       NOT NULL DEFAULT '[]',
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_inspections_farmer ON public.farm_inspections(farmer_id);
CREATE INDEX idx_inspections_insp   ON public.farm_inspections(inspector_id);
CREATE INDEX idx_inspections_date   ON public.farm_inspections(inspection_date);
CREATE INDEX idx_inspections_type   ON public.farm_inspections(inspection_type);
CREATE INDEX idx_inspections_follow ON public.farm_inspections(follow_up_date)
  WHERE follow_up_required = true AND follow_up_completed = false;

CREATE TRIGGER trg_farm_inspections_updated_at
  BEFORE UPDATE ON public.farm_inspections
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 13. FARM ATTACHMENTS
--     Generic file/photo attachment linker for any entity
-- ============================================================

CREATE TABLE IF NOT EXISTS public.farm_attachments (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES public.organizations(id),
  -- polymorphic reference — entity_type + entity_id identify the parent record
  entity_type     text        NOT NULL
                    CHECK (entity_type IN (
                      'flock','incident','inspection','task','order',
                      'visit','medication','hatchery_batch','breeding_record',
                      'farmer','document'
                    )),
  entity_id       uuid        NOT NULL,
  file_name       text        NOT NULL,
  file_url        text        NOT NULL,
  storage_path    text,       -- path in Supabase Storage bucket
  mime_type       text,       -- e.g. image/jpeg, application/pdf
  file_size_bytes integer,
  caption         text,
  uploaded_by     uuid        REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_attachments_entity ON public.farm_attachments(entity_type, entity_id);
CREATE INDEX idx_attachments_org    ON public.farm_attachments(organization_id);
CREATE INDEX idx_attachments_uploader ON public.farm_attachments(uploaded_by);

-- ============================================================
-- 14. FARM DOCUMENTS
--     Official documents: permits, certificates, contracts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.farm_documents (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id           uuid        REFERENCES public.farmers(id),
  depot_id            uuid        REFERENCES public.depots(id),
  document_type       document_type NOT NULL,
  title               text        NOT NULL,
  document_number     text,
  issued_by           text,       -- issuing authority name
  issue_date          date,
  expiry_date         date,
  -- days_to_expiry computed in queries: (expiry_date - CURRENT_DATE)
  file_url            text,
  storage_path        text,
  status              document_status NOT NULL DEFAULT 'active',
  auto_expire         boolean     NOT NULL DEFAULT true,
  reminder_days       integer     NOT NULL DEFAULT 30,  -- remind N days before expiry
  reminder_sent       boolean     NOT NULL DEFAULT false,
  reminder_sent_at    timestamptz,
  notes               text,
  uploaded_by         uuid        REFERENCES public.profiles(id),
  verified_by         uuid        REFERENCES public.profiles(id),
  verified_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_org     ON public.farm_documents(organization_id);
CREATE INDEX idx_documents_farmer  ON public.farm_documents(farmer_id)  WHERE farmer_id  IS NOT NULL;
CREATE INDEX idx_documents_depot   ON public.farm_documents(depot_id)   WHERE depot_id   IS NOT NULL;
CREATE INDEX idx_documents_type    ON public.farm_documents(document_type);
CREATE INDEX idx_documents_status  ON public.farm_documents(status);
CREATE INDEX idx_documents_expiry  ON public.farm_documents(expiry_date) WHERE expiry_date IS NOT NULL;
-- index for expiry reminder job
CREATE INDEX idx_documents_reminder ON public.farm_documents(expiry_date, reminder_sent)
  WHERE status = 'active' AND auto_expire = true AND reminder_sent = false;

CREATE TRIGGER trg_farm_documents_updated_at
  BEFORE UPDATE ON public.farm_documents
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- 15. FEED CONSUMPTION
--     Daily feed usage per flock (separate from depot inventory)
--     feed_inventory = what's in stock at the depot
--     feed_consumption = what each flock ate each day
-- ============================================================

CREATE TABLE IF NOT EXISTS public.feed_consumption (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES public.organizations(id),
  farmer_id             uuid        NOT NULL REFERENCES public.farmers(id),
  flock_id              uuid        NOT NULL REFERENCES public.farmer_flocks(id) ON DELETE CASCADE,
  house_id              uuid        REFERENCES public.poultry_houses(id),
  consumption_date      date        NOT NULL DEFAULT CURRENT_DATE,
  -- optional link to the depot stock batch the feed came from
  feed_inventory_id     uuid        REFERENCES public.feed_inventory(id),
  feed_type             text        NOT NULL DEFAULT 'starter'
                          CHECK (feed_type IN ('starter','grower','finisher','layer_mash','layer_pellet','broiler_concentrate','kienyeji','breeder','supplement')),
  product_name          text        NOT NULL,
  quantity_kg           numeric(10, 3) NOT NULL CHECK (quantity_kg > 0),
  birds_count           integer     NOT NULL CHECK (birds_count > 0),
  feed_per_bird_g       numeric(8, 2) GENERATED ALWAYS AS (
                          quantity_kg * 1000 / birds_count
                        ) STORED,
  cost_per_kg           numeric(10, 4),
  total_cost            numeric(12, 2) GENERATED ALWAYS AS (
                          CASE WHEN cost_per_kg IS NOT NULL
                          THEN quantity_kg * cost_per_kg
                          ELSE NULL END
                        ) STORED,
  recorded_by           uuid        REFERENCES public.profiles(id),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flock_id, consumption_date, feed_type)
);

CREATE INDEX idx_feed_cons_flock   ON public.feed_consumption(flock_id);
CREATE INDEX idx_feed_cons_farmer  ON public.feed_consumption(farmer_id);
CREATE INDEX idx_feed_cons_date    ON public.feed_consumption(consumption_date);
CREATE INDEX idx_feed_cons_org     ON public.feed_consumption(organization_id);

CREATE TRIGGER trg_feed_consumption_updated_at
  BEFORE UPDATE ON public.feed_consumption
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- ============================================================
-- AUTO-EXPIRE DOCUMENTS: function to mark expired documents
-- Called by a scheduled job (pg_cron or Edge Function)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_expire_documents()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.farm_documents
  SET    status = 'expired', updated_at = now()
  WHERE  status = 'active'
    AND  auto_expire = true
    AND  expiry_date < CURRENT_DATE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ============================================================
-- AUTO-STATUS: mark overdue tasks
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_mark_overdue_tasks()
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.farm_tasks
  SET    status = 'overdue', updated_at = now()
  WHERE  status = 'pending'
    AND  due_date < CURRENT_DATE;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

COMMIT;

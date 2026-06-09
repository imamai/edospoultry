-- ============================================================
-- Geography tables: enable RLS + allow authenticated reads
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.counties     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcounties  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wards        ENABLE ROW LEVEL SECURITY;

-- Any authenticated user (agents, admins, etc.) can read geography data
CREATE POLICY "counties_read"
  ON public.counties FOR SELECT TO authenticated USING (true);

CREATE POLICY "subcounties_read"
  ON public.subcounties FOR SELECT TO authenticated USING (true);

CREATE POLICY "wards_read"
  ON public.wards FOR SELECT TO authenticated USING (true);

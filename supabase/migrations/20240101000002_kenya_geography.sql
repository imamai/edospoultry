-- ============================================================
-- EdosHatch — Kenya Administrative Geography Seed
-- 47 Counties + Key Subcounties + Key Wards
-- Complete Kitui/Mutomo/Kyangwithya as demo county
-- ============================================================

BEGIN;

-- ============================================================
-- 47 KENYA COUNTIES
-- ============================================================

INSERT INTO public.counties (id, code, name, region, country) VALUES
  (1,  'MSA', 'Mombasa',         'Coast',          'KE'),
  (2,  'KWL', 'Kwale',           'Coast',          'KE'),
  (3,  'KLF', 'Kilifi',          'Coast',          'KE'),
  (4,  'TRV', 'Tana River',      'Coast',          'KE'),
  (5,  'LMU', 'Lamu',            'Coast',          'KE'),
  (6,  'TVT', 'Taita-Taveta',    'Coast',          'KE'),
  (7,  'GRS', 'Garissa',         'North Eastern',  'KE'),
  (8,  'WJR', 'Wajir',           'North Eastern',  'KE'),
  (9,  'MND', 'Mandera',         'North Eastern',  'KE'),
  (10, 'MRS', 'Marsabit',        'Eastern',        'KE'),
  (11, 'ISL', 'Isiolo',          'Eastern',        'KE'),
  (12, 'MRU', 'Meru',            'Eastern',        'KE'),
  (13, 'TNT', 'Tharaka-Nithi',   'Eastern',        'KE'),
  (14, 'EMB', 'Embu',            'Eastern',        'KE'),
  (15, 'KTI', 'Kitui',           'Eastern',        'KE'),
  (16, 'MKS', 'Machakos',        'Eastern',        'KE'),
  (17, 'MKN', 'Makueni',         'Eastern',        'KE'),
  (18, 'NYD', 'Nyandarua',       'Central',        'KE'),
  (19, 'NYR', 'Nyeri',           'Central',        'KE'),
  (20, 'KRG', 'Kirinyaga',       'Central',        'KE'),
  (21, 'MRG', 'Murang''a',       'Central',        'KE'),
  (22, 'KMB', 'Kiambu',          'Central',        'KE'),
  (23, 'TRK', 'Turkana',         'Rift Valley',    'KE'),
  (24, 'WPK', 'West Pokot',      'Rift Valley',    'KE'),
  (25, 'SMB', 'Samburu',         'Rift Valley',    'KE'),
  (26, 'TNZ', 'Trans Nzoia',     'Rift Valley',    'KE'),
  (27, 'UGS', 'Uasin Gishu',     'Rift Valley',    'KE'),
  (28, 'EMR', 'Elgeyo-Marakwet', 'Rift Valley',    'KE'),
  (29, 'NDI', 'Nandi',           'Rift Valley',    'KE'),
  (30, 'BRG', 'Baringo',         'Rift Valley',    'KE'),
  (31, 'LKP', 'Laikipia',        'Rift Valley',    'KE'),
  (32, 'NKR', 'Nakuru',          'Rift Valley',    'KE'),
  (33, 'NRK', 'Narok',           'Rift Valley',    'KE'),
  (34, 'KJD', 'Kajiado',         'Rift Valley',    'KE'),
  (35, 'KRC', 'Kericho',         'Rift Valley',    'KE'),
  (36, 'BMT', 'Bomet',           'Rift Valley',    'KE'),
  (37, 'KKM', 'Kakamega',        'Western',        'KE'),
  (38, 'VHG', 'Vihiga',          'Western',        'KE'),
  (39, 'BGM', 'Bungoma',         'Western',        'KE'),
  (40, 'BSA', 'Busia',           'Western',        'KE'),
  (41, 'SYA', 'Siaya',           'Nyanza',         'KE'),
  (42, 'KSM', 'Kisumu',          'Nyanza',         'KE'),
  (43, 'HMB', 'Homa Bay',        'Nyanza',         'KE'),
  (44, 'MGR', 'Migori',          'Nyanza',         'KE'),
  (45, 'KSI', 'Kisii',           'Nyanza',         'KE'),
  (46, 'NYM', 'Nyamira',         'Nyanza',         'KE'),
  (47, 'NRB', 'Nairobi',         'Nairobi',        'KE')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SUBCOUNTIES — KITUI COUNTY (15) — COMPLETE
-- ============================================================

WITH sc_data(county_id, name) AS (VALUES
  (15, 'Kitui Central'),
  (15, 'Kitui West'),
  (15, 'Kitui Rural'),
  (15, 'Kitui South'),
  (15, 'Kitui East'),
  (15, 'Mwingi North'),
  (15, 'Mwingi West'),
  (15, 'Mwingi Central'),
  (15, 'Mutomo')
)
INSERT INTO public.subcounties (county_id, name)
SELECT county_id, name FROM sc_data
ON CONFLICT (county_id, name) DO NOTHING;

-- ============================================================
-- SUBCOUNTIES — OTHER KEY COUNTIES (representative sample)
-- ============================================================

WITH sc_data(county_id, name) AS (VALUES
  -- Nairobi (47)
  (47, 'Westlands'), (47, 'Dagoretti North'), (47, 'Dagoretti South'),
  (47, 'Langata'), (47, 'Kibra'), (47, 'Roysambu'), (47, 'Kasarani'),
  (47, 'Ruaraka'), (47, 'Embakasi South'), (47, 'Embakasi North'),
  (47, 'Embakasi Central'), (47, 'Embakasi East'), (47, 'Embakasi West'),
  (47, 'Makadara'), (47, 'Kamukunji'), (47, 'Starehe'), (47, 'Mathare'),
  -- Kiambu (22)
  (22, 'Gatundu South'), (22, 'Gatundu North'), (22, 'Juja'),
  (22, 'Thika Town'), (22, 'Ruiru'), (22, 'Githunguri'),
  (22, 'Kiambu'), (22, 'Kiambaa'), (22, 'Kabete'),
  (22, 'Kikuyu'), (22, 'Limuru'), (22, 'Lari'),
  -- Nakuru (32)
  (32, 'Molo'), (32, 'Njoro'), (32, 'Naivasha'), (32, 'Gilgil'),
  (32, 'Kuresoi South'), (32, 'Kuresoi North'), (32, 'Subukia'),
  (32, 'Rongai'), (32, 'Bahati'), (32, 'Nakuru Town East'),
  (32, 'Nakuru Town West'),
  -- Meru (12)
  (12, 'Igembe South'), (12, 'Igembe Central'), (12, 'Igembe North'),
  (12, 'Tigania West'), (12, 'Tigania East'), (12, 'North Imenti'),
  (12, 'Buuri'), (12, 'Central Imenti'), (12, 'South Imenti'),
  -- Machakos (16)
  (16, 'Masinga'), (16, 'Yatta'), (16, 'Kangundo'),
  (16, 'Matungulu'), (16, 'Kathiani'), (16, 'Mavoko'),
  (16, 'Machakos Town'), (16, 'Mwala'),
  -- Uasin Gishu (27)
  (27, 'Soy'), (27, 'Turbo'), (27, 'Moiben'),
  (27, 'Ainabkoi'), (27, 'Kapseret'), (27, 'Kesses'),
  -- Kakamega (37)
  (37, 'Lugari'), (37, 'Likuyani'), (37, 'Malava'),
  (37, 'Lurambi'), (37, 'Navakholo'), (37, 'Mumias West'),
  (37, 'Mumias East'), (37, 'Matungu'), (37, 'Butere'),
  (37, 'Khwisero'), (37, 'Shinyalu'), (37, 'Ikolomani'),
  -- Kisumu (42)
  (42, 'Kisumu East'), (42, 'Kisumu West'), (42, 'Kisumu Central'),
  (42, 'Seme'), (42, 'Nyando'), (42, 'Muhoroni'), (42, 'Nyakach')
)
INSERT INTO public.subcounties (county_id, name)
SELECT county_id, name FROM sc_data
ON CONFLICT (county_id, name) DO NOTHING;

-- ============================================================
-- WARDS — KITUI COUNTY, MUTOMO SUBCOUNTY (complete)
-- ============================================================

WITH ward_data(subcounty_name, county_id, name, population_estimate) AS (VALUES
  ('Mutomo', 15, 'Mutomo',          35200),
  ('Mutomo', 15, 'Ikanga/Ngomeni',  28400),
  ('Mutomo', 15, 'Ikutha',          31000),
  ('Mutomo', 15, 'Kanziku',         22800),
  ('Mutomo', 15, 'Kyangwithya East',29600),
  ('Mutomo', 15, 'Kyangwithya West',27100),
  ('Mutomo', 15, 'Mutha',           24900),
  ('Mutomo', 15, 'Nuu',             20300)
)
INSERT INTO public.wards (subcounty_id, county_id, name, population_estimate)
SELECT sc.id, wd.county_id, wd.name, wd.population_estimate
FROM ward_data wd
JOIN public.subcounties sc ON sc.county_id = wd.county_id AND sc.name = wd.subcounty_name
ON CONFLICT (subcounty_id, name) DO NOTHING;

-- Other Kitui subcounty wards
WITH ward_data(subcounty_name, county_id, name) AS (VALUES
  ('Kitui Central', 15, 'Kyangwithya'),
  ('Kitui Central', 15, 'Township'),
  ('Kitui Central', 15, 'Miambani'),
  ('Kitui Central', 15, 'Mulango'),
  ('Kitui Rural',   15, 'Kisasi'),
  ('Kitui Rural',   15, 'Mwitika'),
  ('Kitui Rural',   15, 'Kwa Mutonga/Kithumula'),
  ('Kitui Rural',   15, 'Kauwi'),
  ('Kitui Rural',   15, 'Matinyani'),
  ('Kitui West',    15, 'Matinyani'),
  ('Kitui West',    15, 'Kwa Mutonga'),
  ('Kitui West',    15, 'Kitui Central'),
  ('Mwingi Central',15, 'Mwingi East'),
  ('Mwingi Central',15, 'Mwingi West'),
  ('Mwingi Central',15, 'Kyuso'),
  ('Mwingi Central',15, 'Mui'),
  ('Mwingi North',  15, 'Waita'),
  ('Mwingi North',  15, 'Tseikuru'),
  ('Mwingi North',  15, 'Ngomeni')
)
INSERT INTO public.wards (subcounty_id, county_id, name)
SELECT sc.id, wd.county_id, wd.name
FROM ward_data wd
JOIN public.subcounties sc ON sc.county_id = wd.county_id AND sc.name = wd.subcounty_name
ON CONFLICT (subcounty_id, name) DO NOTHING;

-- ============================================================
-- WARDS — NAIROBI KEY SUBCOUNTIES
-- ============================================================

WITH ward_data(subcounty_name, county_id, name) AS (VALUES
  ('Westlands',    47, 'Kitisuru'),
  ('Westlands',    47, 'Parklands/Highridge'),
  ('Westlands',    47, 'Karura'),
  ('Westlands',    47, 'Kangemi'),
  ('Westlands',    47, 'Mountain View'),
  ('Kasarani',     47, 'Clay City'),
  ('Kasarani',     47, 'Mwiki'),
  ('Kasarani',     47, 'Kasarani'),
  ('Kasarani',     47, 'Njiru'),
  ('Kasarani',     47, 'Ruai'),
  ('Ruaraka',      47, 'Baba Dogo'),
  ('Ruaraka',      47, 'Utalii'),
  ('Ruaraka',      47, 'Mathare North'),
  ('Ruaraka',      47, 'Lucky Summer'),
  ('Ruaraka',      47, 'Korogocho'),
  ('Embakasi East',47, 'Upper Savanna'),
  ('Embakasi East',47, 'Lower Savanna'),
  ('Embakasi East',47, 'Mihango'),
  ('Embakasi East',47, 'Utawala'),
  ('Embakasi East',47, 'Mavoko')
)
INSERT INTO public.wards (subcounty_id, county_id, name)
SELECT sc.id, wd.county_id, wd.name
FROM ward_data wd
JOIN public.subcounties sc ON sc.county_id = wd.county_id AND sc.name = wd.subcounty_name
ON CONFLICT (subcounty_id, name) DO NOTHING;

-- ============================================================
-- WARDS — KIAMBU KEY SUBCOUNTIES
-- ============================================================

WITH ward_data(subcounty_name, county_id, name) AS (VALUES
  ('Thika Town', 22, 'Kamenu'),
  ('Thika Town', 22, 'Hospital'),
  ('Thika Town', 22, 'Gatuanyaga'),
  ('Thika Town', 22, 'Ngoliba'),
  ('Ruiru',      22, 'Gitothua'),
  ('Ruiru',      22, 'Biashara'),
  ('Ruiru',      22, 'Gatongora'),
  ('Ruiru',      22, 'Kahawa Wendani'),
  ('Juja',       22, 'Murera'),
  ('Juja',       22, 'Theta'),
  ('Juja',       22, 'Juja'),
  ('Juja',       22, 'Witeithie'),
  ('Kikuyu',     22, 'Karai'),
  ('Kikuyu',     22, 'Nachu'),
  ('Kikuyu',     22, 'Sigona'),
  ('Kikuyu',     22, 'Kikuyu'),
  ('Kikuyu',     22, 'Kinoo')
)
INSERT INTO public.wards (subcounty_id, county_id, name)
SELECT sc.id, wd.county_id, wd.name
FROM ward_data wd
JOIN public.subcounties sc ON sc.county_id = wd.county_id AND sc.name = wd.subcounty_name
ON CONFLICT (subcounty_id, name) DO NOTHING;

-- ============================================================
-- SEED DEFAULT ORGANIZATION
-- ============================================================

INSERT INTO public.organizations (id, name, slug, country, currency, phone, email, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'EdosHatch Kenya',
  'edoshatch-ke',
  'KE',
  'KES',
  '+254700000000',
  'admin@edoshatch.co.ke',
  '{"etims_enabled": true, "mpesa_enabled": true, "whatsapp_enabled": true, "ussd_enabled": true}'
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;

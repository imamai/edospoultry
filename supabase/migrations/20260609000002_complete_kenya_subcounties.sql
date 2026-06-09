-- ============================================================
-- Kenya: subcounties for the 38 counties not in the initial seed
-- Run in Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

INSERT INTO public.subcounties (county_id, name) VALUES
  -- Mombasa (1)
  (1, 'Mvita'), (1, 'Nyali'), (1, 'Kisauni'), (1, 'Likoni'), (1, 'Changamwe'), (1, 'Jomvu'),
  -- Kwale (2)
  (2, 'Msambweni'), (2, 'Lunga Lunga'), (2, 'Matuga'), (2, 'Kinango'),
  -- Kilifi (3)
  (3, 'Kilifi North'), (3, 'Kilifi South'), (3, 'Kaloleni'), (3, 'Rabai'),
  (3, 'Ganze'), (3, 'Malindi'), (3, 'Magarini'),
  -- Tana River (4)
  (4, 'Garsen'), (4, 'Galole'), (4, 'Bura'),
  -- Lamu (5)
  (5, 'Lamu East'), (5, 'Lamu West'),
  -- Taita-Taveta (6)
  (6, 'Tavita'), (6, 'Wundanyi'), (6, 'Mwatate'), (6, 'Voi'),
  -- Garissa (7)
  (7, 'Garissa Township'), (7, 'Balambala'), (7, 'Lagdera'),
  (7, 'Dadaab'), (7, 'Fafi'), (7, 'Ijara'),
  -- Wajir (8)
  (8, 'Wajir North'), (8, 'Wajir East'), (8, 'Tarbaj'),
  (8, 'Wajir West'), (8, 'Eldas'), (8, 'Wajir South'),
  -- Mandera (9)
  (9, 'Mandera West'), (9, 'Banissa'), (9, 'Mandera North'),
  (9, 'Mandera South'), (9, 'Mandera East'), (9, 'Lafey'),
  -- Marsabit (10)
  (10, 'Moyale'), (10, 'North Horr'), (10, 'Saku'), (10, 'Laisamis'),
  -- Isiolo (11)
  (11, 'Isiolo North'), (11, 'Isiolo South'),
  -- Tharaka-Nithi (13)
  (13, 'Tharaka North'), (13, 'Tharaka South'), (13, 'Chuka/Igambang''ombe'),
  (13, 'Tharaka'), (13, 'Maara'), (13, 'Chiakariga'),
  -- Embu (14)
  (14, 'Manyatta'), (14, 'Runyenjes'), (14, 'Mbeere South'), (14, 'Mbeere North'),
  -- Makueni (17)
  (17, 'Mbooni'), (17, 'Kilome'), (17, 'Kaiti'),
  (17, 'Makueni'), (17, 'Kibwezi West'), (17, 'Kibwezi East'),
  -- Nyandarua (18)
  (18, 'Kinangop'), (18, 'Kipipiri'), (18, 'Ol Kalou'),
  (18, 'Ol Joro Orok'), (18, 'Ndaragwa'),
  -- Nyeri (19)
  (19, 'Tetu'), (19, 'Kieni'), (19, 'Mathira'),
  (19, 'Othaya'), (19, 'Mukurweini'), (19, 'Nyeri Town'),
  -- Kirinyaga (20)
  (20, 'Mwea'), (20, 'Gichugu'), (20, 'Ndia'), (20, 'Kirinyaga Central'),
  -- Murang''a (21)
  (21, 'Kangema'), (21, 'Mathioya'), (21, 'Kiharu'),
  (21, 'Kigumo'), (21, 'Maragwa'), (21, 'Kandara'), (21, 'Gatanga'),
  -- Turkana (23)
  (23, 'Turkana North'), (23, 'Turkana West'), (23, 'Turkana Central'),
  (23, 'Loima'), (23, 'Turkana South'), (23, 'Turkana East'),
  -- West Pokot (24)
  (24, 'Pokot South'), (24, 'Pokot North'), (24, 'Pokot Central'), (24, 'Pokot West'),
  -- Samburu (25)
  (25, 'Samburu North'), (25, 'Samburu East'), (25, 'Samburu West'),
  -- Trans Nzoia (26)
  (26, 'Kwanza'), (26, 'Endebess'), (26, 'Saboti'), (26, 'Kiminini'), (26, 'Cherangany'),
  -- Elgeyo-Marakwet (28)
  (28, 'Marakwet East'), (28, 'Marakwet West'), (28, 'Keiyo North'), (28, 'Keiyo South'),
  -- Nandi (29)
  (29, 'Tinderet'), (29, 'Aldai'), (29, 'Nandi Hills'),
  (29, 'Chesumei'), (29, 'Emgwen'), (29, 'Mosop'),
  -- Baringo (30)
  (30, 'Baringo Central'), (30, 'Baringo North'), (30, 'Baringo South'),
  (30, 'Eldama Ravine'), (30, 'Mogotio'), (30, 'Tiaty'),
  -- Laikipia (31)
  (31, 'Laikipia West'), (31, 'Laikipia East'), (31, 'Laikipia North'),
  -- Narok (33)
  (33, 'Kilgoris'), (33, 'Emurua Dikirr'), (33, 'Narok North'),
  (33, 'Narok East'), (33, 'Narok South'), (33, 'Narok West'),
  -- Kajiado (34)
  (34, 'Kajiado North'), (34, 'Kajiado Central'), (34, 'Kajiado East'),
  (34, 'Kajiado West'), (34, 'Kajiado South'),
  -- Kericho (35)
  (35, 'Kipkelion East'), (35, 'Kipkelion West'), (35, 'Ainamoi'),
  (35, 'Bureti'), (35, 'Belgut'), (35, 'Sigowet/Soin'),
  -- Bomet (36)
  (36, 'Sotik'), (36, 'Chepalungu'), (36, 'Bomet East'),
  (36, 'Bomet Central'), (36, 'Konoin'),
  -- Vihiga (38)
  (38, 'Vihiga'), (38, 'Sabatia'), (38, 'Hamisi'), (38, 'Luanda'), (38, 'Emuhaya'),
  -- Bungoma (39)
  (39, 'Mt Elgon'), (39, 'Sirisia'), (39, 'Kabuchai'), (39, 'Bumula'),
  (39, 'Kanduyi'), (39, 'Webuye East'), (39, 'Webuye West'),
  (39, 'Kimilili'), (39, 'Tongaren'),
  -- Busia (40)
  (40, 'Teso North'), (40, 'Teso South'), (40, 'Nambale'),
  (40, 'Matayos'), (40, 'Butula'), (40, 'Funyula'), (40, 'Bunyala'),
  -- Siaya (41)
  (41, 'Ugenya'), (41, 'Ugunja'), (41, 'Alego Usonga'),
  (41, 'Gem'), (41, 'Bondo'), (41, 'Rarieda'),
  -- Homa Bay (43)
  (43, 'Kasipul'), (43, 'Kabondo Kasipul'), (43, 'Karachuonyo'),
  (43, 'Rangwe'), (43, 'Homa Bay Town'), (43, 'Ndhiwa'),
  (43, 'Mbita'), (43, 'Suba'),
  -- Migori (44)
  (44, 'Rongo'), (44, 'Awendo'), (44, 'Suna East'), (44, 'Suna West'),
  (44, 'Uriri'), (44, 'Nyatike'), (44, 'Kuria West'), (44, 'Kuria East'),
  -- Kisii (45)
  (45, 'Bonchari'), (45, 'South Mugirango'), (45, 'Bomachoge Borabu'),
  (45, 'Bobasi'), (45, 'Bomachoge Chache'), (45, 'Nyaribari Masaba'),
  (45, 'Nyaribari Chache'), (45, 'Kitutu Chache North'), (45, 'Kitutu Chache South'),
  -- Nyamira (46)
  (46, 'Kitutu Masaba'), (46, 'West Mugirango'), (46, 'North Mugirango'), (46, 'Borabu')
ON CONFLICT (county_id, name) DO NOTHING;

COMMIT;

-- Semilla de Taquímetro: las 20 taquerías de supabase/seed/datos.csv, tal cual (D11),
-- y una fila de agregados en 0 votos por taquería.
-- Se puede correr varias veces: solo inserta lo que falta.
-- Del CSV se ignoran las columnas "#", "Fuente" y "Estado de verificación".

insert into public.taquerias (nombre, alcaldia, latitud, longitud)
select v.nombre, v.alcaldia, v.latitud, v.longitud
from (
  values
    ('Los Cocuyos (Centro)', 'Cuauhtémoc', 19.4302794, -99.1387977),
    ('Los Especiales (Centro)', 'Cuauhtémoc', 19.4331589, -99.1345900),
    ('Tacos El Huequito (Centro)', 'Cuauhtémoc', 19.4306195, -99.1429767),
    ('El Torito Tacos (Centro)', 'Cuauhtémoc', 19.4283994, -99.1371241),
    ('Taquería Orinoco (Roma Norte)', 'Cuauhtémoc', 19.4181740, -99.1591691),
    ('Taquería El Califa (Hipódromo)', 'Cuauhtémoc', 19.4063602, -99.1725369),
    ('Tacos Don Juan (Condesa)', 'Cuauhtémoc', 19.4140694, -99.1736403),
    ('Taquería Los Parados (Roma Sur)', 'Cuauhtémoc', 19.4060716, -99.1612780),
    ('Tacos del Valle (Roma Norte)', 'Cuauhtémoc', 19.4178796, -99.1607079),
    ('Tacos El Güero (San Rafael)', 'Cuauhtémoc', 19.4389965, -99.1648539),
    ('Taquería El Gran Abanico (Tránsito)', 'Cuauhtémoc', 19.4149633, -99.1302410),
    ('Tacos Los Güeros (Boturini)', 'Venustiano Carranza', 19.4167134, -99.1172412),
    ('El Vilsito (Narvarte)', 'Benito Juárez', 19.3893341, -99.1527936),
    ('Tacos Manolo (Narvarte)', 'Benito Juárez', 19.3906973, -99.1570274),
    ('Taquería Don Frank (Narvarte)', 'Benito Juárez', 19.3894271, -99.1579173),
    ('Los Pastorcitos de Sirloin (Del Valle)', 'Benito Juárez', 19.3950507, -99.1685157),
    ('Taquería Revolución', 'Benito Juárez', 19.3830150, -99.1865920),
    ('El Turix (Polanco)', 'Miguel Hidalgo', 19.4312270, -99.2011982),
    ('Los Sifones', 'Coyoacán', 19.3472540, -99.1499346),
    ('Taquería Pepe Coyotes Coyoacán', 'Coyoacán', 19.3498122, -99.1612480)
) as v (nombre, alcaldia, latitud, longitud)
where not exists (
  select 1 from public.taquerias t where t.nombre = v.nombre
);

-- Una fila de agregados por taquería; votos empieza en 0 y lo demás vacío.
insert into public.agregados_taqueria (taqueria_id, votos)
select t.id, 0
from public.taquerias t
on conflict (taqueria_id) do nothing;

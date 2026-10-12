-- Cardio : durée (minutes) et distance (km) sur les lignes d'exercice et de modèle.
-- À exécuter dans Supabase (SQL Editor) AVANT de déployer le nouveau code.
-- Les règles d'accès (RLS) existantes s'appliquent aux nouvelles colonnes sans rien changer.

alter table public.exercices
  add column if not exists duree_min integer check (duree_min between 1 and 600),
  add column if not exists distance_km numeric(6,2) check (distance_km between 0 and 1000);

alter table public.modele_exercices
  add column if not exists duree_min integer check (duree_min between 1 and 600),
  add column if not exists distance_km numeric(6,2) check (distance_km between 0 and 1000);

notify pgrst, 'reload schema';

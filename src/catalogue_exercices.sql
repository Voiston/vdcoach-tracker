-- ==========================================================================
-- CATALOGUE D'EXERCICES RECOMMANDÉS POUR COACH SPORTIF À DOMICILE (VDCOACH)
-- ==========================================================================
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor).
-- Ce script est 100% idempotent et ne requiert aucune contrainte UNIQUE sur "nom".
-- Les exercices et muscles déjà existants sont préservés sans créer de doublons.

DO $$
DECLARE
  exo_id uuid;
BEGIN
  -- --------------------------------------------------------------------------
  -- Course à pieds (Cardio)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Course à pieds')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Course à pieds', 'Cardio', 'Poids du corps', 'Course en extérieur ou sur tapis. Travail continu en endurance fondamentale ou en intervalles (fractionné). Veiller au buste droit, regard vers l’horizon et pose d’appui dynamique médio-pied.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Gainage inversé (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Gainage inversé')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Gainage inversé', 'Abdominaux', 'Poids du corps', 'Au sol, en appui sur les paumes (doigts vers les talons) et sur les talons. Pousser le bassin vers le haut pour aligner chevilles, hanches et épaules. Engager puissamment les fessiers, les ischios et la sangle abdominale. Ouvrir la cage thoracique sans casser la nuque.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_post') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_post', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pistol squats (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pistol squats')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pistol squats', 'Jambes', 'Poids du corps', 'Squat complet sur une seule jambe, l’autre jambe tendue horizontalement vers l’avant sans toucher le sol. Descendre hanche sous le genou en gardant le talon bien ancré. Progression possible avec sangle de suspension ou assis sur un banc.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Squats unipodale (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Squats unipodale')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Squats unipodale', 'Jambes', 'Poids du corps', 'Flexion sur une jambe d’appui, genou aligné avec la pointe du pied. La jambe opposée reste fléchie vers l’arrière ou suspendue. Développe la stabilité du genou, l’équilibre de hanche et la force unilatérale. Plus accessible que le pistol squat.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Squats (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Squats')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Squats', 'Jambes', 'Poids du corps', 'Pieds largeur d’épaules, pointes légèrement ouvertes. Descendre hanches en arrière et genoux dans l’axe des orteils, dos droit, talons ancrés au sol.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Goblet squat (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Goblet squat')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Goblet squat', 'Jambes', 'Kettlebell', 'Tenir un kettlebell ou haltère contre la poitrine, coudes serrés. La charge antérieure aide naturellement à conserver le buste vertical et engage les abdos.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Squats sautés (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Squats sautés')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Squats sautés', 'Jambes', 'Poids du corps', 'Squat suivi d’une extension explosive vers le haut. Amortir impérativement la réception sur l’avant-pied puis dérouler sur les talons en squat complet.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Fentes avant (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Fentes avant')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Fentes avant', 'Jambes', 'Poids du corps', 'Grand pas en avant, descendre jusqu’à frôler le sol avec le genou arrière (angles à 90°). Pousser fort dans le talon avant pour revenir au point de départ.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Fentes arrière (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Fentes arrière')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Fentes arrière', 'Jambes', 'Poids du corps', 'Pas en arrière, plus doux pour l’articulation du genou que la fente avant. Idéal pour les clients ayant des sensibilités articulaires rotuliennes.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Fentes bulgares (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Fentes bulgares')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Fentes bulgares', 'Jambes', 'Chaise / banc', 'Pied arrière surélevé sur banc ou chaise. Descendre le genou arrière vers le bas, buste légèrement incliné pour cibler le grand fessier. Très efficace sans lourdes charges.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Fentes marchées (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Fentes marchées')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Fentes marchées', 'Jambes', 'Poids du corps', 'Enchaîner les fentes en continu en avançant. Excellent pour le gainage dynamique, la proprioception et le rythme cardio en séance à domicile.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Step-up (Montée sur banc) (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Step-up (Montée sur banc)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Step-up (Montée sur banc)', 'Jambes', 'Chaise / banc', 'Poser le pied entièrement sur le banc/chaise, monter en poussant sur le talon sans rebondir sur la jambe arrière. Contrôler la descente lente.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Chaise dos au mur (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Chaise dos au mur')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Chaise dos au mur', 'Jambes', 'Poids du corps', 'Dos plaqué contre le mur, cuisses horizontales à 90°, genoux au-dessus des chevilles. Maintenir la position isométrique sans poser les mains sur les cuisses.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pont fessier (Glute bridge) (Fessiers)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pont fessier (Glute bridge)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pont fessier (Glute bridge)', 'Fessiers', 'Poids du corps', 'Allongé sur le dos, pieds à plat près des fessiers. Lever le bassin en serrant les fessiers au sommet, aligner genoux, hanches et épaules sans cambrer le bas du dos.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pont fessier unilatéral (1 jambe) (Fessiers)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pont fessier unilatéral (1 jambe)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pont fessier unilatéral (1 jambe)', 'Fessiers', 'Poids du corps', 'Une jambe levée ou croisée, lever le bassin avec l’autre jambe. Corrige les asymétries gauche/droite et intensifie le travail fessier au poids du corps.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 0.25);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'obliques') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'obliques', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Hip thrust sur banc (Fessiers)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Hip thrust sur banc')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Hip thrust sur banc', 'Fessiers', 'Chaise / banc', 'Haut du dos calé contre le bord du banc/chaise, pieds au sol largeur d’épaules. Extension complète de hanche avec maintien 1 sec en haut. Charge possible avec haltère sur le bassin.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Soulevé de terre roumain avec haltères (RDL) (Fessiers)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Soulevé de terre roumain avec haltères (RDL)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Soulevé de terre roumain avec haltères (RDL)', 'Fessiers', 'Haltères', 'Genoux légèrement déverrouillés, reculer les hanches en gardant le dos plat et les haltères collés aux cuisses. Sentir l’étirement puissant des ischios.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.25);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'avant_bras') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'avant_bras', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Kettlebell swing (Corps entier)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Kettlebell swing')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Kettlebell swing', 'Corps entier', 'Kettlebell', 'Mouvement de charnière de hanche explosive, pas un squat. Pousser les fesses en arrière puis projeter les hanches en avant en contractant fessiers et abdos. Bras détendus.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Monster walk avec élastique (Fessiers)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Monster walk avec élastique')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Monster walk avec élastique', 'Fessiers', 'Élastique', 'Mini-band placé au-dessus des genoux ou aux chevilles. En demi-squat, petits pas chassés latéraux en maintenant une tension constante. Travail clé du moyen fessier.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Mollets debout (élévations) (Jambes)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Mollets debout (élévations)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Mollets debout (élévations)', 'Jambes', 'Poids du corps', 'Debout au sol ou sur une marche. Monter au maximum sur la pointe des pieds, marquer 1 sec d’arrêt au sommet puis redescendre lentement pour étirer le mollet.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 1);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pompes (Pectoraux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pompes')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pompes', 'Pectoraux', 'Poids du corps', 'Corps gainé en planche, mains légèrement plus larges que les épaules, coudes à ~45° du corps. Descendre la poitrine jusqu’à 2 cm du sol sans creuser le bas du dos.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'pectoraux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'pectoraux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pompes surélevées (mains sur banc/chaise) (Pectoraux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pompes surélevées (mains sur banc/chaise)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pompes surélevées (mains sur banc/chaise)', 'Pectoraux', 'Chaise / banc', 'Mains sur un banc, une chaise ou une table. Réduit la charge corporelle, parfait pour débuter ou pour accumuler du volume avec une technique impeccable.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'pectoraux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'pectoraux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pompes déclinées (pieds surélevés) (Pectoraux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pompes déclinées (pieds surélevés)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pompes déclinées (pieds surélevés)', 'Pectoraux', 'Chaise / banc', 'Pieds posés sur un banc ou une chaise, mains au sol. Cible la partie haute (claviculaire) des pectoraux et augmente l’engagement des épaules.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'pectoraux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'pectoraux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pompes diamant (Pectoraux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pompes diamant')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pompes diamant', 'Pectoraux', 'Poids du corps', 'Mains rapprochées sous la poitrine formant un losange entre pouces et index. Accentue fortement le travail des triceps et de l’intérieur des pectoraux.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'pectoraux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'pectoraux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Développé couché avec haltères (Pectoraux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Développé couché avec haltères')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Développé couché avec haltères', 'Pectoraux', 'Haltères', 'Sur banc ou au sol (floor press). Développer les haltères au-dessus de la poitrine en contrôlant la trajectoire, sans claquer les haltères entre eux.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'pectoraux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'pectoraux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Écarté avec haltères au sol (Floor fly) (Pectoraux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Écarté avec haltères au sol (Floor fly)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Écarté avec haltères au sol (Floor fly)', 'Pectoraux', 'Haltères', 'Allongé sur le dos au sol, bras légèrement fléchis, ouvrir latéralement jusqu’à ce que les coudes effleurent le sol. Sécurise les épaules grâce au sol.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'pectoraux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'pectoraux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Dips sur banc / chaise (Bras)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Dips sur banc / chaise')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Dips sur banc / chaise', 'Bras', 'Chaise / banc', 'Mains sur le bord du banc, doigts vers l’avant. Descendre le dos près du banc jusqu’à 90° aux coudes, puis remonter par poussée des bras.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'pectoraux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'pectoraux', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Rowing unilatéral avec haltère (bûcheron) (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Rowing unilatéral avec haltère (bûcheron)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Rowing unilatéral avec haltère (bûcheron)', 'Dos', 'Haltères', 'Un genou et une main en appui sur une chaise ou un banc, buste à l’horizontale. Tirer le coude vers la hanche en resserrant l’omoplate, sans pivoter le buste.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'grand_dorsal') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'grand_dorsal', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_post') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_post', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Rowing bilatéral avec haltères (buste penché) (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Rowing bilatéral avec haltères (buste penché)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Rowing bilatéral avec haltères (buste penché)', 'Dos', 'Haltères', 'Buste incliné à 45-60°, dos bien droit gainé. Tirer les deux haltères vers le bas des côtes en guidant avec les coudes et en serrant les omoplates.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'grand_dorsal') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'grand_dorsal', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_post') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_post', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Rowing aux sangles de suspension (TRX Row) (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Rowing aux sangles de suspension (TRX Row)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Rowing aux sangles de suspension (TRX Row)', 'Dos', 'Sangles de suspension', 'Face au point d’ancrage, corps gainé incliné en arrière. Tirer la poitrine vers les poignées en gardant les coudes près du corps. Ajuster la difficulté par l’angle des pieds.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'grand_dorsal') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'grand_dorsal', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_post') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_post', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Tirage horizontal à l’élastique (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Tirage horizontal à l’élastique')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Tirage horizontal à l’élastique', 'Dos', 'Élastique', 'Élastique fixé à mi-hauteur (poignée de porte, pied de table). Assis ou debout genoux fléchis, tirer les coudes en arrière en resserrant les omoplates.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'grand_dorsal') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'grand_dorsal', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_post') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_post', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Tirage vertical à l’élastique (Lat pulldown) (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Tirage vertical à l’élastique (Lat pulldown)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Tirage vertical à l’élastique (Lat pulldown)', 'Dos', 'Élastique', 'Élastique fixé en haut d’une porte (avec ancrage de porte). À genoux ou assis, tirer la bande vers le haut de la poitrine en ouvrant les coudes.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'grand_dorsal') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'grand_dorsal', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Traction (Pull-up / Chin-up) (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Traction (Pull-up / Chin-up)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Traction (Pull-up / Chin-up)', 'Dos', 'Barre de traction', 'Prise pronation ou supination. Partir bras tendus, monter jusqu’à passer le menton au-dessus de la barre en tirant les coudes vers le bas. S’aider d’un élastique si besoin.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'grand_dorsal') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'grand_dorsal', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'avant_bras') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'avant_bras', 0.25);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Face pull à l’élastique (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Face pull à l’élastique')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Face pull à l’élastique', 'Dos', 'Élastique', 'Élastique à hauteur des yeux. Tirer vers le nez/yeux en ouvrant les mains et coudes hauts (rotation externe). Essentiel pour la posture et la santé des épaules.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_post') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_post', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_lat') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_lat', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Oiseau avec haltères (Reverse Fly) (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Oiseau avec haltères (Reverse Fly)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Oiseau avec haltères (Reverse Fly)', 'Dos', 'Haltères', 'Buste penché en avant, bras légèrement fléchis. Écarter les bras vers le haut en pinçant les omoplates. Renforce la chaîne scapulaire et les deltoïdes postérieurs.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_post') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_post', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 1);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Gainage Superman (Extension lombaire) (Dos)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Gainage Superman (Extension lombaire)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Gainage Superman (Extension lombaire)', 'Dos', 'Poids du corps', 'Allongé sur le ventre, décoller simultanément les bras tendus et les cuisses du sol en serrant fessiers et lombaires. Maintenir 2-3 sec puis relâcher.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'ischios') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'ischios', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Développé militaire avec haltères (Épaules)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Développé militaire avec haltères')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Développé militaire avec haltères', 'Épaules', 'Haltères', 'Debout ou assis le dos droit. Pousser les haltères à la verticale au-dessus de la tête sans cambrer le bas du dos. Verrouiller les abdos.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_lat') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_lat', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Élévations latérales avec haltères (Épaules)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Élévations latérales avec haltères')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Élévations latérales avec haltères', 'Épaules', 'Haltères', 'Bras légèrement fléchis, monter les coudes sur les côtés jusqu’à hauteur des épaules. Contrôler la descente sans élan.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_lat') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_lat', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Élévations latérales à l’élastique (Épaules)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Élévations latérales à l’élastique')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Élévations latérales à l’élastique', 'Épaules', 'Élastique', 'Pied sur le milieu de la bande élastique, monter les bras sur les côtés. La tension croissante au sommet stimule idéalement le deltoïde latéral.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_lat') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_lat', 1);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pike push-ups (Pompes piquées) (Épaules)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pike push-ups (Pompes piquées)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pike push-ups (Pompes piquées)', 'Épaules', 'Poids du corps', 'Position en V inversé (fesses hautes vers le ciel). Fléchir les bras pour amener le sommet de la tête vers le sol, puis repousser fort. Poussée verticale sans matériel.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Curl biceps avec haltères (Bras)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Curl biceps avec haltères')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Curl biceps avec haltères', 'Bras', 'Haltères', 'Coudes collés aux côtes. Fléchir les avant-bras avec supination (paumes vers le haut) sans bouger les coudes ni balancer le buste.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'avant_bras') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'avant_bras', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Curl biceps à l’élastique (Bras)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Curl biceps à l’élastique')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Curl biceps à l’élastique', 'Bras', 'Élastique', 'Pieds ancrés sur l’élastique, fléchir les avant-bras vers les épaules. Tension continue sur toute la course du mouvement.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'avant_bras') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'avant_bras', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Curl marteau avec haltères (Bras)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Curl marteau avec haltères')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Curl marteau avec haltères', 'Bras', 'Haltères', 'Prise neutre (paumes face à face). Cible le brachial antérieur et le brachio-radial, idéal pour l’épaisseur du bras et la force de préhension.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'biceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'biceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'avant_bras') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'avant_bras', 1);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Extension triceps avec haltère au-dessus de la tête (Bras)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Extension triceps avec haltère au-dessus de la tête')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Extension triceps avec haltère au-dessus de la tête', 'Bras', 'Haltères', 'Haltère tenu à deux mains derrière la nuque, coudes pointés vers le haut. Déplier les avant-bras vers le ciel. Étire et recrute la longue portion du triceps.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 1);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Kickback triceps avec haltère (Bras)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Kickback triceps avec haltère')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Kickback triceps avec haltère', 'Bras', 'Haltères', 'Buste penché, coude collé au flanc et relevé. Tendre le bras vers l’arrière en contractant fermement le triceps en fin de course.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 1);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Planche classique (Gainage ventral) (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Planche classique (Gainage ventral)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Planche classique (Gainage ventral)', 'Abdominaux', 'Poids du corps', 'En appui sur les avant-bras et les orteils. Légère rétroversion du bassin, abdos et fessiers serrés, nuque longue. Ne pas laisser creuser les lombaires.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'obliques') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'obliques', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 0.25);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Gainage oblique (Planche latérale) (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Gainage oblique (Planche latérale)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Gainage oblique (Planche latérale)', 'Abdominaux', 'Poids du corps', 'En appui sur un avant-bras et le bord externe du pied, corps aligné de profil. Pousser la hanche vers le haut pour solliciter l’oblique inférieur.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'obliques') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'obliques', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Dead bug (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Dead bug')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Dead bug', 'Abdominaux', 'Poids du corps', 'Sur le dos, genoux à 90°, bras vers le plafond. Tendre simultanément le bras droit et la jambe gauche sans que le bas du dos ne décolle du tapis. Contrôle pelvien fondamental.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'obliques') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'obliques', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Bird dog (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Bird dog')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Bird dog', 'Abdominaux', 'Poids du corps', 'À quatre pattes, tendre simultanément le bras opposé et la jambe opposée dans l’alignement du tronc. Bassin stable, aucun affaissement du dos.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'lombaires') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'lombaires', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'haut_dos') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'haut_dos', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Hollow body hold (Gainage cuillère) (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Hollow body hold (Gainage cuillère)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Hollow body hold (Gainage cuillère)', 'Abdominaux', 'Poids du corps', 'Sur le dos, plaquer les lombaires au sol, bras et jambes tendus décollés de quelques centimètres. Forme de cuillère, engagement abdominal maximal.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'obliques') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'obliques', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Mountain climbers (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Mountain climbers')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Mountain climbers', 'Abdominaux', 'Poids du corps', 'En position de pompe, ramener alternativement les genoux vers la poitrine à un rythme soutenu tout en gardant le bassin bas et stable.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Relevé de bassin (Crunch inversé) (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Relevé de bassin (Crunch inversé)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Relevé de bassin (Crunch inversé)', 'Abdominaux', 'Poids du corps', 'Allongé sur le dos, genoux pliés. Enrouler le bassin pour décoller les fesses du sol en direction des côtes, sans prendre d’élan avec les jambes.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 1);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Russian twist (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Russian twist')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Russian twist', 'Abdominaux', 'Poids du corps', 'Assis en équilibre fessier, buste incliné en arrière, pieds décollés ou posés. Tourner les épaules et les mains d’un côté puis de l’autre en contrôlant.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'obliques') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'obliques', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Pallof press à l’élastique (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Pallof press à l’élastique')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Pallof press à l’élastique', 'Abdominaux', 'Élastique', 'De profil par rapport au point d’ancrage de l’élastique, mains contre le sternum. Tendre les bras devant soi en résistant fermement à la rotation. Anti-rotation reine pour protéger le rachis.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'obliques') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'obliques', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 1);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Planche sur Swiss ball (Abdominaux)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Planche sur Swiss ball')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Planche sur Swiss ball', 'Abdominaux', 'Swiss ball', 'Avant-bras sur le swiss ball, pieds au sol. L’instabilité du ballon démultiplie le recrutement des stabilisateurs profonds (transverse).')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'obliques') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'obliques', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Burpees (Cardio)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Burpees')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Burpees', 'Cardio', 'Poids du corps', 'Depuis la station debout, poser les mains au sol, projeter les pieds en arrière en planche (avec ou sans pompe), ramener les pieds et sauter bras en l’air.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'pectoraux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'pectoraux', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Jumping jacks (Cardio)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Jumping jacks')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Jumping jacks', 'Cardio', 'Poids du corps', 'Sauts avec ouverture et fermeture simultanées des bras et des jambes. Excellent pour l’échauffement cardiovasculaire et la coordination.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_lat') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_lat', 0.25);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Corde à sauter (Cardio)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Corde à sauter')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Corde à sauter', 'Cardio', 'Corde à sauter', 'Sauts légers sur la pointe des pieds, rotation initiée par les poignets et non les épaules. Rythme régulier pour l’endurance et les mollets.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.25);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'avant_bras') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'avant_bras', 0.25);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Montées de genoux (Cardio)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Montées de genoux')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Montées de genoux', 'Cardio', 'Poids du corps', 'Course sur place en montant les genoux au niveau des hanches à cadence élevée. Buste droit et travail actif des bras.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'mollets') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'mollets', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Skater jumps (Sauts du patineur) (Cardio)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Skater jumps (Sauts du patineur)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Skater jumps (Sauts du patineur)', 'Cardio', 'Poids du corps', 'Sauts latéraux d’un pied sur l’autre en fléchissant le genou de réception et en passant l’autre jambe derrière. Agilité, fessiers et cardio.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'adducteurs') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'adducteurs', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- Thruster (Squat développé) (Corps entier)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Thruster (Squat développé)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Thruster (Squat développé)', 'Corps entier', 'Haltères', 'Enchaîner un squat complet et profiter de la poussée des jambes pour développer les haltères au-dessus de la tête. L’exercice complet par excellence.')
    RETURNING id INTO exo_id;
  END IF;

  IF exo_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'quadriceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'quadriceps', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'delto_ant') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'delto_ant', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'fessiers') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'fessiers', 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'triceps') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'triceps', 0.5);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.exercice_muscles WHERE exercice_id = exo_id AND muscle = 'abdominaux') THEN
      INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES (exo_id, 'abdominaux', 0.5);
    END IF;
  END IF;

  -- --------------------------------------------------------------------------
  -- World’s Greatest Stretch (Mobilité)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('World’s Greatest Stretch')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('World’s Greatest Stretch', 'Mobilité', 'Poids du corps', 'Depuis une grande fente avant, poser les mains au sol à l’intérieur du pied avant, amener le coude vers la cheville puis pivoter le bras vers le ciel en ouvrant la cage thoracique.')
    RETURNING id INTO exo_id;
  END IF;

  -- --------------------------------------------------------------------------
  -- Cat-Cow (Chat-Vache) (Mobilité)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Cat-Cow (Chat-Vache)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Cat-Cow (Chat-Vache)', 'Mobilité', 'Poids du corps', 'À quatre pattes, alterner dos rond (expiration, tête rentrée) et dos creux (inspiration, regard vers l’avant, ouverture pectorale). Mobilise tout le rachis.')
    RETURNING id INTO exo_id;
  END IF;

  -- --------------------------------------------------------------------------
  -- Étirement du psoas en fente basse (Mobilité)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Étirement du psoas en fente basse')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Étirement du psoas en fente basse', 'Mobilité', 'Poids du corps', 'Un genou au sol, l’autre jambe en avant à 90°. Avancer doucement le bassin vers l’avant avec une légère rétroversion pour étirer les fléchisseurs de la hanche.')
    RETURNING id INTO exo_id;
  END IF;

  -- --------------------------------------------------------------------------
  -- Ouverture thoracique au sol (Open Book) (Mobilité)
  -- --------------------------------------------------------------------------
  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE lower(trim(nom)) = lower(trim('Ouverture thoracique au sol (Open Book)')) LIMIT 1;
  IF exo_id IS NULL THEN
    INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
    VALUES ('Ouverture thoracique au sol (Open Book)', 'Mobilité', 'Poids du corps', 'Allongé sur le côté, genoux repliés à 90°. Ouvrir le bras supérieur en arc de cercle pour poser l’épaule opposée vers le sol, en suivant la main du regard.')
    RETURNING id INTO exo_id;
  END IF;

END $$;

-- Actualisation du cache de schéma Supabase
NOTIFY pgrst, 'reload schema';

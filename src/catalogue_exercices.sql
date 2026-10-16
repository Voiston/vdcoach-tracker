-- ==========================================================================
-- CATALOGUE D'EXERCICES RECOMMANDÉS POUR COACH SPORTIF À DOMICILE (VDCOACH)
-- ==========================================================================
-- À exécuter dans l'éditeur SQL de Supabase (SQL Editor).
-- Ce script est idempotent : les exercices existants ne sont PAS écrasés.

DO $$
DECLARE
  exo_id uuid;
BEGIN
  -- Course à pieds (Cardio)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Course à pieds', 'Cardio', 'Poids du corps', 'Course en extérieur ou sur tapis. Travail continu en endurance fondamentale ou en intervalles (fractionné). Veiller au buste droit, regard vers l’horizon et pose d’appui dynamique médio-pied.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Course à pieds';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 0.5),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'mollets', 0.5),
      (exo_id, 'fessiers', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Gainage inversé (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Gainage inversé', 'Abdominaux', 'Poids du corps', 'Au sol, en appui sur les paumes (doigts vers les talons) et sur les talons. Pousser le bassin vers le haut pour aligner chevilles, hanches et épaules. Engager puissamment les fessiers, les ischios et la sangle abdominale. Ouvrir la cage thoracique sans casser la nuque.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Gainage inversé';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 1),
      (exo_id, 'ischios', 1),
      (exo_id, 'lombaires', 1),
      (exo_id, 'abdominaux', 0.5),
      (exo_id, 'haut_dos', 0.5),
      (exo_id, 'delto_post', 0.5),
      (exo_id, 'triceps', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pistol squats (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pistol squats', 'Jambes', 'Poids du corps', 'Squat complet sur une seule jambe, l’autre jambe tendue horizontalement vers l’avant sans toucher le sol. Descendre hanche sous le genou en gardant le talon bien ancré. Progression possible avec sangle de suspension ou assis sur un banc.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pistol squats';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'adducteurs', 0.5),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'mollets', 0.5),
      (exo_id, 'abdominaux', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Squats unipodale (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Squats unipodale', 'Jambes', 'Poids du corps', 'Flexion sur une jambe d’appui, genou aligné avec la pointe du pied. La jambe opposée reste fléchie vers l’arrière ou suspendue. Développe la stabilité du genou, l’équilibre de hanche et la force unilatérale. Plus accessible que le pistol squat.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Squats unipodale';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'adducteurs', 0.5),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'mollets', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Squats (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Squats', 'Jambes', 'Poids du corps', 'Pieds largeur d’épaules, pointes légèrement ouvertes. Descendre hanches en arrière et genoux dans l’axe des orteils, dos droit, talons ancrés au sol.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Squats';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'adducteurs', 0.5),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'lombaires', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Goblet squat (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Goblet squat', 'Jambes', 'Kettlebell', 'Tenir un kettlebell ou haltère contre la poitrine, coudes serrés. La charge antérieure aide naturellement à conserver le buste vertical et engage les abdos.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Goblet squat';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'abdominaux', 0.5),
      (exo_id, 'adducteurs', 0.5),
      (exo_id, 'ischios', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Squats sautés (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Squats sautés', 'Jambes', 'Poids du corps', 'Squat suivi d’une extension explosive vers le haut. Amortir impérativement la réception sur l’avant-pied puis dérouler sur les talons en squat complet.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Squats sautés';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'mollets', 0.5),
      (exo_id, 'ischios', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Fentes avant (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Fentes avant', 'Jambes', 'Poids du corps', 'Grand pas en avant, descendre jusqu’à frôler le sol avec le genou arrière (angles à 90°). Pousser fort dans le talon avant pour revenir au point de départ.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Fentes avant';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'mollets', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Fentes arrière (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Fentes arrière', 'Jambes', 'Poids du corps', 'Pas en arrière, plus doux pour l’articulation du genou que la fente avant. Idéal pour les clients ayant des sensibilités articulaires rotuliennes.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Fentes arrière';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 1),
      (exo_id, 'quadriceps', 1),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'adducteurs', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Fentes bulgares (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Fentes bulgares', 'Jambes', 'Chaise / banc', 'Pied arrière surélevé sur banc ou chaise. Descendre le genou arrière vers le bas, buste légèrement incliné pour cibler le grand fessier. Très efficace sans lourdes charges.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Fentes bulgares';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 1),
      (exo_id, 'quadriceps', 1),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'adducteurs', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Fentes marchées (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Fentes marchées', 'Jambes', 'Poids du corps', 'Enchaîner les fentes en continu en avançant. Excellent pour le gainage dynamique, la proprioception et le rythme cardio en séance à domicile.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Fentes marchées';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'mollets', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Step-up (Montée sur banc) (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Step-up (Montée sur banc)', 'Jambes', 'Chaise / banc', 'Poser le pied entièrement sur le banc/chaise, monter en poussant sur le talon sans rebondir sur la jambe arrière. Contrôler la descente lente.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Step-up (Montée sur banc)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'mollets', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Chaise dos au mur (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Chaise dos au mur', 'Jambes', 'Poids du corps', 'Dos plaqué contre le mur, cuisses horizontales à 90°, genoux au-dessus des chevilles. Maintenir la position isométrique sans poser les mains sur les cuisses.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Chaise dos au mur';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'fessiers', 0.5),
      (exo_id, 'abdominaux', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pont fessier (Glute bridge) (Fessiers)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pont fessier (Glute bridge)', 'Fessiers', 'Poids du corps', 'Allongé sur le dos, pieds à plat près des fessiers. Lever le bassin en serrant les fessiers au sommet, aligner genoux, hanches et épaules sans cambrer le bas du dos.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pont fessier (Glute bridge)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 1),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'lombaires', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pont fessier unilatéral (1 jambe) (Fessiers)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pont fessier unilatéral (1 jambe)', 'Fessiers', 'Poids du corps', 'Une jambe levée ou croisée, lever le bassin avec l’autre jambe. Corrige les asymétries gauche/droite et intensifie le travail fessier au poids du corps.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pont fessier unilatéral (1 jambe)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 1),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'lombaires', 0.25),
      (exo_id, 'obliques', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Hip thrust sur banc (Fessiers)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Hip thrust sur banc', 'Fessiers', 'Chaise / banc', 'Haut du dos calé contre le bord du banc/chaise, pieds au sol largeur d’épaules. Extension complète de hanche avec maintien 1 sec en haut. Charge possible avec haltère sur le bassin.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Hip thrust sur banc';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 1),
      (exo_id, 'ischios', 0.5),
      (exo_id, 'quadriceps', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Soulevé de terre roumain avec haltères (RDL) (Fessiers)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Soulevé de terre roumain avec haltères (RDL)', 'Fessiers', 'Haltères', 'Genoux légèrement déverrouillés, reculer les hanches en gardant le dos plat et les haltères collés aux cuisses. Sentir l’étirement puissant des ischios.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Soulevé de terre roumain avec haltères (RDL)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'ischios', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'lombaires', 0.5),
      (exo_id, 'haut_dos', 0.25),
      (exo_id, 'avant_bras', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Kettlebell swing (Corps entier)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Kettlebell swing', 'Corps entier', 'Kettlebell', 'Mouvement de charnière de hanche explosive, pas un squat. Pousser les fesses en arrière puis projeter les hanches en avant en contractant fessiers et abdos. Bras détendus.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Kettlebell swing';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 1),
      (exo_id, 'ischios', 1),
      (exo_id, 'lombaires', 0.5),
      (exo_id, 'abdominaux', 0.5),
      (exo_id, 'delto_ant', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Monster walk avec élastique (Fessiers)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Monster walk avec élastique', 'Fessiers', 'Élastique', 'Mini-band placé au-dessus des genoux ou aux chevilles. En demi-squat, petits pas chassés latéraux en maintenant une tension constante. Travail clé du moyen fessier.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Monster walk avec élastique';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 1),
      (exo_id, 'adducteurs', 0.5),
      (exo_id, 'quadriceps', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Mollets debout (élévations) (Jambes)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Mollets debout (élévations)', 'Jambes', 'Poids du corps', 'Debout au sol ou sur une marche. Monter au maximum sur la pointe des pieds, marquer 1 sec d’arrêt au sommet puis redescendre lentement pour étirer le mollet.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Mollets debout (élévations)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'mollets', 1)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pompes (Pectoraux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pompes', 'Pectoraux', 'Poids du corps', 'Corps gainé en planche, mains légèrement plus larges que les épaules, coudes à ~45° du corps. Descendre la poitrine jusqu’à 2 cm du sol sans creuser le bas du dos.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pompes';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'pectoraux', 1),
      (exo_id, 'triceps', 0.5),
      (exo_id, 'delto_ant', 0.5),
      (exo_id, 'abdominaux', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pompes surélevées (mains sur banc/chaise) (Pectoraux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pompes surélevées (mains sur banc/chaise)', 'Pectoraux', 'Chaise / banc', 'Mains sur un banc, une chaise ou une table. Réduit la charge corporelle, parfait pour débuter ou pour accumuler du volume avec une technique impeccable.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pompes surélevées (mains sur banc/chaise)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'pectoraux', 1),
      (exo_id, 'triceps', 0.5),
      (exo_id, 'delto_ant', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pompes déclinées (pieds surélevés) (Pectoraux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pompes déclinées (pieds surélevés)', 'Pectoraux', 'Chaise / banc', 'Pieds posés sur un banc ou une chaise, mains au sol. Cible la partie haute (claviculaire) des pectoraux et augmente l’engagement des épaules.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pompes déclinées (pieds surélevés)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'pectoraux', 1),
      (exo_id, 'delto_ant', 0.5),
      (exo_id, 'triceps', 0.5),
      (exo_id, 'abdominaux', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pompes diamant (Pectoraux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pompes diamant', 'Pectoraux', 'Poids du corps', 'Mains rapprochées sous la poitrine formant un losange entre pouces et index. Accentue fortement le travail des triceps et de l’intérieur des pectoraux.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pompes diamant';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'triceps', 1),
      (exo_id, 'pectoraux', 1),
      (exo_id, 'delto_ant', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Développé couché avec haltères (Pectoraux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Développé couché avec haltères', 'Pectoraux', 'Haltères', 'Sur banc ou au sol (floor press). Développer les haltères au-dessus de la poitrine en contrôlant la trajectoire, sans claquer les haltères entre eux.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Développé couché avec haltères';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'pectoraux', 1),
      (exo_id, 'triceps', 0.5),
      (exo_id, 'delto_ant', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Écarté avec haltères au sol (Floor fly) (Pectoraux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Écarté avec haltères au sol (Floor fly)', 'Pectoraux', 'Haltères', 'Allongé sur le dos au sol, bras légèrement fléchis, ouvrir latéralement jusqu’à ce que les coudes effleurent le sol. Sécurise les épaules grâce au sol.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Écarté avec haltères au sol (Floor fly)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'pectoraux', 1),
      (exo_id, 'delto_ant', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Dips sur banc / chaise (Bras)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Dips sur banc / chaise', 'Bras', 'Chaise / banc', 'Mains sur le bord du banc, doigts vers l’avant. Descendre le dos près du banc jusqu’à 90° aux coudes, puis remonter par poussée des bras.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Dips sur banc / chaise';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'triceps', 1),
      (exo_id, 'pectoraux', 0.5),
      (exo_id, 'delto_ant', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Rowing unilatéral avec haltère (bûcheron) (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Rowing unilatéral avec haltère (bûcheron)', 'Dos', 'Haltères', 'Un genou et une main en appui sur une chaise ou un banc, buste à l’horizontale. Tirer le coude vers la hanche en resserrant l’omoplate, sans pivoter le buste.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Rowing unilatéral avec haltère (bûcheron)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'grand_dorsal', 1),
      (exo_id, 'haut_dos', 0.5),
      (exo_id, 'biceps', 0.5),
      (exo_id, 'delto_post', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Rowing bilatéral avec haltères (buste penché) (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Rowing bilatéral avec haltères (buste penché)', 'Dos', 'Haltères', 'Buste incliné à 45-60°, dos bien droit gainé. Tirer les deux haltères vers le bas des côtes en guidant avec les coudes et en serrant les omoplates.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Rowing bilatéral avec haltères (buste penché)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'haut_dos', 1),
      (exo_id, 'grand_dorsal', 1),
      (exo_id, 'delto_post', 0.5),
      (exo_id, 'biceps', 0.5),
      (exo_id, 'lombaires', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Rowing aux sangles de suspension (TRX Row) (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Rowing aux sangles de suspension (TRX Row)', 'Dos', 'Sangles de suspension', 'Face au point d’ancrage, corps gainé incliné en arrière. Tirer la poitrine vers les poignées en gardant les coudes près du corps. Ajuster la difficulté par l’angle des pieds.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Rowing aux sangles de suspension (TRX Row)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'haut_dos', 1),
      (exo_id, 'grand_dorsal', 1),
      (exo_id, 'biceps', 0.5),
      (exo_id, 'delto_post', 0.5),
      (exo_id, 'abdominaux', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Tirage horizontal à l’élastique (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Tirage horizontal à l’élastique', 'Dos', 'Élastique', 'Élastique fixé à mi-hauteur (poignée de porte, pied de table). Assis ou debout genoux fléchis, tirer les coudes en arrière en resserrant les omoplates.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Tirage horizontal à l’élastique';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'haut_dos', 1),
      (exo_id, 'grand_dorsal', 1),
      (exo_id, 'biceps', 0.5),
      (exo_id, 'delto_post', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Tirage vertical à l’élastique (Lat pulldown) (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Tirage vertical à l’élastique (Lat pulldown)', 'Dos', 'Élastique', 'Élastique fixé en haut d’une porte (avec ancrage de porte). À genoux ou assis, tirer la bande vers le haut de la poitrine en ouvrant les coudes.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Tirage vertical à l’élastique (Lat pulldown)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'grand_dorsal', 1),
      (exo_id, 'haut_dos', 0.5),
      (exo_id, 'biceps', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Traction (Pull-up / Chin-up) (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Traction (Pull-up / Chin-up)', 'Dos', 'Barre de traction', 'Prise pronation ou supination. Partir bras tendus, monter jusqu’à passer le menton au-dessus de la barre en tirant les coudes vers le bas. S’aider d’un élastique si besoin.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Traction (Pull-up / Chin-up)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'grand_dorsal', 1),
      (exo_id, 'biceps', 0.5),
      (exo_id, 'haut_dos', 0.5),
      (exo_id, 'avant_bras', 0.25),
      (exo_id, 'abdominaux', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Face pull à l’élastique (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Face pull à l’élastique', 'Dos', 'Élastique', 'Élastique à hauteur des yeux. Tirer vers le nez/yeux en ouvrant les mains et coudes hauts (rotation externe). Essentiel pour la posture et la santé des épaules.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Face pull à l’élastique';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'delto_post', 1),
      (exo_id, 'haut_dos', 1),
      (exo_id, 'delto_lat', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Oiseau avec haltères (Reverse Fly) (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Oiseau avec haltères (Reverse Fly)', 'Dos', 'Haltères', 'Buste penché en avant, bras légèrement fléchis. Écarter les bras vers le haut en pinçant les omoplates. Renforce la chaîne scapulaire et les deltoïdes postérieurs.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Oiseau avec haltères (Reverse Fly)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'delto_post', 1),
      (exo_id, 'haut_dos', 1)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Gainage Superman (Extension lombaire) (Dos)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Gainage Superman (Extension lombaire)', 'Dos', 'Poids du corps', 'Allongé sur le ventre, décoller simultanément les bras tendus et les cuisses du sol en serrant fessiers et lombaires. Maintenir 2-3 sec puis relâcher.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Gainage Superman (Extension lombaire)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'lombaires', 1),
      (exo_id, 'fessiers', 0.5),
      (exo_id, 'haut_dos', 0.5),
      (exo_id, 'ischios', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Développé militaire avec haltères (Épaules)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Développé militaire avec haltères', 'Épaules', 'Haltères', 'Debout ou assis le dos droit. Pousser les haltères à la verticale au-dessus de la tête sans cambrer le bas du dos. Verrouiller les abdos.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Développé militaire avec haltères';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'delto_ant', 1),
      (exo_id, 'delto_lat', 0.5),
      (exo_id, 'triceps', 0.5),
      (exo_id, 'haut_dos', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Élévations latérales avec haltères (Épaules)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Élévations latérales avec haltères', 'Épaules', 'Haltères', 'Bras légèrement fléchis, monter les coudes sur les côtés jusqu’à hauteur des épaules. Contrôler la descente sans élan.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Élévations latérales avec haltères';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'delto_lat', 1),
      (exo_id, 'haut_dos', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Élévations latérales à l’élastique (Épaules)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Élévations latérales à l’élastique', 'Épaules', 'Élastique', 'Pied sur le milieu de la bande élastique, monter les bras sur les côtés. La tension croissante au sommet stimule idéalement le deltoïde latéral.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Élévations latérales à l’élastique';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'delto_lat', 1)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pike push-ups (Pompes piquées) (Épaules)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pike push-ups (Pompes piquées)', 'Épaules', 'Poids du corps', 'Position en V inversé (fesses hautes vers le ciel). Fléchir les bras pour amener le sommet de la tête vers le sol, puis repousser fort. Poussée verticale sans matériel.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pike push-ups (Pompes piquées)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'delto_ant', 1),
      (exo_id, 'triceps', 0.5),
      (exo_id, 'haut_dos', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Curl biceps avec haltères (Bras)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Curl biceps avec haltères', 'Bras', 'Haltères', 'Coudes collés aux côtes. Fléchir les avant-bras avec supination (paumes vers le haut) sans bouger les coudes ni balancer le buste.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Curl biceps avec haltères';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'biceps', 1),
      (exo_id, 'avant_bras', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Curl biceps à l’élastique (Bras)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Curl biceps à l’élastique', 'Bras', 'Élastique', 'Pieds ancrés sur l’élastique, fléchir les avant-bras vers les épaules. Tension continue sur toute la course du mouvement.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Curl biceps à l’élastique';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'biceps', 1),
      (exo_id, 'avant_bras', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Curl marteau avec haltères (Bras)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Curl marteau avec haltères', 'Bras', 'Haltères', 'Prise neutre (paumes face à face). Cible le brachial antérieur et le brachio-radial, idéal pour l’épaisseur du bras et la force de préhension.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Curl marteau avec haltères';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'biceps', 1),
      (exo_id, 'avant_bras', 1)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Extension triceps avec haltère au-dessus de la tête (Bras)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Extension triceps avec haltère au-dessus de la tête', 'Bras', 'Haltères', 'Haltère tenu à deux mains derrière la nuque, coudes pointés vers le haut. Déplier les avant-bras vers le ciel. Étire et recrute la longue portion du triceps.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Extension triceps avec haltère au-dessus de la tête';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'triceps', 1)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Kickback triceps avec haltère (Bras)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Kickback triceps avec haltère', 'Bras', 'Haltères', 'Buste penché, coude collé au flanc et relevé. Tendre le bras vers l’arrière en contractant fermement le triceps en fin de course.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Kickback triceps avec haltère';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'triceps', 1)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Planche classique (Gainage ventral) (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Planche classique (Gainage ventral)', 'Abdominaux', 'Poids du corps', 'En appui sur les avant-bras et les orteils. Légère rétroversion du bassin, abdos et fessiers serrés, nuque longue. Ne pas laisser creuser les lombaires.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Planche classique (Gainage ventral)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'abdominaux', 1),
      (exo_id, 'obliques', 0.5),
      (exo_id, 'lombaires', 0.25),
      (exo_id, 'delto_ant', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Gainage oblique (Planche latérale) (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Gainage oblique (Planche latérale)', 'Abdominaux', 'Poids du corps', 'En appui sur un avant-bras et le bord externe du pied, corps aligné de profil. Pousser la hanche vers le haut pour solliciter l’oblique inférieur.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Gainage oblique (Planche latérale)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'obliques', 1),
      (exo_id, 'abdominaux', 0.5),
      (exo_id, 'fessiers', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Dead bug (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Dead bug', 'Abdominaux', 'Poids du corps', 'Sur le dos, genoux à 90°, bras vers le plafond. Tendre simultanément le bras droit et la jambe gauche sans que le bas du dos ne décolle du tapis. Contrôle pelvien fondamental.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Dead bug';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'abdominaux', 1),
      (exo_id, 'obliques', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Bird dog (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Bird dog', 'Abdominaux', 'Poids du corps', 'À quatre pattes, tendre simultanément le bras opposé et la jambe opposée dans l’alignement du tronc. Bassin stable, aucun affaissement du dos.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Bird dog';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'lombaires', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'abdominaux', 0.5),
      (exo_id, 'haut_dos', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Hollow body hold (Gainage cuillère) (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Hollow body hold (Gainage cuillère)', 'Abdominaux', 'Poids du corps', 'Sur le dos, plaquer les lombaires au sol, bras et jambes tendus décollés de quelques centimètres. Forme de cuillère, engagement abdominal maximal.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Hollow body hold (Gainage cuillère)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'abdominaux', 1),
      (exo_id, 'obliques', 0.5),
      (exo_id, 'quadriceps', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Mountain climbers (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Mountain climbers', 'Abdominaux', 'Poids du corps', 'En position de pompe, ramener alternativement les genoux vers la poitrine à un rythme soutenu tout en gardant le bassin bas et stable.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Mountain climbers';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'abdominaux', 1),
      (exo_id, 'quadriceps', 0.5),
      (exo_id, 'delto_ant', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Relevé de bassin (Crunch inversé) (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Relevé de bassin (Crunch inversé)', 'Abdominaux', 'Poids du corps', 'Allongé sur le dos, genoux pliés. Enrouler le bassin pour décoller les fesses du sol en direction des côtes, sans prendre d’élan avec les jambes.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Relevé de bassin (Crunch inversé)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'abdominaux', 1)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Russian twist (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Russian twist', 'Abdominaux', 'Poids du corps', 'Assis en équilibre fessier, buste incliné en arrière, pieds décollés ou posés. Tourner les épaules et les mains d’un côté puis de l’autre en contrôlant.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Russian twist';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'obliques', 1),
      (exo_id, 'abdominaux', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Pallof press à l’élastique (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Pallof press à l’élastique', 'Abdominaux', 'Élastique', 'De profil par rapport au point d’ancrage de l’élastique, mains contre le sternum. Tendre les bras devant soi en résistant fermement à la rotation. Anti-rotation reine pour protéger le rachis.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Pallof press à l’élastique';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'obliques', 1),
      (exo_id, 'abdominaux', 1)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Planche sur Swiss ball (Abdominaux)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Planche sur Swiss ball', 'Abdominaux', 'Swiss ball', 'Avant-bras sur le swiss ball, pieds au sol. L’instabilité du ballon démultiplie le recrutement des stabilisateurs profonds (transverse).')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Planche sur Swiss ball';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'abdominaux', 1),
      (exo_id, 'obliques', 0.5),
      (exo_id, 'delto_ant', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Burpees (Cardio)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Burpees', 'Cardio', 'Poids du corps', 'Depuis la station debout, poser les mains au sol, projeter les pieds en arrière en planche (avec ou sans pompe), ramener les pieds et sauter bras en l’air.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Burpees';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 0.5),
      (exo_id, 'pectoraux', 0.5),
      (exo_id, 'fessiers', 0.5),
      (exo_id, 'delto_ant', 0.5),
      (exo_id, 'abdominaux', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Jumping jacks (Cardio)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Jumping jacks', 'Cardio', 'Poids du corps', 'Sauts avec ouverture et fermeture simultanées des bras et des jambes. Excellent pour l’échauffement cardiovasculaire et la coordination.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Jumping jacks';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'mollets', 0.5),
      (exo_id, 'delto_lat', 0.25),
      (exo_id, 'adducteurs', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Corde à sauter (Cardio)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Corde à sauter', 'Cardio', 'Corde à sauter', 'Sauts légers sur la pointe des pieds, rotation initiée par les poignets et non les épaules. Rythme régulier pour l’endurance et les mollets.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Corde à sauter';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'mollets', 0.5),
      (exo_id, 'quadriceps', 0.25),
      (exo_id, 'avant_bras', 0.25)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Montées de genoux (Cardio)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Montées de genoux', 'Cardio', 'Poids du corps', 'Course sur place en montant les genoux au niveau des hanches à cadence élevée. Buste droit et travail actif des bras.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Montées de genoux';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 0.5),
      (exo_id, 'abdominaux', 0.5),
      (exo_id, 'mollets', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Skater jumps (Sauts du patineur) (Cardio)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Skater jumps (Sauts du patineur)', 'Cardio', 'Poids du corps', 'Sauts latéraux d’un pied sur l’autre en fléchissant le genou de réception et en passant l’autre jambe derrière. Agilité, fessiers et cardio.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Skater jumps (Sauts du patineur)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'fessiers', 0.5),
      (exo_id, 'quadriceps', 0.5),
      (exo_id, 'adducteurs', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- Thruster (Squat développé) (Corps entier)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Thruster (Squat développé)', 'Corps entier', 'Haltères', 'Enchaîner un squat complet et profiter de la poussée des jambes pour développer les haltères au-dessus de la tête. L’exercice complet par excellence.')
  ON CONFLICT (nom) DO NOTHING;

  SELECT id INTO exo_id FROM public.bibliotheque_exercices WHERE nom = 'Thruster (Squat développé)';
  IF exo_id IS NOT NULL THEN
    INSERT INTO public.exercice_muscles (exercice_id, muscle, coefficient) VALUES
      (exo_id, 'quadriceps', 1),
      (exo_id, 'delto_ant', 1),
      (exo_id, 'fessiers', 1),
      (exo_id, 'triceps', 0.5),
      (exo_id, 'abdominaux', 0.5)
    ON CONFLICT (exercice_id, muscle) DO NOTHING;
  END IF;

  -- World’s Greatest Stretch (Mobilité)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('World’s Greatest Stretch', 'Mobilité', 'Poids du corps', 'Depuis une grande fente avant, poser les mains au sol à l’intérieur du pied avant, amener le coude vers la cheville puis pivoter le bras vers le ciel en ouvrant la cage thoracique.')
  ON CONFLICT (nom) DO NOTHING;

  -- Cat-Cow (Chat-Vache) (Mobilité)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Cat-Cow (Chat-Vache)', 'Mobilité', 'Poids du corps', 'À quatre pattes, alterner dos rond (expiration, tête rentrée) et dos creux (inspiration, regard vers l’avant, ouverture pectorale). Mobilise tout le rachis.')
  ON CONFLICT (nom) DO NOTHING;

  -- Étirement du psoas en fente basse (Mobilité)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Étirement du psoas en fente basse', 'Mobilité', 'Poids du corps', 'Un genou au sol, l’autre jambe en avant à 90°. Avancer doucement le bassin vers l’avant avec une légère rétroversion pour étirer les fléchisseurs de la hanche.')
  ON CONFLICT (nom) DO NOTHING;

  -- Ouverture thoracique au sol (Open Book) (Mobilité)
  INSERT INTO public.bibliotheque_exercices (nom, groupe, materiel, notes)
  VALUES ('Ouverture thoracique au sol (Open Book)', 'Mobilité', 'Poids du corps', 'Allongé sur le côté, genoux repliés à 90°. Ouvrir le bras supérieur en arc de cercle pour poser l’épaule opposée vers le sol, en suivant la main du regard.')
  ON CONFLICT (nom) DO NOTHING;

END $$;

-- Actualisation du cache de schéma Supabase
NOTIFY pgrst, 'reload schema';

import { supabase } from './supabase'
import { normaliser } from './SelecteurExercice'

export type ExerciceCatalogue = {
  nom: string
  groupe: string
  materiel: string
  notes: string
  video_url?: string
  muscles: { muscle: string; coefficient: number }[]
}

export const CATALOGUE_EXERCICES: ExerciceCatalogue[] = [
  // ==========================================
  // EXERCICES DEMANDÉS EN PRIORITÉ
  // ==========================================
  {
    nom: 'Course à pieds',
    groupe: 'Cardio',
    materiel: 'Poids du corps',
    notes: 'Course en extérieur ou sur tapis. Travail continu en endurance fondamentale ou en intervalles (fractionné). Veiller au buste droit, regard vers l’horizon et pose d’appui dynamique médio-pied.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 0.5 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'mollets', coefficient: 0.5 },
      { muscle: 'fessiers', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Gainage inversé',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'Au sol, en appui sur les paumes (doigts vers les talons) et sur les talons. Pousser le bassin vers le haut pour aligner chevilles, hanches et épaules. Engager puissamment les fessiers, les ischios et la sangle abdominale. Ouvrir la cage thoracique sans casser la nuque.',
    muscles: [
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'ischios', coefficient: 1 },
      { muscle: 'lombaires', coefficient: 1 },
      { muscle: 'abdominaux', coefficient: 0.5 },
      { muscle: 'haut_dos', coefficient: 0.5 },
      { muscle: 'delto_post', coefficient: 0.5 },
      { muscle: 'triceps', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Pistol squats',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Squat complet sur une seule jambe, l’autre jambe tendue horizontalement vers l’avant sans toucher le sol. Descendre hanche sous le genou en gardant le talon bien ancré. Progression possible avec sangle de suspension ou assis sur un banc.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'adducteurs', coefficient: 0.5 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'mollets', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Squats unipodale',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Flexion sur une jambe d’appui, genou aligné avec la pointe du pied. La jambe opposée reste fléchie vers l’arrière ou suspendue. Développe la stabilité du genou, l’équilibre de hanche et la force unilatérale. Plus accessible que le pistol squat.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'adducteurs', coefficient: 0.5 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'mollets', coefficient: 0.5 },
    ],
  },

  // ==========================================
  // JAMBES & FESSIERS (DOMINANTE GENOU & HANCHE)
  // ==========================================
  {
    nom: 'Squats',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Pieds largeur d’épaules, pointes légèrement ouvertes. Descendre hanches en arrière et genoux dans l’axe des orteils, dos droit, talons ancrés au sol.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'adducteurs', coefficient: 0.5 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'lombaires', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Goblet squat',
    groupe: 'Jambes',
    materiel: 'Kettlebell',
    notes: 'Tenir un kettlebell ou haltère contre la poitrine, coudes serrés. La charge antérieure aide naturellement à conserver le buste vertical et engage les abdos.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'abdominaux', coefficient: 0.5 },
      { muscle: 'adducteurs', coefficient: 0.5 },
      { muscle: 'ischios', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Squats sautés',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Squat suivi d’une extension explosive vers le haut. Amortir impérativement la réception sur l’avant-pied puis dérouler sur les talons en squat complet.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'mollets', coefficient: 0.5 },
      { muscle: 'ischios', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Fentes avant',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Grand pas en avant, descendre jusqu’à frôler le sol avec le genou arrière (angles à 90°). Pousser fort dans le talon avant pour revenir au point de départ.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'mollets', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Fentes arrière',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Pas en arrière, plus doux pour l’articulation du genou que la fente avant. Idéal pour les clients ayant des sensibilités articulaires rotuliennes.',
    muscles: [
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'adducteurs', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Fentes bulgares',
    groupe: 'Jambes',
    materiel: 'Chaise / banc',
    notes: 'Pied arrière surélevé sur banc ou chaise. Descendre le genou arrière vers le bas, buste légèrement incliné pour cibler le grand fessier. Très efficace sans lourdes charges.',
    muscles: [
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'adducteurs', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Fentes marchées',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Enchaîner les fentes en continu en avançant. Excellent pour le gainage dynamique, la proprioception et le rythme cardio en séance à domicile.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'mollets', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Step-up (Montée sur banc)',
    groupe: 'Jambes',
    materiel: 'Chaise / banc',
    notes: 'Poser le pied entièrement sur le banc/chaise, monter en poussant sur le talon sans rebondir sur la jambe arrière. Contrôler la descente lente.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'mollets', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Chaise dos au mur',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Dos plaqué contre le mur, cuisses horizontales à 90°, genoux au-dessus des chevilles. Maintenir la position isométrique sans poser les mains sur les cuisses.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Pont fessier (Glute bridge)',
    groupe: 'Fessiers',
    materiel: 'Poids du corps',
    notes: 'Allongé sur le dos, pieds à plat près des fessiers. Lever le bassin en serrant les fessiers au sommet, aligner genoux, hanches et épaules sans cambrer le bas du dos.',
    muscles: [
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'lombaires', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Pont fessier unilatéral (1 jambe)',
    groupe: 'Fessiers',
    materiel: 'Poids du corps',
    notes: 'Une jambe levée ou croisée, lever le bassin avec l’autre jambe. Corrige les asymétries gauche/droite et intensifie le travail fessier au poids du corps.',
    muscles: [
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'lombaires', coefficient: 0.25 },
      { muscle: 'obliques', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Hip thrust sur banc',
    groupe: 'Fessiers',
    materiel: 'Chaise / banc',
    notes: 'Haut du dos calé contre le bord du banc/chaise, pieds au sol largeur d’épaules. Extension complète de hanche avec maintien 1 sec en haut. Charge possible avec haltère sur le bassin.',
    muscles: [
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'ischios', coefficient: 0.5 },
      { muscle: 'quadriceps', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Soulevé de terre roumain avec haltères (RDL)',
    groupe: 'Fessiers',
    materiel: 'Haltères',
    notes: 'Genoux légèrement déverrouillés, reculer les hanches en gardant le dos plat et les haltères collés aux cuisses. Sentir l’étirement puissant des ischios.',
    muscles: [
      { muscle: 'ischios', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'lombaires', coefficient: 0.5 },
      { muscle: 'haut_dos', coefficient: 0.25 },
      { muscle: 'avant_bras', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Kettlebell swing',
    groupe: 'Corps entier',
    materiel: 'Kettlebell',
    notes: 'Mouvement de charnière de hanche explosive, pas un squat. Pousser les fesses en arrière puis projeter les hanches en avant en contractant fessiers et abdos. Bras détendus.',
    muscles: [
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'ischios', coefficient: 1 },
      { muscle: 'lombaires', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.5 },
      { muscle: 'delto_ant', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Monster walk avec élastique',
    groupe: 'Fessiers',
    materiel: 'Élastique',
    notes: 'Mini-band placé au-dessus des genoux ou aux chevilles. En demi-squat, petits pas chassés latéraux en maintenant une tension constante. Travail clé du moyen fessier.',
    muscles: [
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'adducteurs', coefficient: 0.5 },
      { muscle: 'quadriceps', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Mollets debout (élévations)',
    groupe: 'Jambes',
    materiel: 'Poids du corps',
    notes: 'Debout au sol ou sur une marche. Monter au maximum sur la pointe des pieds, marquer 1 sec d’arrêt au sommet puis redescendre lentement pour étirer le mollet.',
    muscles: [
      { muscle: 'mollets', coefficient: 1 },
    ],
  },

  // ==========================================
  // PECTORAUX & POUSSÉE HORIZONTALE
  // ==========================================
  {
    nom: 'Pompes',
    groupe: 'Pectoraux',
    materiel: 'Poids du corps',
    notes: 'Corps gainé en planche, mains légèrement plus larges que les épaules, coudes à ~45° du corps. Descendre la poitrine jusqu’à 2 cm du sol sans creuser le bas du dos.',
    muscles: [
      { muscle: 'pectoraux', coefficient: 1 },
      { muscle: 'triceps', coefficient: 0.5 },
      { muscle: 'delto_ant', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Pompes surélevées (mains sur banc/chaise)',
    groupe: 'Pectoraux',
    materiel: 'Chaise / banc',
    notes: 'Mains sur un banc, une chaise ou une table. Réduit la charge corporelle, parfait pour débuter ou pour accumuler du volume avec une technique impeccable.',
    muscles: [
      { muscle: 'pectoraux', coefficient: 1 },
      { muscle: 'triceps', coefficient: 0.5 },
      { muscle: 'delto_ant', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Pompes déclinées (pieds surélevés)',
    groupe: 'Pectoraux',
    materiel: 'Chaise / banc',
    notes: 'Pieds posés sur un banc ou une chaise, mains au sol. Cible la partie haute (claviculaire) des pectoraux et augmente l’engagement des épaules.',
    muscles: [
      { muscle: 'pectoraux', coefficient: 1 },
      { muscle: 'delto_ant', coefficient: 0.5 },
      { muscle: 'triceps', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Pompes diamant',
    groupe: 'Pectoraux',
    materiel: 'Poids du corps',
    notes: 'Mains rapprochées sous la poitrine formant un losange entre pouces et index. Accentue fortement le travail des triceps et de l’intérieur des pectoraux.',
    muscles: [
      { muscle: 'triceps', coefficient: 1 },
      { muscle: 'pectoraux', coefficient: 1 },
      { muscle: 'delto_ant', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Développé couché avec haltères',
    groupe: 'Pectoraux',
    materiel: 'Haltères',
    notes: 'Sur banc ou au sol (floor press). Développer les haltères au-dessus de la poitrine en contrôlant la trajectoire, sans claquer les haltères entre eux.',
    muscles: [
      { muscle: 'pectoraux', coefficient: 1 },
      { muscle: 'triceps', coefficient: 0.5 },
      { muscle: 'delto_ant', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Écarté avec haltères au sol (Floor fly)',
    groupe: 'Pectoraux',
    materiel: 'Haltères',
    notes: 'Allongé sur le dos au sol, bras légèrement fléchis, ouvrir latéralement jusqu’à ce que les coudes effleurent le sol. Sécurise les épaules grâce au sol.',
    muscles: [
      { muscle: 'pectoraux', coefficient: 1 },
      { muscle: 'delto_ant', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Dips sur banc / chaise',
    groupe: 'Bras',
    materiel: 'Chaise / banc',
    notes: 'Mains sur le bord du banc, doigts vers l’avant. Descendre le dos près du banc jusqu’à 90° aux coudes, puis remonter par poussée des bras.',
    muscles: [
      { muscle: 'triceps', coefficient: 1 },
      { muscle: 'pectoraux', coefficient: 0.5 },
      { muscle: 'delto_ant', coefficient: 0.5 },
    ],
  },

  // ==========================================
  // DOS & TIRAGE (POSTURE & SANTE DU DOS)
  // ==========================================
  {
    nom: 'Rowing unilatéral avec haltère (bûcheron)',
    groupe: 'Dos',
    materiel: 'Haltères',
    notes: 'Un genou et une main en appui sur une chaise ou un banc, buste à l’horizontale. Tirer le coude vers la hanche en resserrant l’omoplate, sans pivoter le buste.',
    muscles: [
      { muscle: 'grand_dorsal', coefficient: 1 },
      { muscle: 'haut_dos', coefficient: 0.5 },
      { muscle: 'biceps', coefficient: 0.5 },
      { muscle: 'delto_post', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Rowing bilatéral avec haltères (buste penché)',
    groupe: 'Dos',
    materiel: 'Haltères',
    notes: 'Buste incliné à 45-60°, dos bien droit gainé. Tirer les deux haltères vers le bas des côtes en guidant avec les coudes et en serrant les omoplates.',
    muscles: [
      { muscle: 'haut_dos', coefficient: 1 },
      { muscle: 'grand_dorsal', coefficient: 1 },
      { muscle: 'delto_post', coefficient: 0.5 },
      { muscle: 'biceps', coefficient: 0.5 },
      { muscle: 'lombaires', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Rowing aux sangles de suspension (TRX Row)',
    groupe: 'Dos',
    materiel: 'Sangles de suspension',
    notes: 'Face au point d’ancrage, corps gainé incliné en arrière. Tirer la poitrine vers les poignées en gardant les coudes près du corps. Ajuster la difficulté par l’angle des pieds.',
    muscles: [
      { muscle: 'haut_dos', coefficient: 1 },
      { muscle: 'grand_dorsal', coefficient: 1 },
      { muscle: 'biceps', coefficient: 0.5 },
      { muscle: 'delto_post', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Tirage horizontal à l’élastique',
    groupe: 'Dos',
    materiel: 'Élastique',
    notes: 'Élastique fixé à mi-hauteur (poignée de porte, pied de table). Assis ou debout genoux fléchis, tirer les coudes en arrière en resserrant les omoplates.',
    muscles: [
      { muscle: 'haut_dos', coefficient: 1 },
      { muscle: 'grand_dorsal', coefficient: 1 },
      { muscle: 'biceps', coefficient: 0.5 },
      { muscle: 'delto_post', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Tirage vertical à l’élastique (Lat pulldown)',
    groupe: 'Dos',
    materiel: 'Élastique',
    notes: 'Élastique fixé en haut d’une porte (avec ancrage de porte). À genoux ou assis, tirer la bande vers le haut de la poitrine en ouvrant les coudes.',
    muscles: [
      { muscle: 'grand_dorsal', coefficient: 1 },
      { muscle: 'haut_dos', coefficient: 0.5 },
      { muscle: 'biceps', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Traction (Pull-up / Chin-up)',
    groupe: 'Dos',
    materiel: 'Barre de traction',
    notes: 'Prise pronation ou supination. Partir bras tendus, monter jusqu’à passer le menton au-dessus de la barre en tirant les coudes vers le bas. S’aider d’un élastique si besoin.',
    muscles: [
      { muscle: 'grand_dorsal', coefficient: 1 },
      { muscle: 'biceps', coefficient: 0.5 },
      { muscle: 'haut_dos', coefficient: 0.5 },
      { muscle: 'avant_bras', coefficient: 0.25 },
      { muscle: 'abdominaux', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Face pull à l’élastique',
    groupe: 'Dos',
    materiel: 'Élastique',
    notes: 'Élastique à hauteur des yeux. Tirer vers le nez/yeux en ouvrant les mains et coudes hauts (rotation externe). Essentiel pour la posture et la santé des épaules.',
    muscles: [
      { muscle: 'delto_post', coefficient: 1 },
      { muscle: 'haut_dos', coefficient: 1 },
      { muscle: 'delto_lat', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Oiseau avec haltères (Reverse Fly)',
    groupe: 'Dos',
    materiel: 'Haltères',
    notes: 'Buste penché en avant, bras légèrement fléchis. Écarter les bras vers le haut en pinçant les omoplates. Renforce la chaîne scapulaire et les deltoïdes postérieurs.',
    muscles: [
      { muscle: 'delto_post', coefficient: 1 },
      { muscle: 'haut_dos', coefficient: 1 },
    ],
  },
  {
    nom: 'Gainage Superman (Extension lombaire)',
    groupe: 'Dos',
    materiel: 'Poids du corps',
    notes: 'Allongé sur le ventre, décoller simultanément les bras tendus et les cuisses du sol en serrant fessiers et lombaires. Maintenir 2-3 sec puis relâcher.',
    muscles: [
      { muscle: 'lombaires', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 0.5 },
      { muscle: 'haut_dos', coefficient: 0.5 },
      { muscle: 'ischios', coefficient: 0.25 },
    ],
  },

  // ==========================================
  // ÉPAULES (DELTOÏDES)
  // ==========================================
  {
    nom: 'Développé militaire avec haltères',
    groupe: 'Épaules',
    materiel: 'Haltères',
    notes: 'Debout ou assis le dos droit. Pousser les haltères à la verticale au-dessus de la tête sans cambrer le bas du dos. Verrouiller les abdos.',
    muscles: [
      { muscle: 'delto_ant', coefficient: 1 },
      { muscle: 'delto_lat', coefficient: 0.5 },
      { muscle: 'triceps', coefficient: 0.5 },
      { muscle: 'haut_dos', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Élévations latérales avec haltères',
    groupe: 'Épaules',
    materiel: 'Haltères',
    notes: 'Bras légèrement fléchis, monter les coudes sur les côtés jusqu’à hauteur des épaules. Contrôler la descente sans élan.',
    muscles: [
      { muscle: 'delto_lat', coefficient: 1 },
      { muscle: 'haut_dos', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Élévations latérales à l’élastique',
    groupe: 'Épaules',
    materiel: 'Élastique',
    notes: 'Pied sur le milieu de la bande élastique, monter les bras sur les côtés. La tension croissante au sommet stimule idéalement le deltoïde latéral.',
    muscles: [
      { muscle: 'delto_lat', coefficient: 1 },
    ],
  },
  {
    nom: 'Pike push-ups (Pompes piquées)',
    groupe: 'Épaules',
    materiel: 'Poids du corps',
    notes: 'Position en V inversé (fesses hautes vers le ciel). Fléchir les bras pour amener le sommet de la tête vers le sol, puis repousser fort. Poussée verticale sans matériel.',
    muscles: [
      { muscle: 'delto_ant', coefficient: 1 },
      { muscle: 'triceps', coefficient: 0.5 },
      { muscle: 'haut_dos', coefficient: 0.25 },
    ],
  },

  // ==========================================
  // BRAS (BICEPS & TRICEPS)
  // ==========================================
  {
    nom: 'Curl biceps avec haltères',
    groupe: 'Bras',
    materiel: 'Haltères',
    notes: 'Coudes collés aux côtes. Fléchir les avant-bras avec supination (paumes vers le haut) sans bouger les coudes ni balancer le buste.',
    muscles: [
      { muscle: 'biceps', coefficient: 1 },
      { muscle: 'avant_bras', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Curl biceps à l’élastique',
    groupe: 'Bras',
    materiel: 'Élastique',
    notes: 'Pieds ancrés sur l’élastique, fléchir les avant-bras vers les épaules. Tension continue sur toute la course du mouvement.',
    muscles: [
      { muscle: 'biceps', coefficient: 1 },
      { muscle: 'avant_bras', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Curl marteau avec haltères',
    groupe: 'Bras',
    materiel: 'Haltères',
    notes: 'Prise neutre (paumes face à face). Cible le brachial antérieur et le brachio-radial, idéal pour l’épaisseur du bras et la force de préhension.',
    muscles: [
      { muscle: 'biceps', coefficient: 1 },
      { muscle: 'avant_bras', coefficient: 1 },
    ],
  },
  {
    nom: 'Extension triceps avec haltère au-dessus de la tête',
    groupe: 'Bras',
    materiel: 'Haltères',
    notes: 'Haltère tenu à deux mains derrière la nuque, coudes pointés vers le haut. Déplier les avant-bras vers le ciel. Étire et recrute la longue portion du triceps.',
    muscles: [
      { muscle: 'triceps', coefficient: 1 },
    ],
  },
  {
    nom: 'Kickback triceps avec haltère',
    groupe: 'Bras',
    materiel: 'Haltères',
    notes: 'Buste penché, coude collé au flanc et relevé. Tendre le bras vers l’arrière en contractant fermement le triceps en fin de course.',
    muscles: [
      { muscle: 'triceps', coefficient: 1 },
    ],
  },

  // ==========================================
  // ABDOMINAUX & GAINAGE
  // ==========================================
  {
    nom: 'Planche classique (Gainage ventral)',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'En appui sur les avant-bras et les orteils. Légère rétroversion du bassin, abdos et fessiers serrés, nuque longue. Ne pas laisser creuser les lombaires.',
    muscles: [
      { muscle: 'abdominaux', coefficient: 1 },
      { muscle: 'obliques', coefficient: 0.5 },
      { muscle: 'lombaires', coefficient: 0.25 },
      { muscle: 'delto_ant', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Gainage oblique (Planche latérale)',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'En appui sur un avant-bras et le bord externe du pied, corps aligné de profil. Pousser la hanche vers le haut pour solliciter l’oblique inférieur.',
    muscles: [
      { muscle: 'obliques', coefficient: 1 },
      { muscle: 'abdominaux', coefficient: 0.5 },
      { muscle: 'fessiers', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Dead bug',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'Sur le dos, genoux à 90°, bras vers le plafond. Tendre simultanément le bras droit et la jambe gauche sans que le bas du dos ne décolle du tapis. Contrôle pelvien fondamental.',
    muscles: [
      { muscle: 'abdominaux', coefficient: 1 },
      { muscle: 'obliques', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Bird dog',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'À quatre pattes, tendre simultanément le bras opposé et la jambe opposée dans l’alignement du tronc. Bassin stable, aucun affaissement du dos.',
    muscles: [
      { muscle: 'lombaires', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'abdominaux', coefficient: 0.5 },
      { muscle: 'haut_dos', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Hollow body hold (Gainage cuillère)',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'Sur le dos, plaquer les lombaires au sol, bras et jambes tendus décollés de quelques centimètres. Forme de cuillère, engagement abdominal maximal.',
    muscles: [
      { muscle: 'abdominaux', coefficient: 1 },
      { muscle: 'obliques', coefficient: 0.5 },
      { muscle: 'quadriceps', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Mountain climbers',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'En position de pompe, ramener alternativement les genoux vers la poitrine à un rythme soutenu tout en gardant le bassin bas et stable.',
    muscles: [
      { muscle: 'abdominaux', coefficient: 1 },
      { muscle: 'quadriceps', coefficient: 0.5 },
      { muscle: 'delto_ant', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Relevé de bassin (Crunch inversé)',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'Allongé sur le dos, genoux pliés. Enrouler le bassin pour décoller les fesses du sol en direction des côtes, sans prendre d’élan avec les jambes.',
    muscles: [
      { muscle: 'abdominaux', coefficient: 1 },
    ],
  },
  {
    nom: 'Russian twist',
    groupe: 'Abdominaux',
    materiel: 'Poids du corps',
    notes: 'Assis en équilibre fessier, buste incliné en arrière, pieds décollés ou posés. Tourner les épaules et les mains d’un côté puis de l’autre en contrôlant.',
    muscles: [
      { muscle: 'obliques', coefficient: 1 },
      { muscle: 'abdominaux', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Pallof press à l’élastique',
    groupe: 'Abdominaux',
    materiel: 'Élastique',
    notes: 'De profil par rapport au point d’ancrage de l’élastique, mains contre le sternum. Tendre les bras devant soi en résistant fermement à la rotation. Anti-rotation reine pour protéger le rachis.',
    muscles: [
      { muscle: 'obliques', coefficient: 1 },
      { muscle: 'abdominaux', coefficient: 1 },
    ],
  },
  {
    nom: 'Planche sur Swiss ball',
    groupe: 'Abdominaux',
    materiel: 'Swiss ball',
    notes: 'Avant-bras sur le swiss ball, pieds au sol. L’instabilité du ballon démultiplie le recrutement des stabilisateurs profonds (transverse).',
    muscles: [
      { muscle: 'abdominaux', coefficient: 1 },
      { muscle: 'obliques', coefficient: 0.5 },
      { muscle: 'delto_ant', coefficient: 0.25 },
    ],
  },

  // ==========================================
  // CARDIO & MÉTABOLIQUE
  // ==========================================
  {
    nom: 'Burpees',
    groupe: 'Cardio',
    materiel: 'Poids du corps',
    notes: 'Depuis la station debout, poser les mains au sol, projeter les pieds en arrière en planche (avec ou sans pompe), ramener les pieds et sauter bras en l’air.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 0.5 },
      { muscle: 'pectoraux', coefficient: 0.5 },
      { muscle: 'fessiers', coefficient: 0.5 },
      { muscle: 'delto_ant', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Jumping jacks',
    groupe: 'Cardio',
    materiel: 'Poids du corps',
    notes: 'Sauts avec ouverture et fermeture simultanées des bras et des jambes. Excellent pour l’échauffement cardiovasculaire et la coordination.',
    muscles: [
      { muscle: 'mollets', coefficient: 0.5 },
      { muscle: 'delto_lat', coefficient: 0.25 },
      { muscle: 'adducteurs', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Corde à sauter',
    groupe: 'Cardio',
    materiel: 'Corde à sauter',
    notes: 'Sauts légers sur la pointe des pieds, rotation initiée par les poignets et non les épaules. Rythme régulier pour l’endurance et les mollets.',
    muscles: [
      { muscle: 'mollets', coefficient: 0.5 },
      { muscle: 'quadriceps', coefficient: 0.25 },
      { muscle: 'avant_bras', coefficient: 0.25 },
    ],
  },
  {
    nom: 'Montées de genoux',
    groupe: 'Cardio',
    materiel: 'Poids du corps',
    notes: 'Course sur place en montant les genoux au niveau des hanches à cadence élevée. Buste droit et travail actif des bras.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.5 },
      { muscle: 'mollets', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Skater jumps (Sauts du patineur)',
    groupe: 'Cardio',
    materiel: 'Poids du corps',
    notes: 'Sauts latéraux d’un pied sur l’autre en fléchissant le genou de réception et en passant l’autre jambe derrière. Agilité, fessiers et cardio.',
    muscles: [
      { muscle: 'fessiers', coefficient: 0.5 },
      { muscle: 'quadriceps', coefficient: 0.5 },
      { muscle: 'adducteurs', coefficient: 0.5 },
    ],
  },
  {
    nom: 'Thruster (Squat développé)',
    groupe: 'Corps entier',
    materiel: 'Haltères',
    notes: 'Enchaîner un squat complet et profiter de la poussée des jambes pour développer les haltères au-dessus de la tête. L’exercice complet par excellence.',
    muscles: [
      { muscle: 'quadriceps', coefficient: 1 },
      { muscle: 'delto_ant', coefficient: 1 },
      { muscle: 'fessiers', coefficient: 1 },
      { muscle: 'triceps', coefficient: 0.5 },
      { muscle: 'abdominaux', coefficient: 0.5 },
    ],
  },

  // ==========================================
  // MOBILITÉ & SANTÉ ARTICULAIRE
  // ==========================================
  {
    nom: 'World’s Greatest Stretch',
    groupe: 'Mobilité',
    materiel: 'Poids du corps',
    notes: 'Depuis une grande fente avant, poser les mains au sol à l’intérieur du pied avant, amener le coude vers la cheville puis pivoter le bras vers le ciel en ouvrant la cage thoracique.',
    muscles: [],
  },
  {
    nom: 'Cat-Cow (Chat-Vache)',
    groupe: 'Mobilité',
    materiel: 'Poids du corps',
    notes: 'À quatre pattes, alterner dos rond (expiration, tête rentrée) et dos creux (inspiration, regard vers l’avant, ouverture pectorale). Mobilise tout le rachis.',
    muscles: [],
  },
  {
    nom: 'Étirement du psoas en fente basse',
    groupe: 'Mobilité',
    materiel: 'Poids du corps',
    notes: 'Un genou au sol, l’autre jambe en avant à 90°. Avancer doucement le bassin vers l’avant avec une légère rétroversion pour étirer les fléchisseurs de la hanche.',
    muscles: [],
  },
  {
    nom: 'Ouverture thoracique au sol (Open Book)',
    groupe: 'Mobilité',
    materiel: 'Poids du corps',
    notes: 'Allongé sur le côté, genoux repliés à 90°. Ouvrir le bras supérieur en arc de cercle pour poser l’épaule opposée vers le sol, en suivant la main du regard.',
    muscles: [],
  },
]

/**
 * Filtre les exercices du catalogue qui ne sont pas encore présents dans la bibliothèque.
 */
export function exosManquantsDuCatalogue(existants: { nom: string }[]): ExerciceCatalogue[] {
  const nomsExistants = new Set(existants.map(e => normaliser(e.nom)))
  return CATALOGUE_EXERCICES.filter(e => !nomsExistants.has(normaliser(e.nom)))
}

/**
 * Insère dans Supabase une liste d'exercices du catalogue et leurs muscles associés.
 * Ne modifie pas les exercices existants.
 */
export async function importerExercicesCatalogue(
  exercicesAImporter: ExerciceCatalogue[],
): Promise<{ ajoutes: number; erreur?: string }> {
  if (!exercicesAImporter.length) return { ajoutes: 0 }

  // 1. Insertion des exercices par lots dans bibliotheque_exercices
  let ajoutesTotal = 0
  const tailleLot = 50

  for (let i = 0; i < exercicesAImporter.length; i += tailleLot) {
    const lot = exercicesAImporter.slice(i, i + tailleLot)
    const lignes = lot.map(e => ({
      nom: e.nom.trim(),
      groupe: e.groupe,
      materiel: e.materiel,
      notes: e.notes || null,
      video_url: e.video_url || null,
    }))

    const { data: crees, error: errInsert } = await supabase
      .from('bibliotheque_exercices')
      .insert(lignes)
      .select('id, nom')

    if (errInsert) {
      return { ajoutes: ajoutesTotal, erreur: errInsert.message }
    }

    ajoutesTotal += (crees ?? []).length

    // 2. Insertion des muscles associés
    if (crees && crees.length > 0) {
      const idParNom = new Map(crees.map(c => [normaliser(c.nom), c.id as string]))
      const musclesAInserer: { exercice_id: string; muscle: string; coefficient: number }[] = []

      for (const exo of lot) {
        const id = idParNom.get(normaliser(exo.nom))
        if (id && exo.muscles.length > 0) {
          for (const m of exo.muscles) {
            musclesAInserer.push({
              exercice_id: id,
              muscle: m.muscle,
              coefficient: m.coefficient,
            })
          }
        }
      }

      if (musclesAInserer.length > 0) {
        const { error: errMuscles } = await supabase
          .from('exercice_muscles')
          .upsert(musclesAInserer, { onConflict: 'exercice_id,muscle' })
        if (errMuscles) {
          return { ajoutes: ajoutesTotal, erreur: errMuscles.message }
        }
      }
    }
  }

  return { ajoutes: ajoutesTotal }
}

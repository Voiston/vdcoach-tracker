// Mesures corporelles
export const TYPES: Record<string, { label: string; unite: string }> = {
  poids: { label: 'Poids', unite: 'kg' },
  tour_taille: { label: 'Tour de taille', unite: 'cm' },
  tour_hanches: { label: 'Tour de hanches', unite: 'cm' },
  tour_bras: { label: 'Tour de bras', unite: 'cm' },
  tour_cuisse: { label: 'Tour de cuisse', unite: 'cm' },
  masse_grasse: { label: 'Masse grasse', unite: '%' },
}

// Tests physiques (stockés dans la table « mesures », avec un type commençant par « test_ »).
// sens : 'hausse' = plus c'est haut, mieux c'est ; 'baisse' = plus c'est bas, mieux c'est.
export const TESTS: Record<string, { label: string; unite: string; sens: 'hausse' | 'baisse' }> = {
  test_pompes: { label: 'Pompes max', unite: 'reps', sens: 'hausse' },
  test_gainage: { label: 'Gainage planche', unite: 's', sens: 'hausse' },
  test_squats_1min: { label: 'Squats en 1 minute', unite: 'reps', sens: 'hausse' },
  test_abdos_1min: { label: 'Relevés de buste en 1 minute', unite: 'reps', sens: 'hausse' },
  test_marche_6min: { label: 'Test de marche de 6 minutes', unite: 'm', sens: 'hausse' },
  test_equilibre: { label: 'Équilibre unipodal', unite: 's', sens: 'hausse' },
  test_souplesse: { label: 'Souplesse (flexion avant)', unite: 'cm', sens: 'hausse' },
  test_fc_repos: { label: 'Fréquence cardiaque de repos', unite: 'bpm', sens: 'baisse' },
}

// Muscles suivis. Chaque exercice de la bibliothèque est relié à un ou plusieurs muscles, avec un niveau de sollicitation.
export const MUSCLES: Record<string, string> = {
  quadriceps: 'Quadriceps',
  ischios: 'Ischio-jambiers',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
  adducteurs: 'Adducteurs',
  pectoraux: 'Pectoraux',
  grand_dorsal: 'Grand dorsal',
  haut_dos: 'Haut du dos',
  lombaires: 'Lombaires',
  delto_ant: 'Deltoïdes antérieurs',
  delto_lat: 'Deltoïdes latéraux',
  delto_post: 'Deltoïdes postérieurs',
  biceps: 'Biceps',
  triceps: 'Triceps',
  avant_bras: 'Avant-bras',
  abdominaux: 'Abdominaux',
  obliques: 'Obliques',
}

// Niveau de sollicitation = poids d'une série pour ce muscle dans le calcul du volume.
export const NIVEAUX = [
  { valeur: 1, libelle: 'Principal' },
  { valeur: 0.5, libelle: 'Secondaire' },
  { valeur: 0.25, libelle: 'Stabilisateur' },
]
export const niveauDe = (coefficient: number) => (coefficient >= 1 ? 'principal' : coefficient >= 0.5 ? 'secondaire' : 'stabilisateur')

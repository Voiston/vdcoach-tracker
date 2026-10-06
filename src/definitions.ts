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

type Regle = { min?: number; max?: number; entier?: boolean }

// Renvoie un message d'erreur, ou une chaîne vide si la valeur est correcte (ou vide).
export function verifier(valeur: string, r: Regle = {}): string {
  if (valeur.trim() === '') return ''
  const n = Number(valeur.replace(',', '.'))
  if (Number.isNaN(n)) return 'Saisis un nombre.'
  if (r.entier && !Number.isInteger(n)) return 'Nombre entier attendu.'
  if (r.min !== undefined && n < r.min) return `Minimum : ${r.min}`
  if (r.max !== undefined && n > r.max) return `Maximum : ${r.max}`
  return ''
}

// Limites cohérentes avec la base de données et avec la réalité d'une séance.
export const REGLES = {
  duree: { min: 1, max: 600, entier: true },
  ressenti: { min: 1, max: 10, entier: true },
  series: { min: 1, max: 30, entier: true },
  repetitions: { min: 1, max: 300, entier: true },
  charge: { min: 0, max: 1000 },
  mesure: { min: 0, max: 500 },
}

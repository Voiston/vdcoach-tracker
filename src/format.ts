// Utilitaires de dates et de formatage partagés dans toute l'application.

export const aujourdhui = () => new Date().toLocaleDateString('sv-SE')

// Ajoute T12:00:00 aux dates 'AAAA-MM-JJ' pour éviter le décalage UTC de minuit.
export function dateLocale(d: string): Date {
  return new Date(d.length === 10 ? `${d}T12:00:00` : d)
}

export const dateFr = (d: string, avecAnnee = false) =>
  dateLocale(d).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(avecAnnee ? { year: 'numeric' } : {}),
  })

export const courte = (d: string) =>
  dateLocale(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })

export function joursDepuis(d: string): number {
  const tJour = Date.parse(`${aujourdhui()}T12:00:00`)
  const tCible = Date.parse(`${d.slice(0, 10)}T12:00:00`)
  return Math.round((tJour - tCible) / 86_400_000)
}

export function ilYa(d: string, court = false): string {
  const jours = joursDepuis(d)
  if (jours <= 0) return "aujourd'hui"
  if (jours === 1) return 'hier'
  return `il y a ${jours} ${court ? 'j' : 'jours'}`
}

export const nb = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

export const resumeCardio = (x: { duree_min: number | null; distance_km: number | null }) =>
  [x.duree_min !== null ? `${x.duree_min} min` : '', x.distance_km !== null ? `${x.distance_km} km` : '']
    .filter(Boolean)
    .join(' · ')
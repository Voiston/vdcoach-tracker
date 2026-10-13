// Utilitaires de dates, de formatage et de numérotation des supersets partagés dans toute l'application.

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

export function resumeCardio(x: {
  series?: number | null
  duree_sec?: number | null
  duree_min?: number | null
  distance_km?: number | null
}): string {
  const s = x.series && x.series > 0 ? `${x.series}×` : ''
  const temps =
    x.duree_sec != null
      ? `${s}${x.duree_sec} s`
      : x.duree_min != null
        ? `${s}${x.duree_min} min`
        : ''
  const dist = x.distance_km != null ? `${ !temps && s ? s : '' }${x.distance_km} km` : ''
  return [temps, dist].filter(Boolean).join(' · ')
}

export function resumeRessentis(s: {
  ressenti?: number | null
  diff_muscu?: number | null
  diff_cardio?: number | null
  fatigue?: number | null
  sommeil?: number | null
}): string {
  const parties = [
    s.diff_muscu != null ? `Muscu ${s.diff_muscu}/10` : '',
    s.diff_cardio != null ? `Cardio ${s.diff_cardio}/10` : '',
    s.fatigue != null ? `Fatigue ${s.fatigue}/10` : '',
    s.sommeil != null ? `Sommeil ${s.sommeil}/10` : '',
  ].filter(Boolean)
  if (parties.length) return parties.join(' · ')
  return s.ressenti != null ? `ressenti ${s.ressenti}/10` : ''
}

/**
 * Renvoie l'étiquette de superset/circuit ('A1', 'A2', 'B1'...) pour chaque ligne,
 * ou null si l'exercice est réalisé seul.
 */
export function etiquettesSuperset(lignes: { lie_suivant?: boolean | null }[]): (string | null)[] {
  const res: (string | null)[] = Array(lignes.length).fill(null)
  let groupe = 0
  let indice = 1
  for (let i = 0; i < lignes.length; i++) {
    const lieApres = Boolean(lignes[i]?.lie_suivant) && i < lignes.length - 1
    const lieAvant = i > 0 && Boolean(lignes[i - 1]?.lie_suivant)
    if (lieApres || lieAvant) {
      if (!lieAvant) {
        groupe++
        indice = 1
      } else {
        indice++
      }
      const lettre = String.fromCharCode(64 + ((groupe - 1) % 26) + 1)
      res[i] = `${lettre}${indice}`
    }
  }
  return res
}
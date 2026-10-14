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

/**
 * Temps de repos lisible : 45 → « 45 s », 60 → « 1 min », 90 → « 1 min 30 ».
 * Renvoie une chaîne vide si aucune valeur n'est renseignée.
 */
export function libelleRepos(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return ''
  if (sec < 60) return `${sec} s`
  const minutes = Math.floor(sec / 60)
  const reste = sec % 60
  return reste ? `${minutes} min ${reste}` : `${minutes} min`
}

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
  const dist = x.distance_km != null ? `${!temps && s ? s : ''}${x.distance_km} km` : ''
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

// Nombre de couleurs distinctes pour les supersets (classes CSS grp-sup-0 à grp-sup-5)
export const NB_COULEURS_SUPERSET = 6

export type InfoSuperset = {
  etiquette: string | null // 'A1', 'A2', 'B1'… ou null si l'exercice est seul
  groupe: number | null // indice de couleur (0 à NB_COULEURS_SUPERSET - 1) ou null
}

/**
 * Pour chaque ligne : étiquette de superset et indice de couleur de son groupe.
 * Une ligne fait partie d'un superset si elle est reliée à la suivante, ou si la précédente l'est.
 * Chaque nouveau groupe reçoit la couleur suivante, et les couleurs reprennent après la dernière.
 */
export function analyserSupersets(lignes: { lie_suivant?: boolean | null }[]): InfoSuperset[] {
  const res: InfoSuperset[] = lignes.map(() => ({ etiquette: null, groupe: null }))
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
      res[i] = { etiquette: `${lettre}${indice}`, groupe: (groupe - 1) % NB_COULEURS_SUPERSET }
    }
  }
  return res
}

/** Étiquettes seules ('A1', 'A2', 'B1'…), ou null pour les exercices réalisés seuls. */
export function etiquettesSuperset(lignes: { lie_suivant?: boolean | null }[]): (string | null)[] {
  return analyserSupersets(lignes).map(s => s.etiquette)
}

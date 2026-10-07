// Brouillon de la séance en cours de saisie, gardé sur le téléphone (jamais envoyé au serveur).
const CLE = 'vdcoach_brouillon_seance'
const DUREE_MAX_MS = 7 * 24 * 3600 * 1000

export type Brouillon = {
  clientId: string
  date: string
  duree: string
  ressenti: string
  notes: string
  lignes: { nom: string; series: string; repetitions: string; charge_kg: string }[]
  enregistreLe: string
}

export function effacerBrouillon() {
  try {
    localStorage.removeItem(CLE)
  } catch {
    /* stockage indisponible : rien à effacer */
  }
}

export function lireBrouillon(): Brouillon | null {
  try {
    const b = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Brouillon | null
    if (!b || Date.now() - Date.parse(b.enregistreLe) > DUREE_MAX_MS) {
      effacerBrouillon()
      return null
    }
    return b
  } catch {
    return null
  }
}

export function ecrireBrouillon(b: Omit<Brouillon, 'enregistreLe'>) {
  try {
    localStorage.setItem(CLE, JSON.stringify({ ...b, enregistreLe: new Date().toISOString() }))
  } catch {
    /* stockage plein ou indisponible : le brouillon est simplement ignoré */
  }
}

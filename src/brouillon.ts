// Brouillon de la séance en cours de saisie : un par client, gardé sur le téléphone (jamais envoyé au serveur).
const PREFIXE = 'vdcoach_brouillon_seance:'
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

export function effacerBrouillon(clientId: string) {
  try {
    localStorage.removeItem(PREFIXE + clientId)
  } catch {
    /* stockage indisponible : rien à effacer */
  }
}

// À la déconnexion : on n'abandonne pas de notes de clients sur l'appareil
export function effacerTousBrouillons() {
  try {
    localStorage.removeItem('vdcoach_brouillon_seance') // ancien format, sans identifiant de client
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const cle = localStorage.key(i)
      if (cle?.startsWith(PREFIXE)) localStorage.removeItem(cle)
    }
  } catch {
    /* stockage indisponible */
  }
}

export function lireBrouillon(clientId: string): Brouillon | null {
  try {
    const b = JSON.parse(localStorage.getItem(PREFIXE + clientId) ?? 'null') as Brouillon | null
    if (!b || Date.now() - Date.parse(b.enregistreLe) > DUREE_MAX_MS) {
      effacerBrouillon(clientId)
      return null
    }
    return b
  } catch {
    return null
  }
}

export function ecrireBrouillon(b: Omit<Brouillon, 'enregistreLe'>) {
  try {
    localStorage.setItem(PREFIXE + b.clientId, JSON.stringify({ ...b, enregistreLe: new Date().toISOString() }))
  } catch {
    /* stockage plein ou indisponible : le brouillon est simplement ignoré */
  }
}

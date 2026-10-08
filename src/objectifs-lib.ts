import { supabase } from './supabase'
import { TYPES, TESTS } from './definitions'

export type Source = 'mesure' | 'charge' | 'test'
export type Objectif = { id: string; source: Source; reference: string; valeur_depart: number; valeur_cible: number; echeance: string | null }

export type DonneesObjectifs = {
  objectifs: Objectif[]
  derniereMesure: Record<string, number> // type de mesure ou de test → dernière valeur
  meilleureCharge: Record<string, number> // exercice (en minuscules) → charge maximale
  nomsExercices: string[]
}

export const unite = (s: Source, ref: string) => (s === 'mesure' ? TYPES[ref]?.unite : s === 'test' ? TESTS[ref]?.unite : 'kg') ?? ''
export const libelle = (s: Source, ref: string) => (s === 'mesure' ? TYPES[ref]?.label : s === 'test' ? TESTS[ref]?.label : ref) ?? ref

// Charge les objectifs d'un client et les données dont on a besoin pour calculer leur avancement.
export async function chargerObjectifs(clientId: string): Promise<{ donnees?: DonneesObjectifs; erreur?: unknown }> {
  const [o, m, s] = await Promise.all([
    supabase.from('objectifs').select('*').eq('client_id', clientId).order('created_at'),
    supabase.from('mesures').select('type, valeur').eq('client_id', clientId).order('date_mesure'),
    supabase.from('seances').select('exercices(nom, charge_kg)').eq('client_id', clientId),
  ])
  const erreur = o.error ?? m.error ?? s.error
  if (erreur) return { erreur }

  const derniereMesure: Record<string, number> = {}
  for (const x of m.data ?? []) derniereMesure[x.type] = Number(x.valeur) // trié par date : la dernière écrase

  const meilleureCharge: Record<string, number> = {}
  const nomsExercices: string[] = []
  for (const seance of (s.data ?? []) as any[])
    for (const x of seance.exercices) {
      if (x.charge_kg === null) continue
      const k = String(x.nom).trim().toLowerCase()
      meilleureCharge[k] = Math.max(meilleureCharge[k] ?? 0, Number(x.charge_kg))
      nomsExercices.push(String(x.nom).trim())
    }
  return { donnees: { objectifs: o.data as Objectif[], derniereMesure, meilleureCharge, nomsExercices } }
}

export function valeurActuelle(d: Pick<DonneesObjectifs, 'derniereMesure' | 'meilleureCharge'>, source: Source, reference: string): number | null {
  return (source === 'charge' ? d.meilleureCharge[reference.trim().toLowerCase()] : d.derniereMesure[reference]) ?? null
}

// Avancement d'un objectif : pourcentage (0 à 100), atteint ou non, jours restants avant l'échéance
export function etatObjectif(o: Objectif, actuelle: number | null) {
  const depart = Number(o.valeur_depart)
  const cible = Number(o.valeur_cible)
  const total = cible - depart
  const pct = actuelle === null ? 0 : Math.max(0, Math.min(100, ((actuelle - depart) / total) * 100))
  const atteint = actuelle !== null && (total > 0 ? actuelle >= cible : actuelle <= cible)
  const reste = o.echeance ? Math.ceil((Date.parse(o.echeance) - Date.now()) / 86_400_000) : null
  return { pct, atteint, reste }
}

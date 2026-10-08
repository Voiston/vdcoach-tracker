import { supabase } from './supabase'

export type Reference = { nom: string; groupe: string; exercice_muscles: { muscle: string; coefficient: number }[] }
export type SeanceExo = { date_seance: string; exercices: { nom: string; series: number | null }[] }
export type Apport = { exercice: string; series: number; coefficient: number }
export type Volume = { total: number; principal: number; apports: Apport[] }

export const cle = (n: string) => n.trim().toLowerCase()

export async function chargerBibliothequeMuscles(): Promise<{ biblio?: Record<string, Reference>; erreur?: unknown }> {
  const { data, error } = await supabase.from('bibliotheque_exercices').select('nom, groupe, exercice_muscles(muscle, coefficient)')
  if (error) return { erreur: error }
  return { biblio: Object.fromEntries((data as Reference[]).map(x => [cle(x.nom), x])) }
}

export async function chargerSeancesMuscles(clientId: string, jours: number): Promise<{ seances?: SeanceExo[]; erreur?: unknown }> {
  const debut = new Date(Date.now() - jours * 86_400_000).toLocaleDateString('sv-SE')
  const { data, error } = await supabase.from('seances').select('date_seance, exercices(nom, series)').eq('client_id', clientId).gte('date_seance', debut)
  if (error) return { erreur: error }
  return { seances: data as unknown as SeanceExo[] }
}

// Séries pondérées par muscle : une série d'un exercice compte pour chaque muscle sollicité, selon son niveau.
export function calculerMuscles(seances: SeanceExo[], biblio: Record<string, Reference> | null) {
  const parMuscle: Record<string, Volume> = {}
  const nonClasses: Record<string, number> = {}
  let seriesTotal = 0
  for (const s of seances)
    for (const x of s.exercices) {
      const series = x.series ?? 1
      const ref = biblio?.[cle(x.nom)]
      if (ref?.groupe === 'Mobilité') continue
      seriesTotal += series
      if (!ref || !ref.exercice_muscles.length) {
        nonClasses[x.nom.trim()] = (nonClasses[x.nom.trim()] ?? 0) + series
        continue
      }
      for (const m of ref.exercice_muscles) {
        const coef = Number(m.coefficient)
        const e = (parMuscle[m.muscle] ??= { total: 0, principal: 0, apports: [] })
        e.total += series * coef
        if (coef >= 1) e.principal += series
        const existant = e.apports.find(a => a.exercice === ref.nom)
        if (existant) existant.series += series
        else e.apports.push({ exercice: ref.nom, series, coefficient: coef })
      }
    }
  return { parMuscle, nonClasses, seriesTotal }
}

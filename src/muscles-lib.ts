import { supabase } from './supabase'

export type Reference = { nom: string; groupe: string; exercice_muscles: { muscle: string; coefficient: number }[] }
export type SeanceExo = {
  date_seance: string
  exercices: {
    nom: string
    series: number | null
    duree_sec?: number | null
    duree_min?: number | null
  }[]
}
export type Apport = { exercice: string; series: number; coefficient: number }
export type Volume = { total: number; principal: number; apports: Apport[] }

export const cle = (n: string) => n.trim().toLowerCase()

// Équilibres suivis : deux familles de muscles comparées sur les séries pondérées
const EQUILIBRES = [
  { a: { nom: 'Poussée', muscles: ['pectoraux', 'delto_ant', 'triceps'] }, b: { nom: 'Tirage', muscles: ['grand_dorsal', 'haut_dos', 'biceps'] } },
  { a: { nom: 'Quadriceps', muscles: ['quadriceps'] }, b: { nom: 'Ischio-jambiers', muscles: ['ischios'] } },
]
const SEUIL_EQUILIBRE = 90 // à partir de ce pourcentage, on parle d'équilibre

export function phrasesEquilibre(parMuscle: Record<string, Volume>): string[] {
  const total = (muscles: string[]) => muscles.reduce((t, m) => t + (parMuscle[m]?.total ?? 0), 0)
  return EQUILIBRES.flatMap(({ a, b }) => {
    const va = total(a.muscles)
    const vb = total(b.muscles)
    if (va === 0 && vb === 0) return []
    const [faible, fort] = va <= vb ? [{ ...a, v: va }, { ...b, v: vb }] : [{ ...b, v: vb }, { ...a, v: va }]
    if (faible.v === 0) return [`${faible.nom} : aucun volume sur la période`]
    const pct = Math.round((faible.v / fort.v) * 100)
    return [pct >= SEUIL_EQUILIBRE ? `${a.nom} et ${b.nom.toLowerCase()} équilibrés` : `${faible.nom} : ${pct} % du volume de ${fort.nom.toLowerCase()}`]
  })
}

export async function chargerBibliothequeMuscles(): Promise<{ biblio?: Record<string, Reference>; erreur?: unknown }> {
  const { data, error } = await supabase.from('bibliotheque_exercices').select('nom, groupe, exercice_muscles(muscle, coefficient)')
  if (error) return { erreur: error }
  return { biblio: Object.fromEntries((data as Reference[]).map(x => [cle(x.nom), x])) }
}

// decalage : nombre de jours à remonter avant la période (ex. 30 jours avec un décalage de 30 = les 30 jours précédents)
export async function chargerSeancesMuscles(clientId: string, jours: number, decalage = 0): Promise<{ seances?: SeanceExo[]; erreur?: unknown }> {
  const jour = (n: number) => {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - n)
    return d.toLocaleDateString('sv-SE')
  }
  let q = supabase.from('seances').select('date_seance, exercices(nom, series, duree_sec, duree_min)').eq('client_id', clientId).gte('date_seance', jour(jours + decalage - 1))
  if (decalage > 0) {
    q = q.lt('date_seance', jour(decalage - 1))
  } else {
    q = q.lte('date_seance', jour(0))
  }
  const { data, error } = await q
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
      const ref = biblio?.[cle(x.nom)]
      // La mobilité (étirements) ne compte pas dans les volumes musculaires
      if (ref?.groupe === 'Mobilité') continue
      // Le cardio sans muscles ciblés n'est pas compté et ne pollue pas les non-classés
      if (ref?.groupe === 'Cardio' && (!ref.exercice_muscles || !ref.exercice_muscles.length)) continue

      // Séries : si le cardio est renseigné en durée continue (ex. 20-30 min de course avec 1 série ou sans série),
      // on convertit en séries équivalentes (~1 série par tranche de 7-8 min, max 5 séries)
      let series = x.series ?? 1
      if (ref?.groupe === 'Cardio') {
        const minutes = x.duree_min ?? (x.duree_sec ? Math.round(x.duree_sec / 60) : 0)
        if (minutes >= 8 && (x.series === null || x.series <= 1)) {
          series = Math.min(5, Math.max(1, Math.round(minutes / 8)))
        }
      }

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

// Évolution d'un volume par rapport à la période précédente
export const evolutionPct = (actuel: number, ancien: number) => Math.round(((actuel - ancien) / ancien) * 100)
export const libelleEvolution = (pct: number) => (pct === 0 ? 'stable' : `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)} %`)

export function variationMuscle(avant: Record<string, Volume>, muscle: string, actuel: number) {
  const ancien = avant[muscle]?.total ?? 0
  if (!ancien) return { texte: 'nouveau', classe: 'nouveau' }
  const pct = evolutionPct(actuel, ancien)
  return { texte: libelleEvolution(pct), classe: pct > 0 ? 'hausse' : pct < 0 ? 'baisse' : 'stable' }
}
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type Exercice = { id: string; ordre: number; nom: string; series: number | null; repetitions: number | null; charge_kg: number | null }
type Seance = {
  id: string
  date_seance: string
  duree_min: number | null
  ressenti: number | null
  notes: string | null
  clients: { prenom: string; nom: string | null } | null
  exercices: Exercice[]
}

const dateFr = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default function Historique({ onEdit }: { onEdit: (id: string) => void }) {
  const [seances, setSeances] = useState<Seance[]>([])
  const [erreur, setErreur] = useState('')

  async function charger() {
    const { data, error } = await supabase
      .from('seances')
      .select('id, date_seance, duree_min, ressenti, notes, clients(prenom, nom), exercices(id, ordre, nom, series, repetitions, charge_kg)')
      .order('date_seance', { ascending: false })
      .limit(50)
    if (error) setErreur(error.message)
    else setSeances(data as unknown as Seance[])
  }

  useEffect(() => {
    charger()
  }, [])

  async function supprimer(s: Seance) {
    if (!window.confirm(`Supprimer la séance de ${s.clients?.prenom} du ${dateFr(s.date_seance)} ?`)) return
    const { error } = await supabase.from('seances').delete().eq('id', s.id)
    if (error) setErreur(error.message)
    else charger()
  }

  return (
    <section>
      <h2>Historique</h2>
      {erreur && <p className="erreur">{erreur}</p>}
      {!seances.length && !erreur && <p className="centre">Aucune séance enregistrée.</p>}
      <ul className="liste">
        {seances.map(s => (
          <li key={s.id}>
            <div>
              <strong>{s.clients?.prenom} {s.clients?.nom}</strong>
              <p className="meta">
                {dateFr(s.date_seance)}
                {s.duree_min ? ` · ${s.duree_min} min` : ''}
                {s.ressenti ? ` · ressenti ${s.ressenti}/10` : ''}
              </p>
              {[...s.exercices].sort((a, b) => a.ordre - b.ordre).map(x => (
                <p key={x.id}>
                  {x.nom}
                  {x.series && x.repetitions ? ` — ${x.series}×${x.repetitions}` : ''}
                  {x.charge_kg ? ` @ ${x.charge_kg} kg` : ''}
                </p>
              ))}
              {s.notes && <p className="meta">{s.notes}</p>}
              <div className="ligne">
                <button className="lien" onClick={() => onEdit(s.id)}>Modifier</button>
                <button className="lien" onClick={() => supprimer(s)}>Supprimer</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

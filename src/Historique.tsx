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

export default function Historique() {
  const [seances, setSeances] = useState<Seance[]>([])
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    supabase
      .from('seances')
      .select('id, date_seance, duree_min, ressenti, notes, clients(prenom, nom), exercices(id, ordre, nom, series, repetitions, charge_kg)')
      .order('date_seance', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setSeances(data as unknown as Seance[])
      })
  }, [])

  if (erreur) return <p className="erreur">{erreur}</p>
  if (!seances.length) return <p className="centre">Aucune séance enregistrée.</p>

  return (
    <section>
      <h2>Historique</h2>
      <ul className="liste">
        {seances.map(s => (
          <li key={s.id}>
            <div>
              <strong>{s.clients?.prenom} {s.clients?.nom}</strong>
              <p className="meta">
                {new Date(s.date_seance).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
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
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Client } from './Clients'

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

const TAILLE = 20
const CLE = 'vdcoach_filtre_historique'
const dateFr = (d: string) =>
  new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default function Historique({ onEdit }: { onEdit: (id: string) => void }) {
  const [seances, setSeances] = useState<Seance[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [filtre, setFiltre] = useState(() => sessionStorage.getItem(CLE) ?? '')
  const [fin, setFin] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')

  // Charge une page de TAILLE séances à partir de l'indice « depuis » (0 = on repart du début)
  async function charger(depuis: number) {
    setChargement(true)
    let q = supabase
      .from('seances')
      .select('id, date_seance, duree_min, ressenti, notes, clients(prenom, nom), exercices(id, ordre, nom, series, repetitions, charge_kg)')
    if (filtre) q = q.eq('client_id', filtre)
    const { data, error } = await q
      .order('date_seance', { ascending: false })
      .order('created_at', { ascending: false })
      .range(depuis, depuis + TAILLE - 1)
    setChargement(false)
    if (error) return setErreur(error.message)
    const lignes = data as unknown as Seance[]
    setErreur('')
    setSeances(prec => (depuis === 0 ? lignes : [...prec, ...lignes]))
    setFin(lignes.length < TAILLE)
  }

  useEffect(() => {
    supabase.from('clients').select('*').order('prenom').then(({ data }) => setClients(data ?? []))
  }, [])

  useEffect(() => {
    charger(0)
  }, [filtre])

  function changerFiltre(v: string) {
    sessionStorage.setItem(CLE, v)
    setFiltre(v)
  }

  async function supprimer(s: Seance) {
    if (!window.confirm(`Supprimer la séance de ${s.clients?.prenom} du ${dateFr(s.date_seance)} ?`)) return
    const { error } = await supabase.from('seances').delete().eq('id', s.id)
    if (error) setErreur(error.message)
    else charger(0)
  }

  return (
    <section>
      <h2>Historique</h2>
      <select value={filtre} onChange={e => changerFiltre(e.target.value)}>
        <option value="">Tous les clients</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.actif ? '' : ' (archivé)'}</option>)}
      </select>
      {erreur && <p className="erreur">{erreur}</p>}
      {!seances.length && !erreur && !chargement && <p className="centre">Aucune séance enregistrée.</p>}
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
      {seances.length > 0 && !fin && (
        <button type="button" className="secondaire" disabled={chargement} onClick={() => charger(seances.length)}>
          {chargement ? 'Chargement…' : 'Charger plus'}
        </button>
      )}
    </section>
  )
}

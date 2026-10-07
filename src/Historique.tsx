import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import type { Client } from './Clients'
import { EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useAller, useNotifier } from './ui'

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
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const notifier = useNotifier()
  const aller = useAller()
  const [masquees, setMasquees] = useState<string[]>([])

  // Charge une page de TAILLE séances à partir de l'indice « depuis » (0 = on repart du début)
  async function charger(depuis: number) {
    setChargement(true)
    if (depuis === 0) setPret(false)
    let q = supabase
      .from('seances')
      .select('id, date_seance, duree_min, ressenti, notes, clients(prenom, nom), exercices(id, ordre, nom, series, repetitions, charge_kg)')
    if (filtre) q = q.eq('client_id', filtre)
    const { data, error } = await q
      .order('date_seance', { ascending: false })
      .order('created_at', { ascending: false })
      .range(depuis, depuis + TAILLE - 1)
    setChargement(false)
    setPret(true)
    if (error) return setErreur(messageErreur(error))
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

  function supprimer(s: Seance) {
    supprimerAvecAnnulation({
      notifier,
      message: `Séance de ${s.clients?.prenom} supprimée`,
      masquer: () => setMasquees(l => [...l, s.id]),
      restaurer: () => setMasquees(l => l.filter(id => id !== s.id)),
      effacer: async () => {
        const { error } = await supabase.from('seances').delete().eq('id', s.id)
        if (!error) setSeances(prec => prec.filter(x => x.id !== s.id))
        return error
      },
    })
  }

  const visibles = seances.filter(s => !masquees.includes(s.id))

  return (
    <section>
      <h2>Historique</h2>
      <select aria-label="Filtrer par client" value={filtre} onChange={e => changerFiltre(e.target.value)}>
        <option value="">Tous les clients</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.actif ? '' : ' (archivé)'}</option>)}
      </select>
      <MessageErreur message={erreur} reessayer={() => charger(0)} />
      {pret && !visibles.length && !erreur && (filtre
        ? <EtatVide titre="Aucune séance pour ce client" texte="Il n'a pas encore de séance enregistrée." action={{ libelle: 'Voir tous les clients', onClick: () => changerFiltre('') }} />
        : <EtatVide titre="Aucune séance pour l'instant" texte="Tes séances apparaîtront ici dès que tu en auras enregistré une." action={{ libelle: 'Enregistrer une séance', onClick: () => aller('seance') }} />)}
      {!pret && !erreur && <Squelette lignes={4} />}
      <ul className="liste" hidden={!pret}>
        {visibles.map(s => (
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
                <button className="lien danger" onClick={() => supprimer(s)}>Supprimer</button>
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

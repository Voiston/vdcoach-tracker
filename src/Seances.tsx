import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useClient, useNotifier } from './ui'

type Exercice = { id: string; ordre: number; nom: string; series: number | null; repetitions: number | null; charge_kg: number | null }
type Seance = { id: string; date_seance: string; duree_min: number | null; ressenti: number | null; notes: string | null; exercices: Exercice[] }

const TAILLE = 20
const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

export default function Seances({ onEdit, onNouvelle }: { onEdit: (id: string) => void; onNouvelle: () => void }) {
  const client = useClient()
  const notifier = useNotifier()
  const [seances, setSeances] = useState<Seance[]>([])
  const [fin, setFin] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [masquees, setMasquees] = useState<string[]>([])

  // Charge une page de TAILLE séances à partir de l'indice « depuis » (0 = on repart du début)
  async function charger(depuis: number) {
    setChargement(true)
    if (depuis === 0) setPret(false)
    const { data, error } = await supabase
      .from('seances')
      .select('id, date_seance, duree_min, ressenti, notes, exercices(id, ordre, nom, series, repetitions, charge_kg)')
      .eq('client_id', client.id)
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
    charger(0)
  }, [client.id])

  function supprimer(s: Seance) {
    supprimerAvecAnnulation({
      notifier,
      message: `Séance du ${dateFr(s.date_seance)} supprimée`,
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
      <MessageErreur message={erreur} reessayer={() => charger(0)} />
      {!pret && !erreur && <Squelette lignes={4} />}
      {pret && !visibles.length && !erreur && (
        <EtatVide titre="Aucune séance pour l'instant" texte={`Les séances de ${client.prenom} apparaîtront ici.`} action={{ libelle: 'Enregistrer une séance', onClick: onNouvelle }} />
      )}
      <ul className="liste" hidden={!pret}>
        {visibles.map(s => (
          <li key={s.id}>
            <div>
              <strong>{dateFr(s.date_seance)}</strong>
              <p className="meta">
                {[s.duree_min ? `${s.duree_min} min` : '', s.ressenti ? `ressenti ${s.ressenti}/10` : ''].filter(Boolean).join(' · ')}
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
      {visibles.length > 0 && !fin && (
        <button type="button" className="secondaire" disabled={chargement} onClick={() => charger(seances.length)}>
          {chargement ? 'Chargement…' : 'Charger plus'}
        </button>
      )}
    </section>
  )
}

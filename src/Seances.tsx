import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { dateFr, etiquettesSuperset, resumeCardio } from './format'
import FenetreProgrammePdf from './ProgrammePdf'
import { EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useClient, useNotifier } from './ui'

type Exercice = {
  id: string
  ordre: number
  nom: string
  series: number | null
  repetitions: number | null
  charge_kg: number | null
  duree_min: number | null
  distance_km: number | null
  reglage?: string | null
  lie_suivant?: boolean | null
}
type Seance = { id: string; date_seance: string; duree_min: number | null; ressenti: number | null; notes: string | null; exercices: Exercice[] }

const TAILLE = 20

export default function Seances({ onEdit, onNouvelle }: { onEdit: (id: string) => void; onNouvelle: () => void }) {
  const client = useClient()
  const notifier = useNotifier()
  const [seances, setSeances] = useState<Seance[]>([])
  const [fin, setFin] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [masquees, setMasquees] = useState<string[]>([])
  const [seancePdf, setSeancePdf] = useState<Seance | null>(null)

  async function charger(depuis: number) {
    setChargement(true)
    if (depuis === 0) setPret(false)
    const { data, error } = await supabase
      .from('seances')
      .select('id, date_seance, duree_min, ressenti, notes, exercices(id, ordre, nom, series, repetitions, charge_kg, duree_min, distance_km, reglage, lie_suivant)')
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
      message: `Séance du ${dateFr(s.date_seance, true)} supprimée`,
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
        {visibles.map(s => {
          const exosTries = [...s.exercices].sort((a, b) => a.ordre - b.ordre)
          const etiquettes = etiquettesSuperset(exosTries)
          return (
            <li key={s.id}>
              <div>
                <strong>{dateFr(s.date_seance, true)}</strong>
                <p className="meta">
                  {[s.duree_min ? `${s.duree_min} min` : '', s.ressenti ? `ressenti ${s.ressenti}/10` : ''].filter(Boolean).join(' · ')}
                </p>
                {exosTries.map((x, idx) => (
                  <p key={x.id}>
                    {etiquettes[idx] && <span className="puce superset-mini">{etiquettes[idx]}</span>}
                    {x.nom}
                    {x.series && x.repetitions ? ` — ${x.series}×${x.repetitions}` : ''}
                    {x.charge_kg ? ` @ ${x.charge_kg} kg` : ''}
                    {resumeCardio(x) ? ` — ${resumeCardio(x)}` : ''}
                    {x.reglage && <span className="meta"> ({x.reglage})</span>}
                  </p>
                ))}
                {s.notes && <p className="meta">{s.notes}</p>}
                <div className="ligne" style={{ flexWrap: 'wrap', marginTop: '.35rem' }}>
                  <button className="lien" onClick={() => onEdit(s.id)}>Modifier</button>
                  {exosTries.length > 0 && (
                    <button className="lien" onClick={() => setSeancePdf(s)}>Programme PDF</button>
                  )}
                  <button className="lien danger" onClick={() => supprimer(s)}>Supprimer</button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {visibles.length > 0 && !fin && (
        <button type="button" className="secondaire" disabled={chargement} onClick={() => charger(seances.length)}>
          {chargement ? 'Chargement…' : 'Charger plus'}
        </button>
      )}
      {seancePdf && (
        <FenetreProgrammePdf
          titreInitial={`Séance du ${dateFr(seancePdf.date_seance, true)}`}
          prenomInitial={client.prenom}
          consigneInitiale={seancePdf.notes ?? ''}
          lignes={[...seancePdf.exercices].sort((a, b) => a.ordre - b.ordre)}
          onFermer={() => setSeancePdf(null)}
        />
      )}
    </section>
  )
}
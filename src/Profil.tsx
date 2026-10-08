import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Client } from './Clients'
import { messageErreur } from './erreurs'
import { ClientCtx, ErreurChargement, Squelette } from './ui'
import Apercu from './Apercu'
import Seances from './Seances'
import SuiviHub from './SuiviHub'
import Fiche from './Fiche'
import NouvelleSeance from './NouvelleSeance'

export type Rubrique = 'apercu' | 'seances' | 'suivi' | 'objectifs' | 'fiche' | 'seance'

const RUBRIQUES: { cle: Exclude<Rubrique, 'seance'>; libelle: string }[] = [
  { cle: 'apercu', libelle: 'Aperçu' },
  { cle: 'seances', libelle: 'Séances' },
  { cle: 'suivi', libelle: 'Suivi' },
  { cle: 'objectifs', libelle: 'Objectifs & bilans' },
  { cle: 'fiche', libelle: 'Fiche' },
]

type Props = {
  clientId: string
  rubrique: Rubrique
  seanceId: string | null
  onRubrique: (rubrique: Rubrique, seanceId?: string | null) => void
  onRetour: () => void
  onSaved: (message?: string) => void
}

export default function Profil({ clientId, rubrique, seanceId, onRubrique, onRetour, onSaved }: Props) {
  const [client, setClient] = useState<Client | null>(null)
  const [erreur, setErreur] = useState('')

  async function recharger() {
    const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single()
    if (error) return setErreur(messageErreur(error))
    setErreur('')
    setClient(data as Client)
  }

  useEffect(() => {
    recharger()
  }, [clientId])

  if (erreur && !client) return <ErreurChargement message={erreur} />
  if (!client) return <Squelette lignes={3} />

  const saisie = rubrique === 'seance'

  return (
    <ClientCtx.Provider value={{ client, recharger }}>
      <div className="profil">
      <button type="button" className={saisie ? 'lien retour' : 'lien retour vers-liste'} onClick={saisie ? () => onRubrique('seances') : onRetour}>
        {saisie ? '← Séances' : '← Clients'}
      </button>
      <div className="profil-entete">
        <h2>{client.prenom} {client.nom}</h2>
        {!client.actif && <p className="meta">Client archivé</p>}
        {client.points_attention && <p className="attention">⚠ {client.points_attention}</p>}
        {!saisie && <button type="button" onClick={() => onRubrique('seance')}>+ Nouvelle séance</button>}
      </div>

      {saisie ? (
        <NouvelleSeance key={seanceId ?? 'nouvelle'} seanceId={seanceId} onSaved={onSaved} />
      ) : (
        <>
          <div className="rubriques" role="group" aria-label="Rubriques du client">
            {RUBRIQUES.map(r => (
              <button key={r.cle} type="button" className={r.cle === rubrique ? 'actif' : ''} aria-pressed={r.cle === rubrique} onClick={() => onRubrique(r.cle)}>
                {r.libelle}
              </button>
            ))}
          </div>
          {rubrique === 'apercu' && <Apercu onRubrique={onRubrique} />}
          {rubrique === 'seances' && <Seances onEdit={id => onRubrique('seance', id)} onNouvelle={() => onRubrique('seance')} />}
          {rubrique === 'suivi' && <SuiviHub key="suivi" vues={['progression', 'muscles']} />}
          {rubrique === 'objectifs' && <SuiviHub key="objectifs" vues={['objectifs', 'bilans']} />}
          {rubrique === 'fiche' && <Fiche onRetour={onRetour} />}
        </>
      )}
      </div>
    </ClientCtx.Provider>
  )
}

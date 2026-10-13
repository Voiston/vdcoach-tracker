import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Client } from './Clients'
import { MUSCLES } from './definitions'
import { messageErreur } from './erreurs'
import { libelleMois, resumeMois } from './facturation-lib'
import { Avatar, ClientCtx, ErreurChargement, Squelette } from './ui'
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
  { cle: 'objectifs', libelle: 'Objectifs' },
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
  const [resume, setResume] = useState<{ n: number; avec: string[]; mois: string } | null>(null)

  async function recharger() {
    const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single()
    if (error) return setErreur(messageErreur(error))
    setErreur('')
    setClient(data as Client)
  }

  useEffect(() => {
    recharger()
  }, [clientId])

  useEffect(() => {
    if (client) resumeMois(client).then(setResume)
  }, [client?.id, client?.groupe_facturation, rubrique])

  if (erreur && !client) return <ErreurChargement message={erreur} />
  if (!client) return <Squelette lignes={3} />

  const saisie = rubrique === 'seance'
  const zones = (client.zones_sensibles ?? []).map(z => MUSCLES[z] ?? z)

  return (
    <ClientCtx.Provider value={{ client, recharger }}>
      <div className="profil">
        <div className="profil-barre-mobile">
          <button
            type="button"
            className={saisie ? 'lien retour' : 'lien retour vers-liste'}
            onClick={saisie ? () => onRubrique('seances') : onRetour}
          >
            {saisie ? '← Annuler' : '← Clients'}
          </button>
          {saisie && (
            <span className="profil-mini-identite">
              <Avatar client={client} />
              <strong>{client.prenom} {client.nom}</strong>
            </span>
          )}
        </div>

        {!saisie ? (
          <div className="profil-entete">
            <div className="profil-identite">
              <h2><Avatar client={client} grand /><span>{client.prenom} {client.nom}</span></h2>
              {!client.actif && <p className="meta">Client archivé</p>}
              {resume && (
                <p className="meta">
                  {resume.n} séance{resume.n > 1 ? 's' : ''} en {libelleMois(resume.mois)}
                  {resume.avec.length > 0 && ` · facturées avec ${resume.avec.join(' & ')}`}
                </p>
              )}
            </div>
            <button type="button" className="btn-nouvelle-seance" onClick={() => onRubrique('seance')}>
              + Séance
            </button>
            {(client.points_attention || zones.length > 0) && (
              <p className="attention">
                ⚠ {client.points_attention}
                {client.points_attention && zones.length > 0 ? ' · ' : ''}
                {zones.length > 0 && <strong>Zones à ménager : {zones.join(', ')}</strong>}
              </p>
            )}
          </div>
        ) : (
          (client.points_attention || zones.length > 0) && (
            <p className="attention" style={{ marginBottom: '.75rem' }}>
              ⚠ {client.points_attention}
              {client.points_attention && zones.length > 0 ? ' · ' : ''}
              {zones.length > 0 && <strong>Zones : {zones.join(', ')}</strong>}
            </p>
          )
        )}

        {saisie ? (
          <NouvelleSeance key={seanceId ?? 'nouvelle'} seanceId={seanceId} onSaved={onSaved} />
        ) : (
          <>
            <div className="rubriques" role="tablist" aria-label="Rubriques du client">
              {RUBRIQUES.map(r => (
                <button
                  key={r.cle}
                  type="button"
                  role="tab"
                  aria-selected={r.cle === rubrique}
                  className={r.cle === rubrique ? 'actif' : ''}
                  onClick={() => onRubrique(r.cle)}
                >
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
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Client } from './Clients'
import { libelleZone } from './definitions'
import { messageErreur } from './erreurs'
import { libelleMois, resumeMois } from './facturation-lib'
import { ilYa } from './format'
import { Avatar, ClientCtx, ErreurChargement, Squelette } from './ui'
import Apercu from './Apercu'
import Seances from './Seances'
import Suivi from './Suivi'
import Muscles from './Muscles'
import Objectifs from './Objectifs'
import Bilans from './Bilans'
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
  const [total, setTotal] = useState<number | null>(null)
  const [derniereDate, setDerniereDate] = useState<string | null>(null)

  async function recharger() {
    const { data, error } = await supabase.from('clients').select('*').eq('id', clientId).single()
    if (error) return setErreur(messageErreur(error))
    setErreur('')
    setClient(data as Client)
  }

  useEffect(() => {
    recharger()
  }, [clientId])

  // Séances du mois, total et dernière séance, recalculés quand on change de rubrique.
  useEffect(() => {
    if (!client) return
    resumeMois(client).then(setResume)
    supabase
      .from('seances')
      .select('id, session_id, date_seance')
      .eq('client_id', client.id)
      .order('date_seance', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setTotal(new Set(data.map(s => s.session_id ?? s.id)).size)
          setDerniereDate(data[0]?.date_seance ?? null)
        }
      })
  }, [client?.id, client?.groupe_facturation, rubrique])

  if (erreur && !client) return <ErreurChargement message={erreur} />
  if (!client) return <Squelette lignes={3} />

  const saisie = rubrique === 'seance'
  const zones = (client.zones_sensibles ?? []).map(libelleZone)

  const blocAlerteSante = (client.points_attention || zones.length > 0) && (
    <div className="profil-alerte-sante" role="status">
      {client.points_attention && (
        <span>
          <strong>⚠ Attention :</strong> {client.points_attention}
        </span>
      )}
      {zones.length > 0 && (
        <div className="profil-alerte-zones">
          <span><strong>Zones à ménager :</strong></span>
          {zones.map(z => (
            <span key={z} className="puce-zone-alerte">{z}</span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <ClientCtx.Provider value={{ client, recharger }}>
      <div className="profil">
        <div className="profil-barre-mobile">
          <button
            type="button"
            className="lien retour"
            onClick={saisie ? () => onRubrique('seances') : onRetour}
          >
            {saisie ? (
              '← Annuler'
            ) : (
              <>
                <span className="libelle-mobile">← Clients</span>
                <span className="libelle-bureau">← Vue d'ensemble</span>
              </>
            )}
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
              <div className="profil-meta-badges">
                {!client.actif && <span className="badge-stat alerte">Client archivé</span>}
                {resume && (
                  <span className="badge-stat">
                    <strong>{resume.n}</strong> séance{resume.n > 1 ? 's' : ''} en {libelleMois(resume.mois)}
                  </span>
                )}
                {total !== null && total > 0 && (
                  <span className="badge-stat">
                    <strong>{total}</strong> au total
                  </span>
                )}
                {derniereDate && (
                  <span className="badge-stat">
                    Dernière : <strong>{ilYa(derniereDate)}</strong>
                  </span>
                )}
                {resume && resume.avec.length > 0 && (
                  <span className="badge-stat">
                    Facturé avec <strong>{resume.avec.join(' & ')}</strong>
                  </span>
                )}
              </div>
            </div>
            <button type="button" className="btn-nouvelle-seance" onClick={() => onRubrique('seance')}>
              + Séance
            </button>
            {blocAlerteSante}
          </div>
        ) : (
          blocAlerteSante && <div style={{ marginBottom: '.75rem' }}>{blocAlerteSante}</div>
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
            {rubrique === 'suivi' && (
              <>
                <Suivi />
                <div className="separateur-section">
                  <h3>Muscles travaillés</h3>
                  <Muscles />
                </div>
              </>
            )}
            {rubrique === 'objectifs' && (
              <>
                <Objectifs />
                <div className="separateur-section">
                  <h3>Bilans physiques</h3>
                  <Bilans />
                </div>
              </>
            )}
            {rubrique === 'fiche' && <Fiche onRetour={onRetour} />}
          </>
        )}
      </div>
    </ClientCtx.Provider>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { Avatar, EtatVide, MessageErreur, Squelette } from './ui'
import type { Client } from './Clients'
import { libelleFormat, regrouperSeances } from './facturation-lib'

type Resume = { id: string; client_id: string; date_seance: string; duree_min: number | null; session_id: string | null }

const SEUIL_RELANCE = 21 // jours sans séance avant de proposer une relance
const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const joursDepuis = (d: string) => Math.floor((Date.now() - Date.parse(d)) / 86_400_000)
const ilYa = (jours: number) => (jours <= 0 ? "aujourd'hui" : jours === 1 ? 'hier' : `il y a ${jours} jours`)

// Vue d'ensemble affichée sur ordinateur tant qu'aucun client n'est ouvert.
export default function TableauDeBord({ onOuvrir, onNouvelleSeance }: { onOuvrir: (clientId: string) => void; onNouvelleSeance: (clientId: string) => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [seances, setSeances] = useState<Resume[]>([])
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')

  async function charger() {
    const [c, s] = await Promise.all([
      supabase.from('clients').select('*').order('prenom'),
      supabase.from('seances').select('id, client_id, date_seance, duree_min, session_id').order('date_seance', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
    ])
    setPret(true)
    const err = c.error ?? s.error
    if (err) return setErreur(messageErreur(err))
    setErreur('')
    setClients(c.data as Client[])
    setSeances(s.data as Resume[])
  }

  useEffect(() => {
    charger()
  }, [])

  if (!pret) return <Squelette lignes={4} />
  if (erreur) return <MessageErreur message={erreur} reessayer={charger} />

  const actifs = clients.filter(c => c.actif)
  if (!actifs.length) return <EtatVide titre="Aucun client pour l'instant" texte="Ajoute ton premier client avec le bouton « Nouveau client »." />

  const par = Object.fromEntries(clients.map(c => [c.id, c]))
  const derniere: Record<string, string> = {}
  for (const s of seances) derniere[s.client_id] ??= s.date_seance
  const debutMois = `${new Date().toLocaleDateString('sv-SE').slice(0, 7)}-01`
  // Une séance partagée (plusieurs participants) ne compte qu'une fois
  const sessions = regrouperSeances(seances)
  const ceMois = sessions.filter(s => s.date >= debutMois).length
  const sept = sessions.filter(s => joursDepuis(s.date) < 7).length
  const recentes = [...sessions].reverse().slice(0, 8)

  // Clients à relancer : plus de séance depuis 3 semaines (les plus anciens d'abord), puis ceux sans aucune séance
  const aRelancer = actifs
    .map(c => ({ c, jours: derniere[c.id] ? joursDepuis(derniere[c.id]) : null }))
    .filter(x => x.jours === null || x.jours >= SEUIL_RELANCE)
    .sort((a, b) => (b.jours ?? -1) - (a.jours ?? -1))

  return (
    <section className="tableau-de-bord">
      <h2>Vue d'ensemble</h2>
      <div className="stats">
        <div><strong>{actifs.length}</strong><span>clients actifs</span></div>
        <div><strong>{ceMois}</strong><span>séances ce mois-ci</span></div>
        <div><strong>{sept}</strong><span>séances sur 7 jours</span></div>
      </div>

      <div className="deux-colonnes">
        <div>
          <h3>À relancer</h3>
          <p className="meta">Clients sans séance depuis {SEUIL_RELANCE} jours ou plus.</p>
          {aRelancer.length ? (
            <ul className="liste">
              {aRelancer.map(({ c, jours }) => (
                <li key={c.id}>
                  <button type="button" className="ligne-client" onClick={() => onOuvrir(c.id)}>
                    <Avatar client={c} />
                    <span className="ligne-texte">
                      <strong>{c.prenom} {c.nom}</strong>
                      <span className="meta">{jours === null ? 'Aucune séance enregistrée' : `Dernière : ${ilYa(jours)}`}</span>
                    </span>
                  </button>
                  <button type="button" className="lien" onClick={() => onNouvelleSeance(c.id)}>+ Séance</button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="meta">Personne à relancer : tous tes clients ont eu une séance récemment. 👍</p>
          )}
        </div>

        <div>
          <h3>Activité récente</h3>
          {seances.length ? (
            <ul className="liste">
              {recentes.map(s => {
                const presents = s.participants.map(id => par[id]).filter(Boolean)
                return (
                  <li key={s.cle}>
                    <button type="button" className="ligne-client" onClick={() => onOuvrir(s.participants[0])}>
                      {presents[0] && <Avatar client={presents[0]} />}
                      <span className="ligne-texte">
                        <strong>{presents.map(c => `${c.prenom} ${c.nom ?? ''}`.trim()).join(' & ') || 'Client'}</strong>
                        <span className="meta">
                          {dateFr(s.date)}
                          {s.duree ? ` · ${s.duree} min` : ''}
                          {s.participants.length > 1 ? ` · ${libelleFormat(s.participants.length)}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="meta">Aucune séance enregistrée pour l'instant.</p>
          )}
        </div>
      </div>
    </section>
  )
}

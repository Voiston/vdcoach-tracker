import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { Avatar, EtatVide, MessageErreur, Squelette } from './ui'
import { FormulaireClient, type Client } from './Clients'
import { libelleFormat, regrouperSeances } from './facturation-lib'
import { dateFr, ilYa, joursDepuis } from './format'

type Resume = { id: string; client_id: string; date_seance: string; session_id: string | null }
type Tri = 'prenom' | 'recent' | 'relance'

const SEUIL_RELANCE = 21 // jours sans séance à partir desquels un client est « à relancer »
const SANS_SEANCE = 99_999 // valeur de tri pour un client qui n'a encore aucune séance

export default function Accueil({ onOuvrir, onNouvelleSeance, onVueEnsemble, actifId, rechargerQuand }: {
  onOuvrir: (clientId: string) => void
  onNouvelleSeance: (clientId: string) => void
  onVueEnsemble?: () => void
  actifId?: string
  rechargerQuand?: string
}) {
  const [clients, setClients] = useState<Client[]>([])
  const [seances, setSeances] = useState<Resume[]>([])
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [tri, setTri] = useState<Tri>('prenom')
  const [seulementRelance, setSeulementRelance] = useState(false)
  const [archives, setArchives] = useState(false)
  const [nouveau, setNouveau] = useState(false)

  async function charger() {
    const [c, s] = await Promise.all([
      supabase.from('clients').select('*').order('prenom'),
      supabase.from('seances').select('id, client_id, date_seance, session_id').order('date_seance', { ascending: false }).order('created_at', { ascending: false }).limit(1000),
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
  }, [rechargerQuand])

  const derniere: Record<string, string> = {}
  for (const s of seances) derniere[s.client_id] ??= s.date_seance
  const joursSansSeance = (id: string) => (derniere[id] ? joursDepuis(derniere[id]) : null)
  const doitRelancer = (c: Client) => {
    const jours = joursSansSeance(c.id)
    return jours === null || jours >= SEUIL_RELANCE
  }

  const debutMois = `${new Date().toLocaleDateString('sv-SE').slice(0, 7)}-01`
  const ceMois: Record<string, number> = {}
  for (const s of seances) if (s.date_seance >= debutMois) ceMois[s.client_id] = (ceMois[s.client_id] ?? 0) + 1
  const par = Object.fromEntries(clients.map(c => [c.id, c]))
  const recentes = [...regrouperSeances(seances)].reverse().slice(0, 5) // une séance partagée = une ligne

  const filtre = recherche.trim().toLowerCase()
  const correspond = (c: Client) => `${c.prenom} ${c.nom ?? ''}`.toLowerCase().includes(filtre)
  const trier = (liste: Client[]) => {
    const valeur = (c: Client) => joursSansSeance(c.id) ?? SANS_SEANCE
    if (tri === 'recent') return [...liste].sort((a, b) => valeur(a) - valeur(b))
    if (tri === 'relance') return [...liste].sort((a, b) => valeur(b) - valeur(a))
    return liste // déjà triés par prénom
  }
  const actifs = trier(clients.filter(c => c.actif && correspond(c) && (!seulementRelance || doitRelancer(c))))
  const inactifs = seulementRelance ? [] : clients.filter(c => !c.actif && correspond(c))
  const nbARelancer = clients.filter(c => c.actif && doitRelancer(c)).length

  const ligne = (c: Client) => (
    <li key={c.id} className={[c.actif ? '' : 'inactif', c.id === actifId ? 'actif' : ''].join(' ').trim()}>
      <button type="button" className="ligne-client" onClick={() => onOuvrir(c.id)}>
        <Avatar client={c} />
        <span className="ligne-texte">
          <strong>{c.prenom} {c.nom}{c.points_attention ? ' ⚠' : ''}</strong>
          <span className="meta">{derniere[c.id] ? `Dernière : ${ilYa(derniere[c.id])}` : 'Aucune séance'}</span>
          {ceMois[c.id] > 0 && <span className="meta">{ceMois[c.id]} séance{ceMois[c.id] > 1 ? 's' : ''} ce mois-ci</span>}
        </span>
      </button>
      {c.actif && <button type="button" className="lien action-seance" onClick={() => onNouvelleSeance(c.id)} aria-label={`Nouvelle séance pour ${c.prenom}`} title="Nouvelle séance"><span aria-hidden="true">+</span><span className="texte-action"> Séance</span></button>}
    </li>
  )

  return (
    <section>
      <h2>Clients</h2>
      <MessageErreur message={erreur} reessayer={charger} />

      {nouveau ? (
        <FormulaireClient onCree={id => { setNouveau(false); onOuvrir(id) }} onAnnuler={() => setNouveau(false)} />
      ) : (
        <div className="ligne">
          <button type="button" onClick={() => setNouveau(true)}>+ Nouveau client</button>
          {onVueEnsemble && (
            <button type="button" className="secondaire" onClick={onVueEnsemble}>⌂ Vue d'ensemble</button>
          )}
        </div>
      )}

      {!pret && !erreur && <Squelette lignes={4} />}
      {pret && !clients.length && !erreur && !nouveau && (
        <EtatVide titre="Aucun client pour l'instant" texte="Ajoute ton premier client pour commencer à suivre ses séances." />
      )}

      {pret && clients.length > 0 && (
        <>
          <div className="barre-clients">
            <input aria-label="Rechercher un client" placeholder="Rechercher un client…" value={recherche} onChange={e => setRecherche(e.target.value)} />
            <div className="filtres-clients">
              <button
                type="button"
                className={`puce-choix${seulementRelance ? ' actif' : ''}`}
                aria-pressed={seulementRelance}
                onClick={() => setSeulementRelance(v => !v)}
              >
                À relancer · {nbARelancer}
              </button>
              <select aria-label="Trier les clients" value={tri} onChange={e => setTri(e.target.value as Tri)}>
                <option value="prenom">Nom (A–Z)</option>
                <option value="recent">Vus récemment d'abord</option>
                <option value="relance">Vus il y a longtemps d'abord</option>
              </select>
            </div>
          </div>

          <ul className="liste">{actifs.map(ligne)}</ul>
          {!actifs.length && (
            <p className="meta">
              {seulementRelance && !filtre ? 'Tous tes clients ont eu une séance récemment. 👍' : 'Aucun client ne correspond.'}
            </p>
          )}

          {seances.length > 0 && !filtre && !actifId && !seulementRelance && (
            <div className="activite">
              <h3>Activité récente</h3>
              <ul className="liste">
                {recentes.map(s => {
                  const presents = s.participants.map(id => par[id]).filter(Boolean)
                  return (
                    <li key={s.cle}>
                      <button type="button" className="ligne-client" onClick={() => onOuvrir(s.participants[0])}>
                        {presents[0] && <Avatar client={presents[0]} />}
                        <span className="ligne-texte">
                          <strong>{presents.map(c => `${c.prenom} ${c.nom ?? ''}`.trim()).join(' & ') || 'Client'}</strong>
                          <span className="meta">{dateFr(s.date)}{s.participants.length > 1 ? ` · ${libelleFormat(s.participants.length)}` : ''}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {inactifs.length > 0 && (
            <>
              <button type="button" className="lien" onClick={() => setArchives(a => !a)}>
                {archives ? 'Masquer' : 'Afficher'} les clients archivés ({inactifs.length})
              </button>
              {archives && <ul className="liste">{inactifs.map(ligne)}</ul>}
            </>
          )}
        </>
      )}
    </section>
  )
}

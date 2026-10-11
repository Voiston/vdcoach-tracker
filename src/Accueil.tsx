import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { Avatar, EtatVide, MessageErreur, Squelette } from './ui'
import { FormulaireClient, type Client } from './Clients'
import { libelleFormat, regrouperSeances } from './facturation-lib'

type Resume = { id: string; client_id: string; date_seance: string; session_id: string | null }

const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
function ilYa(d: string) {
  const jours = Math.floor((Date.now() - Date.parse(d)) / 86_400_000)
  return jours <= 0 ? "aujourd'hui" : jours === 1 ? 'hier' : `il y a ${jours} jours`
}

export default function Accueil({ onOuvrir, onNouvelleSeance, actifId, rechargerQuand }: {
  onOuvrir: (clientId: string) => void
  onNouvelleSeance: (clientId: string) => void
  actifId?: string
  rechargerQuand?: string
}) {
  const [clients, setClients] = useState<Client[]>([])
  const [seances, setSeances] = useState<Resume[]>([])
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
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
  const debutMois = `${new Date().toLocaleDateString('sv-SE').slice(0, 7)}-01`
  const ceMois: Record<string, number> = {}
  for (const s of seances) if (s.date_seance >= debutMois) ceMois[s.client_id] = (ceMois[s.client_id] ?? 0) + 1
  const par = Object.fromEntries(clients.map(c => [c.id, c]))
  const recentes = [...regrouperSeances(seances)].reverse().slice(0, 5) // une séance partagée = une ligne
  const filtre = recherche.trim().toLowerCase()
  const correspond = (c: Client) => `${c.prenom} ${c.nom ?? ''}`.toLowerCase().includes(filtre)
  const actifs = clients.filter(c => c.actif && correspond(c))
  const inactifs = clients.filter(c => !c.actif && correspond(c))

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
      {c.actif && c.id !== actifId && <button type="button" className="lien action-seance" onClick={() => onNouvelleSeance(c.id)} aria-label={`Nouvelle séance pour ${c.prenom}`} title="Nouvelle séance"><span aria-hidden="true">+</span><span className="texte-action"> Séance</span></button>}
    </li>
  )

  return (
    <section>
      <h2>Clients</h2>
      <MessageErreur message={erreur} reessayer={charger} />

      {nouveau ? (
        <FormulaireClient onCree={id => { setNouveau(false); onOuvrir(id) }} onAnnuler={() => setNouveau(false)} />
      ) : (
        <button type="button" onClick={() => setNouveau(true)}>+ Nouveau client</button>
      )}

      {!pret && !erreur && <Squelette lignes={4} />}
      {pret && !clients.length && !erreur && !nouveau && (
        <EtatVide titre="Aucun client pour l'instant" texte="Ajoute ton premier client pour commencer à suivre ses séances." />
      )}

      {pret && clients.length > 0 && (
        <>
          {clients.length > 6 && (
            <input aria-label="Rechercher un client" placeholder="Rechercher un client…" value={recherche} onChange={e => setRecherche(e.target.value)} style={{ marginTop: '1rem' }} />
          )}
          <ul className="liste">{actifs.map(ligne)}</ul>
          {!actifs.length && <p className="meta">Aucun client ne correspond.</p>}

          {seances.length > 0 && !filtre && !actifId && (
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

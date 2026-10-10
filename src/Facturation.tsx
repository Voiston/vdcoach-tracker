import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { EtatVide, MessageErreur, Squelette, useNotifier } from './ui'
import {
  bornesMois, calculerFacturation, decalerMois, detailFormats, libelleFormat, libelleMois, moisCourant, regrouperSeances,
  type ClientFact, type Entite, type LigneSeance,
} from './facturation-lib'

const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const jourMois = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

export default function Facturation({ onOuvrir }: { onOuvrir: (clientId: string) => void }) {
  const notifier = useNotifier()
  const [mois, setMois] = useState(moisCourant())
  const [clients, setClients] = useState<ClientFact[]>([])
  const [lignes, setLignes] = useState<LigneSeance[]>([])
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')

  async function charger() {
    const { debut, fin } = bornesMois(mois)
    const [c, s] = await Promise.all([
      supabase.from('clients').select('id, prenom, nom, actif, groupe_facturation').order('prenom'),
      supabase.from('seances').select('id, client_id, date_seance, session_id').gte('date_seance', debut).lt('date_seance', fin).order('date_seance'),
    ])
    setPret(true)
    const err = c.error ?? s.error
    if (err) return setErreur(messageErreur(err))
    setErreur('')
    setClients(c.data as ClientFact[])
    setLignes(s.data as LigneSeance[])
  }

  useEffect(() => {
    setPret(false)
    charger()
  }, [mois])

  const prenomDe = (id: string) => clients.find(c => c.id === id)?.prenom ?? '?'
  const entites = calculerFacturation(clients, lignes)
  const seances = regrouperSeances(lignes)
  const partagees = seances.filter(s => s.participants.length > 1).length
  const moisLibelle = libelleMois(mois)

  // Participants d'une séance, avec le prénom du seul présent pour un solo dans un groupe
  const participants = (e: Entite, ids: string[]) => ids.map(prenomDe).join(' & ') || e.nom

  function recapitulatif(e: Entite) {
    const dates = e.seances.map(s => `${jourMois(s.date)} ${libelleFormat(s.participants.length)}${s.participants.length === 1 && e.membres.length > 1 ? ` ${prenomDe(s.participants[0])}` : ''}`)
    return `${e.nom} — ${moisLibelle}\n${pluriel(e.seances.length, 'séance')} : ${detailFormats(e)}\nDates : ${dates.join(', ')}`
  }

  async function copier(e: Entite) {
    try {
      await navigator.clipboard.writeText(recapitulatif(e))
      notifier('Récapitulatif copié')
    } catch {
      notifier('Copie impossible depuis ce navigateur.')
    }
  }

  function exporter() {
    const cellule = (v: string) => `"${v.replace(/"/g, '""')}"`
    const lignesCsv = entites.flatMap(e =>
      e.seances.map(s => [e.nom, s.date, libelleFormat(s.participants.length), s.participants.map(prenomDe).join(' & ')].map(cellule).join(';')),
    )
    const contenu = '\uFEFF' + [['facturation', 'date', 'format', 'participants'].join(';'), ...lignesCsv].join('\r\n')
    const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `facturation-${mois}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section>
      <h2>Facturation</h2>
      <div className="navigation-mois">
        <button type="button" className="secondaire" aria-label="Mois précédent" onClick={() => setMois(m => decalerMois(m, -1))}>←</button>
        <h3 aria-live="polite">{moisLibelle}</h3>
        <button type="button" className="secondaire" aria-label="Mois suivant" disabled={mois >= moisCourant()} onClick={() => setMois(m => decalerMois(m, 1))}>→</button>
      </div>
      <MessageErreur message={erreur} reessayer={charger} />
      {!pret && !erreur && <Squelette lignes={4} />}

      {pret && !erreur && (
        <>
          {entites.length === 0 ? (
            <EtatVide titre={`Aucune séance en ${moisLibelle}`} texte="Les séances enregistrées pendant ce mois apparaîtront ici, regroupées par client ou par couple." />
          ) : (
            <>
              <div className="stats">
                <div><strong>{seances.length}</strong><span>séances réalisées</span></div>
                <div><strong>{entites.length}</strong><span>à facturer</span></div>
                <div><strong>{partagees}</strong><span>séances partagées</span></div>
              </div>

              <ul className="liste facturation">
                {entites.map(e => (
                  <li key={e.cle}>
                    <details>
                      <summary>
                        <span className="fact-nom">
                          <strong>{e.nom}</strong>
                          <span className="meta">{detailFormats(e)}</span>
                        </span>
                        <b className="fact-total">{e.seances.length}<small> séance{e.seances.length > 1 ? 's' : ''}</small></b>
                      </summary>
                      <ul className="fact-detail">
                        {e.seances.map(s => (
                          <li key={s.cle}>
                            <span>{dateFr(s.date)} · {participants(e, s.participants)}</span>
                            <span className="puce neutre">{libelleFormat(s.participants.length)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="ligne">
                        <button type="button" className="secondaire" onClick={() => copier(e)}>Copier le récapitulatif</button>
                        <button type="button" className="lien" onClick={() => onOuvrir(e.membres[0].id)}>Ouvrir le profil</button>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
              <p className="meta">Une séance partagée (couple, trio) compte pour une seule séance. Le format vient du nombre de personnes présentes.</p>
              <button type="button" className="secondaire" onClick={exporter}>Exporter le mois (CSV)</button>
            </>
          )}
        </>
      )}
    </section>
  )
}

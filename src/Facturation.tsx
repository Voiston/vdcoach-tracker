import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { EtatVide, MessageErreur, Squelette, useNotifier } from './ui'
import {
  bornesMois, calculerFacturation, decalerMois, detailFormats, libelleFormat, libelleMois, moisCourant, regrouperSeances,
  type ClientFact, type Entite, type LigneSeance,
} from './facturation-lib'

type StatutFacture = 'a_emettre' | 'emise' | 'payee'

const ORDRE_STATUTS: StatutFacture[] = ['a_emettre', 'emise', 'payee']
const LIBELLES_STATUTS: Record<StatutFacture, string> = {
  a_emettre: 'À émettre',
  emise: 'Émise',
  payee: 'Payée ✓',
}

const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const jourMois = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? 's' : ''}`

function chargerStatutsMois(mois: string): Record<string, StatutFacture> {
  try {
    const brut = localStorage.getItem(`vdcoach_factures_${mois}`)
    return brut ? (JSON.parse(brut) as Record<string, StatutFacture>) : {}
  } catch {
    return {}
  }
}

export default function Facturation({ onOuvrir }: { onOuvrir: (clientId: string) => void }) {
  const notifier = useNotifier()
  const [mois, setMois] = useState(moisCourant())
  const [clients, setClients] = useState<ClientFact[]>([])
  const [lignes, setLignes] = useState<LigneSeance[]>([])
  const [statuts, setStatuts] = useState<Record<string, StatutFacture>>(() => chargerStatutsMois(moisCourant()))
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
    setStatuts(chargerStatutsMois(mois))
    charger()
  }, [mois])

  function basculerStatut(cle: string, ev: React.MouseEvent) {
    ev.preventDefault()
    ev.stopPropagation()
    const actuel = statuts[cle] ?? 'a_emettre'
    const suivant = ORDRE_STATUTS[(ORDRE_STATUTS.indexOf(actuel) + 1) % ORDRE_STATUTS.length]
    const nouveaux = { ...statuts, [cle]: suivant }
    setStatuts(nouveaux)
    try {
      localStorage.setItem(`vdcoach_factures_${mois}`, JSON.stringify(nouveaux))
    } catch {
      // Ignore si stockage privé plein
    }
  }

  const prenomDe = (id: string) => clients.find(c => c.id === id)?.prenom ?? '?'
  const entites = calculerFacturation(clients, lignes)
  const seances = regrouperSeances(lignes)
  const partagees = seances.filter(s => s.participants.length > 1).length
  const restantesAEmettre = entites.filter(e => (statuts[e.cle] ?? 'a_emettre') === 'a_emettre').length
  const moisLibelle = libelleMois(mois)

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
    const cellule = (v: string) => {
      const s = String(v ?? '')
      const safe = /^[=+\-@]/.test(s) ? `'${s}` : s
      return `"${safe.replace(/"/g, '""')}"`
    }
    const lignesCsv = entites.flatMap(e => {
      const statutTxt = LIBELLES_STATUTS[statuts[e.cle] ?? 'a_emettre'].replace(' ✓', '')
      return e.seances.map(s =>
        [e.nom, statutTxt, s.date, libelleFormat(s.participants.length), s.participants.map(prenomDe).join(' & ')]
          .map(cellule)
          .join(';'),
      )
    })
    const contenu = '\uFEFF' + [['facturation', 'statut', 'date', 'format', 'participants'].join(';'), ...lignesCsv].join('\r\n')
    const url = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `facturation-${mois}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const parFormat = new Map<number, number>()
  for (const s of seances) parFormat.set(s.participants.length, (parFormat.get(s.participants.length) ?? 0) + 1)
  const repartition = [...parFormat.entries()].sort((a, b) => a[0] - b[0]).map(([n, c]) => `${c} ${libelleFormat(n)}`).join(' · ')

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
                <div>
                  <strong>{seances.length}</strong>
                  <span>{seances.length > 1 ? 'séances réalisées' : 'séance réalisée'}</span>
                </div>
                <div>
                  <strong>{restantesAEmettre}</strong>
                  <span>{restantesAEmettre > 1 ? 'factures à émettre' : 'facture à émettre'}</span>
                </div>
                <div>
                  <strong>{partagees}</strong>
                  <span>{partagees > 1 ? 'séances partagées' : 'séance partagée'}</span>
                </div>
              </div>

              {repartition && <p className="meta">Sur le mois : {repartition} · Clique sur le badge de statut d'une ligne pour le faire évoluer.</p>}
              <ul className="liste facturation">
                {entites.map(e => {
                  const statut = statuts[e.cle] ?? 'a_emettre'
                  return (
                    <li key={e.cle}>
                      <details>
                        <summary>
                          <span className="fact-nom">
                            <strong>{e.nom}</strong>
                            <span className="meta">{detailFormats(e)}</span>
                          </span>
                          <button
                            type="button"
                            className={`badge-facture ${statut}`}
                            title="Cliquer pour changer le statut (À émettre → Émise → Payée)"
                            onClick={ev => basculerStatut(e.cle, ev)}
                          >
                            {LIBELLES_STATUTS[statut]}
                          </button>
                          <b className="fact-total">
                            {e.seances.length}
                            <small> séance{e.seances.length > 1 ? 's' : ''}</small>
                          </b>
                          <span className="chevron" aria-hidden="true">›</span>
                        </summary>
                        <ul className="fact-detail">
                          {e.seances.map(s => (
                            <li key={s.cle}>
                              <span>{dateFr(s.date)} · {participants(e, s.participants)}</span>
                              <span className="puce neutre">{libelleFormat(s.participants.length)}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="ligne pied-carte">
                          <button type="button" className="secondaire btn-compact" onClick={() => copier(e)}>
                            Copier le récapitulatif
                          </button>
                          <button type="button" className="lien" onClick={() => onOuvrir(e.membres[0].id)}>
                            Ouvrir le profil →
                          </button>
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ul>
              <div className="pied-facturation">
                <p className="meta">Une séance partagée (couple, trio) compte pour une seule séance. Le format vient du nombre de personnes présentes.</p>
                <button type="button" className="secondaire" onClick={exporter}>Exporter le mois (CSV)</button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
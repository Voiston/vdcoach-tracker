import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { REGLES, verifier } from './validation'
import { messageErreur } from './erreurs'
import { Champ, ErreurChargement, EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useAller, useClient, useNotifier, useOccupe } from './ui'
import './suivi.css'
import { TYPES } from './definitions'

const MAX_REPS_1RM = 12 // au-delà, la formule d'Epley est peu fiable : on ignore la série

type Mesure = { id: string; date_mesure: string; type: string; valeur: number }
type SeanceExo = { date_seance: string; exercices: { nom: string; series: number | null; charge_kg: number | null; repetitions: number | null }[] }
type Point = { date: string; valeur: number }

const courte = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })

function ilYa(d: string) {
  const jours = Math.floor((Date.now() - Date.parse(d)) / 86_400_000)
  return jours <= 0 ? "aujourd'hui" : jours === 1 ? 'hier' : `il y a ${jours} j`
}

function Courbe({ points, unite }: { points: Point[]; unite: string }) {
  if (points.length < 2)
    return (
      <div className="courbe-vide">
        {points.length > 0 && <strong>{points[0].valeur} {unite}</strong>}
        <span>{points.length ? 'Une seule valeur pour l’instant : la courbe apparaît dès la deuxième.' : 'Pas encore de données.'}</span>
      </div>
    )

  const W = 320, H = 150, P = 28
  const t = points.map(p => Date.parse(p.date))
  const v = points.map(p => p.valeur)
  const [t0, t1] = [Math.min(...t), Math.max(...t)]
  const [lo, hi] = [Math.min(...v), Math.max(...v)]
  const [v0, v1] = lo === hi ? [lo - 1, hi + 1] : [lo, hi]
  const x = (ms: number) => P + ((ms - t0) / (t1 - t0 || 1)) * (W - 2 * P)
  const y = (val: number) => H - P - ((val - v0) / (v1 - v0)) * (H - 2 * P)
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(t[i]).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(' ')
  const delta = v[v.length - 1] - v[0]

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="courbe" role="img" aria-label="Courbe de progression">
        <line x1={P} y1={H - P} x2={W - P} y2={H - P} className="axe" />
        <path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => <circle key={i} cx={x(t[i])} cy={y(p.valeur)} r="3" fill="currentColor" />)}
        <text x={2} y={y(v1) + 4} fontSize="10">{hi}</text>
        <text x={2} y={y(v0) + 4} fontSize="10">{lo}</text>
        <text x={P} y={H - 8} fontSize="10">{courte(points[0].date)}</text>
        <text x={W - P} y={H - 8} fontSize="10" textAnchor="end">{courte(points[points.length - 1].date)}</text>
      </svg>
      <p className="meta">{delta > 0 ? '+' : ''}{+delta.toFixed(1)} {unite} depuis le {courte(points[0].date)}</p>
    </div>
  )
}

export default function Suivi() {
  const [pret, setPret] = useState(false)
  const clientId = useClient().id
  const [mesures, setMesures] = useState<Mesure[]>([])
  const [seances, setSeances] = useState<SeanceExo[]>([])
  const [type, setType] = useState('poids')
  const [valeur, setValeur] = useState('')
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [exo, setExo] = useState('')
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()
  const notifier = useNotifier()
  const aller = useAller()
  const [masquees, setMasquees] = useState<string[]>([])

  async function charger() {
    if (!clientId) return
    const [m, s] = await Promise.all([
      supabase.from('mesures').select('*').eq('client_id', clientId).order('date_mesure'),
      supabase.from('seances').select('date_seance, exercices(nom, series, charge_kg, repetitions)').eq('client_id', clientId).order('date_seance'),
    ])
    setPret(true)
    const err = m.error ?? s.error
    if (err) return setErreur(messageErreur(err))
    setErreur('')
    setMesures(m.data as Mesure[])
    setSeances(s.data as unknown as SeanceExo[])
  }

  useEffect(() => {
    setPret(false)
    charger()
  }, [clientId])

  async function ajouter(e: React.FormEvent) {
    e.preventDefault()
    const v = Number(valeur.replace(',', '.'))
    if (!valeur.trim() || Number.isNaN(v)) return setErreur('Valeur invalide.')
    const { error } = await supabase
      .from('mesures')
      .insert({ client_id: clientId, date_mesure: date, type, valeur: v, unite: TYPES[type].unite })
    if (error) return setErreur(messageErreur(error))
    setValeur('')
    charger()
    notifier('Mesure ajoutée')
  }

  function supprimer(m: Mesure) {
    supprimerAvecAnnulation({
      notifier,
      message: `Mesure du ${courte(m.date_mesure)} supprimée`,
      masquer: () => setMasquees(l => [...l, m.id]),
      restaurer: () => setMasquees(l => l.filter(id => id !== m.id)),
      effacer: async () => {
        const { error } = await supabase.from('mesures').delete().eq('id', m.id)
        if (!error) charger()
        return error
      },
    })
  }

  // Exercices pour lesquels une charge a été saisie, et meilleure charge par séance
  const noms = [...new Set(seances.flatMap(s => s.exercices.filter(x => x.charge_kg !== null).map(x => x.nom)))].sort()
  const exoChoisi = noms.includes(exo) ? exo : noms[0] ?? ''
  const pointsCharge: Point[] = seances.flatMap(s => {
    const charges = s.exercices.filter(x => x.nom === exoChoisi && x.charge_kg !== null).map(x => Number(x.charge_kg))
    return charges.length ? [{ date: s.date_seance, valeur: Math.max(...charges) }] : []
  })
  const mesuresType = mesures.filter(m => m.type === type)
  const pointsMesure = mesuresType.map(m => ({ date: m.date_mesure, valeur: Number(m.valeur) }))
  const moisCourant = new Date().toLocaleDateString('sv-SE').slice(0, 7)
  const ceMois = seances.filter(s => s.date_seance.startsWith(moisCourant)).length

  // 1RM estimée (formule d'Epley) pour une série donnée
  const e1rm = (x: { charge_kg: number | null; repetitions: number | null }) =>
    x.charge_kg === null || x.repetitions === null || x.repetitions < 1 || x.repetitions > MAX_REPS_1RM
      ? null
      : x.repetitions === 1 ? Number(x.charge_kg) : Number(x.charge_kg) * (1 + x.repetitions / 30)
  const arrondi = (n: number) => Math.round(n * 10) / 10
  const points1rm: Point[] = seances.flatMap(s => {
    const v = s.exercices.filter(x => x.nom === exoChoisi).map(e1rm).filter((n): n is number => n !== null)
    return v.length ? [{ date: s.date_seance, valeur: arrondi(Math.max(...v)) }] : []
  })
  const records = noms.map(nom => {
    let charge = { valeur: 0, date: '' }
    let force = { valeur: 0, date: '' }
    for (const s of seances)
      for (const x of s.exercices) {
        if (x.nom !== nom) continue
        if (x.charge_kg !== null && Number(x.charge_kg) > charge.valeur) charge = { valeur: Number(x.charge_kg), date: s.date_seance }
        const f = e1rm(x)
        if (f !== null && f > force.valeur) force = { valeur: arrondi(f), date: s.date_seance }
      }
    return { nom, charge, force }
  })

  return (
    <section>
      <MessageErreur message={erreur} reessayer={charger} />

      {!pret && <Squelette lignes={3} />}
      <div hidden={!pret}>
      <div className="stats">
        <div><strong>{seances.length}</strong><span>séances</span></div>
        <div><strong>{ceMois}</strong><span>ce mois-ci</span></div>
        <div><strong className="texte" title={seances.length ? courte(seances[seances.length - 1].date_seance) : undefined}>{seances.length ? ilYa(seances[seances.length - 1].date_seance) : '—'}</strong><span>dernière séance</span></div>
      </div>

      <div className="deux-colonnes">
      <div>
      <h3>Charges</h3>
      {noms.length ? (
        <>
          <select aria-label="Exercice" value={exoChoisi} onChange={e => setExo(e.target.value)}>
            {noms.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <h4 className="sous-titre">Charge maximale par séance</h4>
          <Courbe points={pointsCharge} unite="kg" />
          <h4 className="sous-titre">Force maximale estimée (1RM)</h4>
          <p className="meta">Formule d’Epley, séries de 12 répétitions maximum.</p>
          <Courbe points={points1rm} unite="kg" />
        </>
      ) : (
        <p className="meta">Aucune charge enregistrée pour ce client.</p>
      )}

      <h3>Records</h3>
      {records.length ? (
        <ul className="liste">
          {records.map(r => (
            <li key={r.nom}>
              <div>
                <strong>{r.nom}</strong>
                <p>🏆 {r.charge.valeur} kg <span className="meta">({courte(r.charge.date)})</span></p>
                {r.force.valeur > 0 && <p className="meta">1RM estimée : {r.force.valeur} kg</p>}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="meta">Aucun record pour l'instant.</p>
      )}

      </div>
      <div>
      <h3>Mesures</h3>
      <select aria-label="Type de mesure" value={type} onChange={e => setType(e.target.value)}>
        {Object.entries(TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
      </select>
      <Courbe points={pointsMesure} unite={TYPES[type].unite} />
      <form onSubmit={e => lancer(() => ajouter(e))}>
        <div className="ligne">
          <Champ libelle="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></Champ>
          <Champ libelle={`Valeur (${TYPES[type].unite})`} erreur={verifier(valeur, REGLES.mesure)}><input inputMode="decimal" value={valeur} onChange={e => setValeur(e.target.value)} /></Champ>
        </div>
        <button type="submit" disabled={occupe || Boolean(verifier(valeur, REGLES.mesure))}>{occupe ? 'Ajout en cours…' : 'Ajouter la mesure'}</button>
      </form>
      <ul className="liste">
        {[...mesuresType].filter(m => !masquees.includes(m.id)).reverse().slice(0, 5).map(m => (
          <li key={m.id}>
            <span>{courte(m.date_mesure)} — <strong>{m.valeur} {TYPES[type].unite}</strong></span>
            <button className="lien danger" onClick={() => supprimer(m)}>Supprimer</button>
          </li>
        ))}
      </ul>
      </div>
      </div>
      </div>
    </section>
  )
}

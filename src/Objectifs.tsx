import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Client } from './Clients'
import { TYPES, TESTS } from './definitions'
import { lireClient, memoriserClient } from './client-courant'

type Source = 'mesure' | 'charge' | 'test'
type Objectif = { id: string; source: Source; reference: string; valeur_depart: number; valeur_cible: number; echeance: string | null }

const SOURCES: Record<Source, string> = { mesure: 'Mesure corporelle', charge: 'Charge sur un exercice', test: 'Test physique' }
const unite = (s: Source, ref: string) => (s === 'mesure' ? TYPES[ref]?.unite : s === 'test' ? TESTS[ref]?.unite : 'kg') ?? ''
const libelle = (s: Source, ref: string) => (s === 'mesure' ? TYPES[ref]?.label : s === 'test' ? TESTS[ref]?.label : ref) ?? ref
const nombre = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))

export default function Objectifs() {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [objectifs, setObjectifs] = useState<Objectif[]>([])
  const [derniereMesure, setDerniereMesure] = useState<Record<string, number>>({}) // type → dernière valeur
  const [meilleureCharge, setMeilleureCharge] = useState<Record<string, number>>({}) // exercice (minuscules) → charge max
  const [noms, setNoms] = useState<string[]>([])
  const [source, setSource] = useState<Source>('mesure')
  const [ref, setRef] = useState('poids')
  const [depart, setDepart] = useState('')
  const [cible, setCible] = useState('')
  const [echeance, setEcheance] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    supabase.from('clients').select('*').order('prenom').then(({ data }) => {
      setClients(data ?? [])
      if (data?.length) setClientId(data.some(c => c.id === lireClient()) ? lireClient() : data[0].id)
    })
    supabase.from('bibliotheque_exercices').select('nom').then(({ data }) =>
      setNoms(prec => [...new Set([...prec, ...(data ?? []).map(x => x.nom as string)])].sort()))
  }, [])

  async function charger() {
    if (!clientId) return
    const [o, m, s] = await Promise.all([
      supabase.from('objectifs').select('*').eq('client_id', clientId).order('created_at'),
      supabase.from('mesures').select('type, valeur').eq('client_id', clientId).order('date_mesure'),
      supabase.from('seances').select('exercices(nom, charge_kg)').eq('client_id', clientId),
    ])
    const err = o.error ?? m.error ?? s.error
    if (err) return setErreur(err.message)
    setErreur('')
    setObjectifs(o.data as Objectif[])
    const dernieres: Record<string, number> = {}
    for (const x of m.data ?? []) dernieres[x.type] = Number(x.valeur) // trié par date : la dernière écrase
    setDerniereMesure(dernieres)
    const charges: Record<string, number> = {}
    const vus: string[] = []
    for (const seance of (s.data ?? []) as any[])
      for (const x of seance.exercices) {
        if (x.charge_kg === null) continue
        const k = String(x.nom).trim().toLowerCase()
        charges[k] = Math.max(charges[k] ?? 0, Number(x.charge_kg))
        vus.push(String(x.nom).trim())
      }
    setMeilleureCharge(charges)
    setNoms(prec => [...new Set([...prec, ...vus])].sort())
  }

  useEffect(() => {
    charger()
  }, [clientId])

  const actuelle = (s: Source, r: string): number | null =>
    (s === 'charge' ? meilleureCharge[r.trim().toLowerCase()] : derniereMesure[r]) ?? null

  // Propose la valeur actuelle comme point de départ (modifiable)
  function viser(s: Source, r: string) {
    setSource(s)
    setRef(r)
    const v = actuelle(s, r)
    setDepart(v === null ? '' : String(v))
  }

  function changerSource(s: Source) {
    viser(s, s === 'charge' ? '' : Object.keys(s === 'mesure' ? TYPES : TESTS)[0])
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault()
    const dep = nombre(depart)
    const cib = nombre(cible)
    if (!ref.trim() || Number.isNaN(dep) || Number.isNaN(cib)) return setErreur('Complète la référence, le départ et la cible.')
    if (dep === cib) return setErreur('Le départ et la cible doivent être différents.')
    const { error } = await supabase
      .from('objectifs')
      .insert({ client_id: clientId, source, reference: ref.trim(), valeur_depart: dep, valeur_cible: cib, echeance: echeance || null })
    if (error) return setErreur(error.message)
    setCible('')
    setEcheance('')
    setErreur('')
    charger()
  }

  async function supprimer(o: Objectif) {
    if (!window.confirm(`Supprimer l'objectif « ${libelle(o.source, o.reference)} » ?`)) return
    const { error } = await supabase.from('objectifs').delete().eq('id', o.id)
    if (error) setErreur(error.message)
    else charger()
  }

  if (!clients.length) return <p className="centre">Ajoute d'abord un client dans l'onglet « Clients ».</p>

  return (
    <section>
      <h2>Objectifs</h2>
      <select value={clientId} onChange={e => { setClientId(e.target.value); memoriserClient(e.target.value) }}>
        {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}{c.actif ? '' : ' (archivé)'}</option>)}
      </select>
      {erreur && <p className="erreur">{erreur}</p>}

      <ul className="liste">
        {objectifs.map(o => {
          const act = actuelle(o.source, o.reference)
          const total = o.valeur_cible - o.valeur_depart
          const pct = act === null ? 0 : Math.max(0, Math.min(100, ((act - o.valeur_depart) / total) * 100))
          const atteint = act !== null && (total > 0 ? act >= o.valeur_cible : act <= o.valeur_cible)
          const u = unite(o.source, o.reference)
          const reste = o.echeance ? Math.ceil((Date.parse(o.echeance) - Date.now()) / 86_400_000) : null
          return (
            <li key={o.id}>
              <div className="objectif">
                <strong>{libelle(o.source, o.reference)}</strong>
                <p className="meta">
                  {Number(o.valeur_depart)} → <b>{act ?? '?'}</b> → {Number(o.valeur_cible)} {u}
                </p>
                <div className={`jauge ${atteint ? 'atteint' : ''}`}><i style={{ width: `${pct}%` }} /></div>
                <p className="meta">
                  {Math.round(pct)} %
                  {atteint ? ' · 🎯 Atteint' : reste === null ? '' : reste >= 0 ? ` · ${reste} jour(s) restant(s)` : ` · échéance dépassée de ${-reste} j`}
                </p>
              </div>
              <button className="lien" onClick={() => supprimer(o)}>Supprimer</button>
            </li>
          )
        })}
      </ul>
      {!objectifs.length && <p className="meta">Aucun objectif pour ce client.</p>}

      <h3>Nouvel objectif</h3>
      <form onSubmit={ajouter}>
        <select value={source} onChange={e => changerSource(e.target.value as Source)}>
          {(Object.keys(SOURCES) as Source[]).map(s => <option key={s} value={s}>{SOURCES[s]}</option>)}
        </select>
        {source === 'charge' ? (
          <>
            <input list="noms-objectifs" placeholder="Exercice (ex. Squat goblet)" value={ref} onChange={e => viser('charge', e.target.value)} />
            <datalist id="noms-objectifs">{noms.map(n => <option key={n} value={n} />)}</datalist>
          </>
        ) : (
          <select value={ref} onChange={e => viser(source, e.target.value)}>
            {Object.entries(source === 'mesure' ? TYPES : TESTS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        )}
        <div className="ligne">
          <input inputMode="decimal" placeholder={`Départ (${unite(source, ref)})`} value={depart} onChange={e => setDepart(e.target.value)} />
          <input inputMode="decimal" placeholder={`Cible (${unite(source, ref)})`} value={cible} onChange={e => setCible(e.target.value)} />
        </div>
        <input type="date" value={echeance} onChange={e => setEcheance(e.target.value)} />
        <p className="meta">Le départ est proposé d'après les données du client ; l'échéance est facultative.</p>
        <button type="submit">Ajouter l'objectif</button>
      </form>
    </section>
  )
}

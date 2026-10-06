import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { Squelette } from './ui'
import type { Client } from './Clients'

type Ligne = { nom: string; series: string; repetitions: string; charge_kg: string }
type Exo = { id: string; ordre: number; nom: string; series: number | null; repetitions: number | null; charge_kg: number | null }

const vide = (): Ligne => ({ nom: '', series: '', repetitions: '', charge_kg: '' })
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))
const txt = (n: number | null) => (n === null ? '' : String(n))
const versLignes = (exos: Exo[]): Ligne[] =>
  exos.length
    ? [...exos]
        .sort((a, b) => a.ordre - b.ordre)
        .map(x => ({ nom: x.nom, series: txt(x.series), repetitions: txt(x.repetitions), charge_kg: txt(x.charge_kg) }))
    : [vide()]

const EXOS = 'exercices(id, ordre, nom, series, repetitions, charge_kg)'

// Règle de progression simple (double progression) : à modifier selon ta façon de coacher.
const PLAFOND_REPS = 12 // à partir de ce nombre de répétitions, on suggère d'augmenter la charge
const PAS_KG = 2.5 // augmentation de charge suggérée

type Dernier = { date: string; series: number | null; repetitions: number | null; charge_kg: number | null }
const cle = (nom: string) => nom.trim().toLowerCase()
const echapper = (nom: string) => nom.replace(/[\\%_]/g, '\\$&') // pour ilike

function suggestion(d: Dernier): string {
  if (d.repetitions === null) return ''
  if (d.charge_kg !== null && d.repetitions >= PLAFOND_REPS) return `essaie ${+(Number(d.charge_kg) + PAS_KG).toFixed(2)} kg`
  return `vise ${d.repetitions + 1} répétitions${d.charge_kg !== null ? ` à ${d.charge_kg} kg` : ''}`
}

function DerniereFois({ d }: { d: Dernier }) {
  const conseil = suggestion(d)
  return (
    <p className="meta">
      Dernière fois ({new Date(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}) : {d.series ?? '?'}×{d.repetitions ?? '?'}
      {d.charge_kg !== null ? ` à ${d.charge_kg} kg` : ''}
      {conseil ? ` · ${conseil}` : ''}
    </p>
  )
}

type Fiche = { nom: string; notes: string | null; video_url: string | null }

function FicheExercice({ b }: { b: Fiche }) {
  const lien = b.video_url && /^https?:\/\//i.test(b.video_url) ? b.video_url : null
  if (!b.notes && !lien) return null
  return (
    <p className="meta">
      {b.notes}
      {b.notes && lien ? ' · ' : ''}
      {lien && <a href={lien} target="_blank" rel="noopener noreferrer">Vidéo</a>}
    </p>
  )
}

export default function NouvelleSeance({ seanceId, onSaved }: { seanceId: string | null; onSaved: (message?: string) => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [clientsPrets, setClientsPrets] = useState(false)
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [duree, setDuree] = useState('')
  const [ressenti, setRessenti] = useState('')
  const [notes, setNotes] = useState('')
  const [lignes, setLignes] = useState<Ligne[]>([vide()])
  const [anciens, setAnciens] = useState<string[]>([]) // exercices existants (mode modification)
  const [noms, setNoms] = useState<string[]>([]) // suggestions
  const [modeles, setModeles] = useState<{ id: string; nom: string }[]>([])
  const [derniers, setDerniers] = useState<Record<string, Dernier>>({})
  const [biblio, setBiblio] = useState<Record<string, Fiche>>({})
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    // En modification, on charge aussi les clients archivés.
    let q = supabase.from('clients').select('*')
    if (!seanceId) q = q.eq('actif', true)
    q.order('prenom').then(({ data }) => {
      setClients(data ?? [])
      setClientsPrets(true)
      if (!seanceId && data?.length) setClientId(data[0].id)
    })

    supabase
      .from('exercices')
      .select('nom')
      .limit(1000)
      .then(({ data }) => setNoms([...new Set((data ?? []).map(x => x.nom as string))].sort()))

    if (seanceId) {
      supabase
        .from('seances')
        .select(`client_id, date_seance, duree_min, ressenti, notes, ${EXOS}`)
        .eq('id', seanceId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) return setErreur(error?.message ?? 'Séance introuvable.')
          setClientId(data.client_id)
          setDate(data.date_seance)
          setDuree(txt(data.duree_min))
          setRessenti(txt(data.ressenti))
          setNotes(data.notes ?? '')
          setLignes(versLignes(data.exercices as Exo[]))
          setAnciens((data.exercices as Exo[]).map(x => x.id))
        })
    }
  }, [seanceId])

  useEffect(() => {
    supabase.from('modeles').select('id, nom').order('nom').then(({ data }) => setModeles(data ?? []))
  }, [])

  async function appliquerModele(id: string) {
    if (!id) return
    const { data, error } = await supabase
      .from('modeles')
      .select('duree_min, modele_exercices(id, ordre, nom, series, repetitions, charge_kg)')
      .eq('id', id)
      .single()
    if (error || !data) return setErreur(error?.message ?? 'Modèle introuvable.')
    setLignes(versLignes(data.modele_exercices as Exo[]))
    if (data.duree_min) setDuree(txt(data.duree_min))
    setErreur('')
  }

  async function enregistrerModele() {
    const exos = lignes.filter(l => l.nom.trim())
    if (!exos.length) return setErreur('Ajoute au moins un exercice pour créer un modèle.')
    const nom = window.prompt('Nom du modèle (ex. Full body A) :')?.trim()
    if (!nom) return
    const { data, error } = await supabase.from('modeles').insert({ nom, duree_min: num(duree) }).select('id, nom').single()
    if (error) return setErreur(error.message)
    const { error: erreurExos } = await supabase.from('modele_exercices').insert(
      exos.map((l, i) => ({
        modele_id: data.id,
        ordre: i,
        nom: l.nom.trim(),
        series: num(l.series),
        repetitions: num(l.repetitions),
        charge_kg: num(l.charge_kg),
      })),
    )
    if (erreurExos) {
      await supabase.from('modeles').delete().eq('id', data.id)
      return setErreur(erreurExos.message)
    }
    setModeles(m => [...m, data].sort((a, b) => a.nom.localeCompare(b.nom)))
    setErreur('')
  }

  useEffect(() => {
    supabase
      .from('bibliotheque_exercices')
      .select('nom, notes, video_url')
      .then(({ data }) => setBiblio(Object.fromEntries((data ?? []).map(x => [cle(x.nom), x as Fiche]))))
  }, [])

  // Dernière performance de ce client pour chaque exercice (hors séance en cours de modification)
  useEffect(() => {
    if (!clientId) return
    supabase
      .from('seances')
      .select('id, date_seance, exercices(nom, series, repetitions, charge_kg)')
      .eq('client_id', clientId)
      .lte('date_seance', date)
      .order('date_seance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const m: Record<string, Dernier> = {}
        for (const s of data ?? []) {
          if (s.id === seanceId) continue
          for (const x of s.exercices as any[]) {
            const k = cle(x.nom)
            if (!m[k]) m[k] = { date: s.date_seance, series: x.series, repetitions: x.repetitions, charge_kg: x.charge_kg }
          }
        }
        setDerniers(m)
      })
  }, [clientId, seanceId, date])

  // Compare chaque charge saisie au meilleur résultat précédent de ce client sur le même exercice
  async function detecterRecords(): Promise<string[]> {
    const records: string[] = []
    const vus = new Set<string>()
    for (const l of lignes) {
      const charge = num(l.charge_kg)
      const k = cle(l.nom)
      if (!k || charge === null || vus.has(k)) continue
      vus.add(k)
      let q = supabase
        .from('exercices')
        .select('charge_kg, seances!inner(client_id)')
        .eq('seances.client_id', clientId)
        .ilike('nom', echapper(l.nom.trim()))
        .not('charge_kg', 'is', null)
      if (seanceId) q = q.neq('seance_id', seanceId)
      const { data } = await q.order('charge_kg', { ascending: false }).limit(1)
      const precedent = data?.[0]?.charge_kg
      if (precedent != null && charge > Number(precedent)) records.push(`${l.nom.trim()} ${charge} kg (avant : ${precedent} kg)`)
    }
    return records
  }

  function maj(i: number, champ: keyof Ligne, valeur: string) {
    setLignes(l => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))
  }

  async function reprendre() {
    const { data, error } = await supabase
      .from('seances')
      .select(`duree_min, ${EXOS}`)
      .eq('client_id', clientId)
      .order('date_seance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) return setErreur(error.message)
    if (!data?.length) return setErreur('Aucune séance précédente pour ce client.')
    setLignes(versLignes(data[0].exercices as Exo[]))
    setDuree(txt(data[0].duree_min))
    setErreur('')
  }

  function echec(message: string) {
    setErreur(message)
    setEnvoi(false)
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    const records = await detecterRecords()

    const champs = { client_id: clientId, date_seance: date, duree_min: num(duree), ressenti: num(ressenti), notes: notes.trim() || null }
    let id = seanceId
    if (id) {
      const { error } = await supabase.from('seances').update(champs).eq('id', id)
      if (error) return echec(error.message)
    } else {
      const { data, error } = await supabase.from('seances').insert(champs).select('id').single()
      if (error) return echec(error.message)
      id = data.id as string
    }

    const exercices = lignes
      .filter(l => l.nom.trim())
      .map((l, i) => ({
        seance_id: id,
        ordre: i,
        nom: l.nom.trim(),
        series: num(l.series),
        repetitions: num(l.repetitions),
        charge_kg: num(l.charge_kg),
      }))
    // On ajoute les nouveaux exercices AVANT de supprimer les anciens : en cas d'erreur, rien n'est perdu.
    if (exercices.length) {
      const { error } = await supabase.from('exercices').insert(exercices)
      if (error) {
        if (!seanceId) await supabase.from('seances').delete().eq('id', id)
        return echec(error.message)
      }
    }
    if (anciens.length) {
      const { error } = await supabase.from('exercices').delete().in('id', anciens)
      if (error) return echec(error.message)
    }
    setEnvoi(false)
    onSaved(records.length ? `🏆 ${records.length > 1 ? 'Nouveaux records' : 'Nouveau record'} : ${records.join(' · ')}` : undefined)
  }

  // Suggestions : exercices déjà saisis + bibliothèque (l'orthographe de la bibliothèque prime)
  const suggestions = [...new Map([...noms, ...Object.values(biblio).map(b => b.nom)].map(n => [cle(n), n])).values()].sort()
  const pointsAttention = clients.find(c => c.id === clientId)?.points_attention

  if (!seanceId && !clientsPrets) return <Squelette lignes={4} />
  if (!seanceId && !clients.length) return <p className="centre">Ajoute d'abord un client dans l'onglet « Clients ».</p>

  return (
    <form onSubmit={enregistrer}>
      <h2>{seanceId ? 'Modifier la séance' : 'Nouvelle séance'}</h2>
      <select value={clientId} onChange={e => setClientId(e.target.value)}>
        {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
      </select>
      {pointsAttention && <p className="attention">⚠ {pointsAttention}</p>}
      <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      <div className="ligne">
        <input type="number" inputMode="numeric" placeholder="Durée (min)" value={duree} onChange={e => setDuree(e.target.value)} />
        <input type="number" inputMode="numeric" min={1} max={10} placeholder="Ressenti /10" value={ressenti} onChange={e => setRessenti(e.target.value)} />
      </div>

      <h3>Exercices</h3>
      {!seanceId && (
        <>
          <button type="button" className="secondaire" onClick={reprendre}>Reprendre la dernière séance</button>
          {modeles.length > 0 && (
            <select value="" onChange={e => appliquerModele(e.target.value)}>
              <option value="">Charger un modèle…</option>
              {modeles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
            </select>
          )}
        </>
      )}
      <datalist id="noms-exercices">{suggestions.map(n => <option key={n} value={n} />)}</datalist>
      {lignes.map((l, i) => (
        <div className="exercice" key={i}>
          <input list="noms-exercices" placeholder="Exercice" value={l.nom} onChange={e => maj(i, 'nom', e.target.value)} />
          {derniers[cle(l.nom)] && <DerniereFois d={derniers[cle(l.nom)]} />}
          {biblio[cle(l.nom)] && <FicheExercice b={biblio[cle(l.nom)]} />}
          <div className="ligne">
            <input inputMode="numeric" placeholder="Séries" value={l.series} onChange={e => maj(i, 'series', e.target.value)} />
            <input inputMode="numeric" placeholder="Reps" value={l.repetitions} onChange={e => maj(i, 'repetitions', e.target.value)} />
            <input inputMode="decimal" placeholder="Charge kg" value={l.charge_kg} onChange={e => maj(i, 'charge_kg', e.target.value)} />
          </div>
        </div>
      ))}
      <button type="button" className="secondaire" onClick={() => setLignes(l => [...l, vide()])}>+ Ajouter un exercice</button>
      <button type="button" className="secondaire" onClick={enregistrerModele}>Enregistrer comme modèle</button>

      <textarea placeholder="Notes de séance" value={notes} onChange={e => setNotes(e.target.value)} />
      {erreur && <p className="erreur">{erreur}</p>}
      <button type="submit" disabled={envoi}>{envoi ? 'Enregistrement…' : seanceId ? 'Enregistrer les modifications' : 'Enregistrer la séance'}</button>
    </form>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from './supabase'
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

export default function NouvelleSeance({ seanceId, onSaved }: { seanceId: string | null; onSaved: () => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [duree, setDuree] = useState('')
  const [ressenti, setRessenti] = useState('')
  const [notes, setNotes] = useState('')
  const [lignes, setLignes] = useState<Ligne[]>([vide()])
  const [anciens, setAnciens] = useState<string[]>([]) // exercices existants (mode modification)
  const [noms, setNoms] = useState<string[]>([]) // suggestions
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    // En modification, on charge aussi les clients archivés.
    let q = supabase.from('clients').select('*')
    if (!seanceId) q = q.eq('actif', true)
    q.order('prenom').then(({ data }) => {
      setClients(data ?? [])
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
    onSaved()
  }

  if (!seanceId && !clients.length) return <p className="centre">Ajoute d'abord un client dans l'onglet « Clients ».</p>

  return (
    <form onSubmit={enregistrer}>
      <h2>{seanceId ? 'Modifier la séance' : 'Nouvelle séance'}</h2>
      <select value={clientId} onChange={e => setClientId(e.target.value)}>
        {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
      </select>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      <div className="ligne">
        <input type="number" inputMode="numeric" placeholder="Durée (min)" value={duree} onChange={e => setDuree(e.target.value)} />
        <input type="number" inputMode="numeric" min={1} max={10} placeholder="Ressenti /10" value={ressenti} onChange={e => setRessenti(e.target.value)} />
      </div>

      <h3>Exercices</h3>
      {!seanceId && <button type="button" className="secondaire" onClick={reprendre}>Reprendre la dernière séance</button>}
      <datalist id="noms-exercices">{noms.map(n => <option key={n} value={n} />)}</datalist>
      {lignes.map((l, i) => (
        <div className="exercice" key={i}>
          <input list="noms-exercices" placeholder="Exercice" value={l.nom} onChange={e => maj(i, 'nom', e.target.value)} />
          <div className="ligne">
            <input inputMode="numeric" placeholder="Séries" value={l.series} onChange={e => maj(i, 'series', e.target.value)} />
            <input inputMode="numeric" placeholder="Reps" value={l.repetitions} onChange={e => maj(i, 'repetitions', e.target.value)} />
            <input inputMode="decimal" placeholder="Charge kg" value={l.charge_kg} onChange={e => maj(i, 'charge_kg', e.target.value)} />
          </div>
        </div>
      ))}
      <button type="button" className="secondaire" onClick={() => setLignes(l => [...l, vide()])}>+ Ajouter un exercice</button>

      <textarea placeholder="Notes de séance" value={notes} onChange={e => setNotes(e.target.value)} />
      {erreur && <p className="erreur">{erreur}</p>}
      <button type="submit" disabled={envoi}>{envoi ? 'Enregistrement…' : seanceId ? 'Enregistrer les modifications' : 'Enregistrer la séance'}</button>
    </form>
  )
}

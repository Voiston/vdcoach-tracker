import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Client } from './Clients'

type Ligne = { nom: string; series: string; repetitions: string; charge_kg: string }
const vide = (): Ligne => ({ nom: '', series: '', repetitions: '', charge_kg: '' })
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

export default function NouvelleSeance({ onSaved }: { onSaved: () => void }) {
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [duree, setDuree] = useState('')
  const [ressenti, setRessenti] = useState('')
  const [notes, setNotes] = useState('')
  const [lignes, setLignes] = useState<Ligne[]>([vide()])
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    supabase
      .from('clients')
      .select('*')
      .eq('actif', true)
      .order('prenom')
      .then(({ data }) => {
        setClients(data ?? [])
        if (data?.length) setClientId(data[0].id)
      })
  }, [])

  function maj(i: number, champ: keyof Ligne, valeur: string) {
    setLignes(l => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')

    const { data: seance, error } = await supabase
      .from('seances')
      .insert({ client_id: clientId, date_seance: date, duree_min: num(duree), ressenti: num(ressenti), notes: notes.trim() || null })
      .select('id')
      .single()
    if (error) {
      setErreur(error.message)
      setEnvoi(false)
      return
    }

    const exercices = lignes
      .filter(l => l.nom.trim())
      .map((l, i) => ({
        seance_id: seance.id,
        ordre: i,
        nom: l.nom.trim(),
        series: num(l.series),
        repetitions: num(l.repetitions),
        charge_kg: num(l.charge_kg),
      }))
    if (exercices.length) {
      const { error: erreurExercices } = await supabase.from('exercices').insert(exercices)
      if (erreurExercices) {
        await supabase.from('seances').delete().eq('id', seance.id)
        setErreur(erreurExercices.message)
        setEnvoi(false)
        return
      }
    }
    setEnvoi(false)
    onSaved()
  }

  if (!clients.length) return <p className="centre">Ajoute d'abord un client dans l'onglet « Clients ».</p>

  return (
    <form onSubmit={enregistrer}>
      <h2>Nouvelle séance</h2>
      <select value={clientId} onChange={e => setClientId(e.target.value)}>
        {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
      </select>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
      <div className="ligne">
        <input type="number" inputMode="numeric" placeholder="Durée (min)" value={duree} onChange={e => setDuree(e.target.value)} />
        <input type="number" inputMode="numeric" min={1} max={10} placeholder="Ressenti /10" value={ressenti} onChange={e => setRessenti(e.target.value)} />
      </div>

      <h3>Exercices</h3>
      {lignes.map((l, i) => (
        <div className="exercice" key={i}>
          <input placeholder="Exercice" value={l.nom} onChange={e => maj(i, 'nom', e.target.value)} />
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
      <button type="submit" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Enregistrer la séance'}</button>
    </form>
  )
}

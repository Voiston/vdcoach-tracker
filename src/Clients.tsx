import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export type Client = { id: string; prenom: string; nom: string | null; objectifs: string | null; actif: boolean }

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [objectifs, setObjectifs] = useState('')
  const [erreur, setErreur] = useState('')

  async function charger() {
    const { data, error } = await supabase.from('clients').select('*').order('prenom')
    if (error) setErreur(error.message)
    else setClients(data)
  }

  useEffect(() => {
    charger()
  }, [])

  async function ajouter(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('clients')
      .insert({ prenom: prenom.trim(), nom: nom.trim() || null, objectifs: objectifs.trim() || null })
    if (error) return setErreur(error.message)
    setPrenom('')
    setNom('')
    setObjectifs('')
    setErreur('')
    charger()
  }

  async function basculerActif(c: Client) {
    await supabase.from('clients').update({ actif: !c.actif }).eq('id', c.id)
    charger()
  }

  return (
    <section>
      <h2>Clients</h2>
      <form onSubmit={ajouter}>
        <input placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)} required />
        <input placeholder="Nom (facultatif)" value={nom} onChange={e => setNom(e.target.value)} />
        <textarea placeholder="Objectifs (facultatif)" value={objectifs} onChange={e => setObjectifs(e.target.value)} />
        <button type="submit">Ajouter le client</button>
      </form>
      {erreur && <p className="erreur">{erreur}</p>}
      <ul className="liste">
        {clients.map(c => (
          <li key={c.id} className={c.actif ? '' : 'inactif'}>
            <div>
              <strong>{c.prenom} {c.nom}</strong>
              {c.objectifs && <p>{c.objectifs}</p>}
            </div>
            <button className="lien" onClick={() => basculerActif(c)}>{c.actif ? 'Archiver' : 'Réactiver'}</button>
          </li>
        ))}
      </ul>
    </section>
  )
}

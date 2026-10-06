import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { EtatVide, Squelette, useNotifier, useOccupe } from './ui'

export type Client = {
  id: string
  prenom: string
  nom: string | null
  objectifs: string | null
  points_attention: string | null
  actif: boolean
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([])
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [objectifs, setObjectifs] = useState('')
  const [attention, setAttention] = useState('')
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()
  const notifier = useNotifier()
  const [charge, setCharge] = useState(false)

  async function charger() {
    const { data, error } = await supabase.from('clients').select('*').order('prenom')
    setCharge(true)
    if (error) setErreur(error.message)
    else setClients(data)
  }

  useEffect(() => {
    charger()
  }, [])

  async function ajouter(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('clients').insert({
      prenom: prenom.trim(),
      nom: nom.trim() || null,
      objectifs: objectifs.trim() || null,
      points_attention: attention.trim() || null,
    })
    if (error) return setErreur(error.message)
    setPrenom('')
    setNom('')
    setObjectifs('')
    setAttention('')
    setErreur('')
    charger()
    notifier('Client ajouté')
  }

  async function modifierAttention(c: Client) {
    const texte = window.prompt("Points d'attention (blessures, contre-indications). Laisse vide pour effacer :", c.points_attention ?? '')
    if (texte === null) return
    const { error } = await supabase.from('clients').update({ points_attention: texte.trim() || null }).eq('id', c.id)
    if (error) setErreur(error.message)
    else {
      charger()
      notifier("Points d'attention enregistrés")
    }
  }

  async function basculerActif(c: Client) {
    await supabase.from('clients').update({ actif: !c.actif }).eq('id', c.id)
    charger()
    notifier(c.actif ? 'Client archivé' : 'Client réactivé')
  }

  return (
    <section>
      <h2>Clients</h2>
      <form onSubmit={e => lancer(() => ajouter(e))}>
        <input placeholder="Prénom" value={prenom} onChange={e => setPrenom(e.target.value)} required />
        <input placeholder="Nom (facultatif)" value={nom} onChange={e => setNom(e.target.value)} />
        <textarea placeholder="Objectifs (facultatif)" value={objectifs} onChange={e => setObjectifs(e.target.value)} />
        <textarea placeholder="Points d'attention : blessures, contre-indications (facultatif)" value={attention} onChange={e => setAttention(e.target.value)} />
        <button type="submit" disabled={occupe}>{occupe ? 'Ajout en cours…' : 'Ajouter le client'}</button>
      </form>
      {erreur && <p className="erreur">{erreur}</p>}
      {!charge && <Squelette lignes={3} />}
      {charge && !clients.length && <EtatVide titre="Aucun client pour l'instant" texte="Ajoute ton premier client avec le formulaire ci-dessus." />}
      <ul className="liste" hidden={!charge}>
        {clients.map(c => (
          <li key={c.id} className={c.actif ? '' : 'inactif'}>
            <div>
              <strong>{c.prenom} {c.nom}</strong>
              {c.objectifs && <p>{c.objectifs}</p>}
              {c.points_attention && <p className="attention">⚠ {c.points_attention}</p>}
            </div>
            <div className="ligne">
              <button className="lien" onClick={() => modifierAttention(c)}>Attention</button>
              <button className="lien" onClick={() => basculerActif(c)}>{c.actif ? 'Archiver' : 'Réactiver'}</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

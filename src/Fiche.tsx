import { useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import GroupeFacturation from './GroupeFacturation'
import { Champ, MessageErreur, useClientComplet, useNotifier, useOccupe } from './ui'

export default function Fiche({ onRetour }: { onRetour: () => void }) {
  const { client, recharger } = useClientComplet()
  const notifier = useNotifier()
  const [prenom, setPrenom] = useState(client.prenom)
  const [nom, setNom] = useState(client.nom ?? '')
  const [objectifs, setObjectifs] = useState(client.objectifs ?? '')
  const [attention, setAttention] = useState(client.points_attention ?? '')
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('clients')
      .update({ prenom: prenom.trim(), nom: nom.trim() || null, objectifs: objectifs.trim() || null, points_attention: attention.trim() || null })
      .eq('id', client.id)
    if (error) return setErreur(messageErreur(error))
    setErreur('')
    await recharger()
    notifier('Fiche enregistrée')
  }

  async function basculerActif() {
    const { error } = await supabase.from('clients').update({ actif: !client.actif }).eq('id', client.id)
    if (error) return setErreur(messageErreur(error))
    notifier(client.actif ? `${client.prenom} archivé(e)` : `${client.prenom} réactivé(e)`)
    if (client.actif) onRetour()
    else await recharger()
  }

  return (
    <section>
      <form onSubmit={e => lancer(() => enregistrer(e))}>
        <Champ libelle="Prénom"><input autoCapitalize="words" autoComplete="off" value={prenom} onChange={e => setPrenom(e.target.value)} required /></Champ>
        <Champ libelle="Nom (facultatif)"><input autoCapitalize="words" autoComplete="off" value={nom} onChange={e => setNom(e.target.value)} /></Champ>
        <Champ libelle="Objectifs (facultatif)"><textarea value={objectifs} onChange={e => setObjectifs(e.target.value)} /></Champ>
        <Champ libelle="Points d'attention (facultatif)" aide="Blessures, douleurs, contre-indications : ils s'affichent en haut du profil.">
          <textarea value={attention} onChange={e => setAttention(e.target.value)} />
        </Champ>
        <MessageErreur message={erreur} />
        <button type="submit" disabled={occupe}>{occupe ? 'Enregistrement…' : 'Enregistrer la fiche'}</button>
      </form>
      <GroupeFacturation />
      <h3>Archivage</h3>
      <p className="meta">Un client archivé disparaît de la liste principale, mais ses séances sont conservées.</p>
      <button type="button" className="secondaire" onClick={basculerActif}>{client.actif ? 'Archiver ce client' : 'Réactiver ce client'}</button>
    </section>
  )
}

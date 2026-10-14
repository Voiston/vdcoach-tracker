import { useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { SelecteurSilhouette, SelecteurZonesSensibles } from './Clients'
import type { Silhouette } from './definitions'
import GroupeFacturation from './GroupeFacturation'
import { Champ, MessageErreur, useClientComplet, useNotifier, useOccupe } from './ui'

export default function Fiche({ onRetour }: { onRetour: () => void }) {
  const { client, recharger } = useClientComplet()
  const notifier = useNotifier()
  const [prenom, setPrenom] = useState(client.prenom)
  const [nom, setNom] = useState(client.nom ?? '')
  const [objectifs, setObjectifs] = useState(client.objectifs ?? '')
  const [attention, setAttention] = useState(client.points_attention ?? '')
  const [zones, setZones] = useState<string[]>(client.zones_sensibles ?? [])
  const [silhouette, setSilhouette] = useState<Silhouette>(client.silhouette ?? 'homme')
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase
      .from('clients')
      .update({
        prenom: prenom.trim(),
        nom: nom.trim() || null,
        objectifs: objectifs.trim() || null,
        points_attention: attention.trim() || null,
        zones_sensibles: zones,
        silhouette,
      })
      .eq('id', client.id)
    if (error) return setErreur(messageErreur(error))
    setErreur('')
    await recharger()
    notifier('Informations enregistrées')
  }

  async function basculerActif() {
    const { error } = await supabase.from('clients').update({ actif: !client.actif }).eq('id', client.id)
    if (error) return setErreur(messageErreur(error))
    notifier(client.actif ? `${client.prenom} archivé(e)` : `${client.prenom} réactivé(e)`)
    if (client.actif) onRetour()
    else await recharger()
  }

  return (
    <section className="formulaire-etroit">
      <div className="carte-section premiere-carte">
        <h3>Informations du client</h3>
        <form onSubmit={e => lancer(() => enregistrer(e))}>
          <div className="grille-2">
            <Champ libelle="Prénom">
              <input autoCapitalize="words" autoComplete="off" value={prenom} onChange={e => setPrenom(e.target.value)} required />
            </Champ>
            <Champ libelle="Nom (facultatif)">
              <input autoCapitalize="words" autoComplete="off" value={nom} onChange={e => setNom(e.target.value)} />
            </Champ>
          </div>

          <div className="grille-2">
            <Champ libelle="Objectifs (facultatif)" aide="Objectif général affiché sur l'aperçu du client.">
              <textarea rows={3} value={objectifs} onChange={e => setObjectifs(e.target.value)} />
            </Champ>
            <Champ libelle="Points d'attention (facultatif)" aide="Blessures, douleurs, contre-indications : ils s'affichent en haut du profil.">
              <textarea rows={3} value={attention} onChange={e => setAttention(e.target.value)} />
            </Champ>
          </div>

          <SelecteurSilhouette valeur={silhouette} onChange={setSilhouette} />
          <SelecteurZonesSensibles zones={zones} onChange={setZones} />
          <MessageErreur message={erreur} />

          <div className="ligne-action pied-carte">
            <button type="submit" disabled={occupe}>{occupe ? 'Enregistrement…' : 'Enregistrer les informations'}</button>
            <span className="meta">Enregistre les champs de cette section uniquement.</span>
          </div>
        </form>
      </div>

      <div className="carte-section">
        <GroupeFacturation />
        <p className="meta">
          Les associations de facturation s'enregistrent dès que tu les valides, sans passer par le bouton ci-dessus.
        </p>
      </div>

      <div className="carte-section zone-danger">
        <h3>Archivage</h3>
        <p className="meta">Un client archivé disparaît de la liste principale, mais ses séances sont conservées.</p>
        <div>
          <button type="button" className="secondaire" onClick={basculerActif}>
            {client.actif ? 'Archiver ce client' : 'Réactiver ce client'}
          </button>
        </div>
      </div>
    </section>
  )
}
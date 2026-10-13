import { useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { MUSCLES } from './definitions'
import { Champ, MessageErreur, useNotifier, useOccupe } from './ui'

export type Client = {
  id: string
  prenom: string
  nom: string | null
  objectifs: string | null
  points_attention: string | null
  zones_sensibles?: string[] | null
  actif: boolean
  groupe_facturation: string | null
}

export function SelecteurZonesSensibles({
  zones,
  onChange,
}: {
  zones: string[]
  onChange: (zones: string[]) => void
}) {
  const basculer = (m: string) =>
    onChange(zones.includes(m) ? zones.filter(x => x !== m) : [...zones, m])

  return (
    <fieldset>
      <legend>Zones sensibles / articulations à ménager (facultatif)</legend>
      <p className="champ-aide">
        Un badge d’alerte s’affichera lors du choix d’un exercice sollicitant l’une de ces zones.
      </p>
      <div className="puces">
        {Object.entries(MUSCLES).map(([cle, libelle]) => {
          const actif = zones.includes(cle)
          return (
            <button
              key={cle}
              type="button"
              className={`puce-choix${actif ? ' alerte' : ''}`}
              aria-pressed={actif}
              onClick={() => basculer(cle)}
            >
              {actif ? '⚠ ' : '+ '}{libelle}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

export function FormulaireClient({ onCree, onAnnuler }: { onCree: (id: string) => void; onAnnuler: () => void }) {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [objectifs, setObjectifs] = useState('')
  const [attention, setAttention] = useState('')
  const [zones, setZones] = useState<string[]>([])
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()
  const notifier = useNotifier()

  async function creer(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase
      .from('clients')
      .insert({
        prenom: prenom.trim(),
        nom: nom.trim() || null,
        objectifs: objectifs.trim() || null,
        points_attention: attention.trim() || null,
        zones_sensibles: zones,
      })
      .select('id')
      .single()
    if (error) return setErreur(messageErreur(error))
    notifier('Client ajouté')
    onCree(data.id as string)
  }

  return (
    <form onSubmit={e => lancer(() => creer(e))}>
      <h3>Nouveau client</h3>
      <Champ libelle="Prénom"><input autoCapitalize="words" autoComplete="off" value={prenom} onChange={e => setPrenom(e.target.value)} required autoFocus /></Champ>
      <Champ libelle="Nom (facultatif)"><input autoCapitalize="words" autoComplete="off" value={nom} onChange={e => setNom(e.target.value)} /></Champ>
      <Champ libelle="Objectifs (facultatif)"><textarea value={objectifs} onChange={e => setObjectifs(e.target.value)} /></Champ>
      <Champ libelle="Points d'attention (facultatif)" aide="Blessures, douleurs, contre-indications : ils s'affichent en haut du profil du client.">
        <textarea value={attention} onChange={e => setAttention(e.target.value)} />
      </Champ>
      <SelecteurZonesSensibles zones={zones} onChange={setZones} />
      <MessageErreur message={erreur} />
      <div className="ligne">
        <button type="button" className="secondaire" onClick={onAnnuler}>Annuler</button>
        <button type="submit" disabled={occupe}>{occupe ? 'Ajout en cours…' : 'Ajouter le client'}</button>
      </div>
    </form>
  )
}
import { useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { ARTICULATIONS, MUSCLES, SILHOUETTES, type Silhouette } from './definitions'
import { Champ, MessageErreur, useNotifier, useOccupe } from './ui'

export type Client = {
  id: string
  prenom: string
  nom: string | null
  objectifs: string | null
  points_attention: string | null
  zones_sensibles?: string[] | null
  silhouette?: Silhouette | null
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
  const basculer = (cle: string) =>
    onChange(zones.includes(cle) ? zones.filter(x => x !== cle) : [...zones, cle])

  const puce = ([cle, libelle]: [string, string]) => {
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
  }

  return (
    <fieldset>
      <legend>Zones sensibles / à ménager (facultatif)</legend>
      <p className="champ-aide">
        Les articulations et le rachis apparaissent en rappel sur le profil. Les muscles déclenchent aussi une alerte lors du choix d’un exercice qui les sollicite.
      </p>
      <span className="champ-libelle" style={{ marginTop: '.25rem' }}>Articulations et rachis</span>
      <div className="puces">{Object.entries(ARTICULATIONS).map(puce)}</div>
      <span className="champ-libelle" style={{ marginTop: '.45rem' }}>Muscles</span>
      <div className="puces">{Object.entries(MUSCLES).map(puce)}</div>
    </fieldset>
  )
}

export function SelecteurSilhouette({ valeur, onChange }: { valeur: Silhouette; onChange: (s: Silhouette) => void }) {
  return (
    <fieldset>
      <legend>Silhouette des schémas musculaires</legend>
      <div className="puces" role="group" aria-label="Silhouette">
        {(Object.keys(SILHOUETTES) as Silhouette[]).map(s => (
          <button
            key={s}
            type="button"
            className={`puce-choix${valeur === s ? ' actif' : ''}`}
            aria-pressed={valeur === s}
            onClick={() => onChange(s)}
          >
            {SILHOUETTES[s]}
          </button>
        ))}
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
  const [silhouette, setSilhouette] = useState<Silhouette>('homme')
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
        silhouette,
      })
      .select('id')
      .single()
    if (error) return setErreur(messageErreur(error))
    notifier('Client ajouté')
    onCree(data.id as string)
  }

  return (
    <div className="carte-section premiere-carte formulaire-etroit">
      <h3>Nouveau client</h3>
      <form onSubmit={e => lancer(() => creer(e))}>
        <div className="grille-2">
          <Champ libelle="Prénom">
            <input autoCapitalize="words" autoComplete="off" value={prenom} onChange={e => setPrenom(e.target.value)} required autoFocus />
          </Champ>
          <Champ libelle="Nom (facultatif)">
            <input autoCapitalize="words" autoComplete="off" value={nom} onChange={e => setNom(e.target.value)} />
          </Champ>
        </div>

        <div className="grille-2">
          <Champ libelle="Objectifs (facultatif)">
            <textarea rows={3} value={objectifs} onChange={e => setObjectifs(e.target.value)} />
          </Champ>
          <Champ libelle="Points d'attention (facultatif)" aide="Blessures, douleurs, contre-indications : ils s'affichent en haut du profil du client.">
            <textarea rows={3} value={attention} onChange={e => setAttention(e.target.value)} />
          </Champ>
        </div>

        <SelecteurSilhouette valeur={silhouette} onChange={setSilhouette} />
        <SelecteurZonesSensibles zones={zones} onChange={setZones} />
        <MessageErreur message={erreur} />
        <div className="ligne pied-carte">
          <button type="submit" disabled={occupe}>{occupe ? 'Ajout en cours…' : 'Ajouter le client'}</button>
          <button type="button" className="secondaire" onClick={onAnnuler}>Annuler</button>
        </div>
      </form>
    </div>
  )
}
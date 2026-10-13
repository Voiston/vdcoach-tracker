import { useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { construireBilan, type MesureBilan, type SeanceCharges } from './bilan-lib'
import { decalerMois, libelleMois, moisCourant } from './facturation-lib'
import { chargerObjectifs } from './objectifs-lib'
import { MessageErreur, useClient, useNotifier, useOccupe } from './ui'

// Bilan d'un mois à envoyer au client : on le prépare, on le relit (et on le modifie si besoin), puis on le copie.
export default function BilanMensuel() {
  const client = useClient()
  const notifier = useNotifier()
  const courant = moisCourant()
  const moisProposes = [courant, decalerMois(courant, -1), decalerMois(courant, -2)]
  const [mois, setMois] = useState(courant)
  const [texte, setTexte] = useState<string | null>(null)
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()

  async function preparer() {
    const [s, m, o] = await Promise.all([
      supabase.from('seances').select('date_seance, exercices(nom, charge_kg)').eq('client_id', client.id).order('date_seance'),
      supabase.from('mesures').select('type, valeur, date_mesure').eq('client_id', client.id).order('date_mesure'),
      chargerObjectifs(client.id),
    ])
    const err = s.error ?? m.error ?? o.erreur
    if (err) return setErreur(messageErreur(err))
    setErreur('')
    setTexte(construireBilan({
      prenom: client.prenom,
      mois,
      seances: s.data as unknown as SeanceCharges[],
      mesures: m.data as MesureBilan[],
      objectifs: o.donnees,
    }))
  }

  async function copier() {
    if (texte === null) return
    try {
      await navigator.clipboard.writeText(texte)
      notifier('Bilan copié')
    } catch {
      notifier('Copie impossible depuis ce navigateur.')
    }
  }

  return (
    <div>
      <h3>Bilan du mois</h3>
      <p className="meta">Un récapitulatif à envoyer à {client.prenom} : séances, records, mesures et objectifs en cours.</p>
      <div className="ligne">
        <select aria-label="Mois du bilan" value={mois} onChange={e => { setMois(e.target.value); setTexte(null) }}>
          {moisProposes.map(m => <option key={m} value={m}>{libelleMois(m)}</option>)}
        </select>
        <button type="button" className="secondaire" disabled={occupe} onClick={() => lancer(preparer)}>{occupe ? 'Préparation…' : 'Préparer le bilan'}</button>
      </div>
      <MessageErreur message={erreur} reessayer={() => lancer(preparer)} />
      {texte !== null && (
        <>
          <textarea aria-label="Bilan à envoyer" rows={Math.min(18, texte.split('\n').length + 1)} value={texte} onChange={e => setTexte(e.target.value)} style={{ marginTop: '.75rem' }} />
          <button type="button" onClick={copier} style={{ marginTop: '.5rem' }}>Copier le bilan</button>
        </>
      )}
    </div>
  )
}

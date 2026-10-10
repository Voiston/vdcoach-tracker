import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { Champ, MessageErreur, useClientComplet, useNotifier, useOccupe } from './ui'

type Court = { id: string; prenom: string; nom: string | null; groupe_facturation?: string | null }

// Regroupe des clients pour la facturation (couple, trio) : ils partagent le même identifiant de groupe.
export default function GroupeFacturation() {
  const { client, recharger } = useClientComplet()
  const notifier = useNotifier()
  const [membres, setMembres] = useState<Court[]>([])
  const [autres, setAutres] = useState<Court[]>([])
  const [choix, setChoix] = useState('')
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()

  async function charger() {
    const liste = await supabase.from('clients').select('id, prenom, nom, groupe_facturation').eq('actif', true).neq('id', client.id).order('prenom')
    if (liste.error) return setErreur(messageErreur(liste.error))
    const tous = (liste.data ?? []) as Court[]
    setMembres(client.groupe_facturation ? tous.filter(c => c.groupe_facturation === client.groupe_facturation) : [])
    setAutres(tous.filter(c => !client.groupe_facturation || c.groupe_facturation !== client.groupe_facturation))
    setChoix('')
  }

  useEffect(() => {
    charger()
  }, [client.id, client.groupe_facturation])

  async function associer() {
    const autre = autres.find(c => c.id === choix)
    if (!autre) return
    const groupe = client.groupe_facturation ?? autre.groupe_facturation ?? crypto.randomUUID()
    // si l'autre client fait déjà partie d'un autre groupe, tout son groupe est rattaché à celui-ci
    if (autre.groupe_facturation && autre.groupe_facturation !== groupe) {
      const fusion = await supabase.from('clients').update({ groupe_facturation: groupe }).eq('groupe_facturation', autre.groupe_facturation)
      if (fusion.error) return setErreur(messageErreur(fusion.error))
    }
    const { error } = await supabase.from('clients').update({ groupe_facturation: groupe }).in('id', [client.id, autre.id])
    if (error) return setErreur(messageErreur(error))
    setErreur('')
    await recharger()
    notifier(`${client.prenom} est maintenant facturé(e) avec ${autre.prenom}`)
  }

  async function retirer() {
    const groupe = client.groupe_facturation
    const { error } = await supabase.from('clients').update({ groupe_facturation: null }).eq('id', client.id)
    if (error) return setErreur(messageErreur(error))
    if (groupe) {
      // un groupe d'une seule personne n'a pas de sens : on le dissout
      const { data } = await supabase.from('clients').select('id').eq('groupe_facturation', groupe)
      if (data?.length === 1) await supabase.from('clients').update({ groupe_facturation: null }).eq('id', data[0].id)
    }
    setErreur('')
    await recharger()
    notifier('Retiré du groupe de facturation')
  }

  return (
    <div>
      <h3>Facturation</h3>
      <p className="meta">Les clients d'un même groupe (couple, trio) sont facturés ensemble : leurs séances communes ne comptent qu'une fois.</p>
      <p>
        {membres.length
          ? <>Facturé(e) avec : <strong>{membres.map(m => m.prenom).join(' & ')}</strong></>
          : 'Facturé(e) seul(e).'}
      </p>
      {autres.length > 0 && (
        <form onSubmit={e => { e.preventDefault(); lancer(associer) }}>
          <Champ libelle="Facturer avec…">
            <select value={choix} onChange={e => setChoix(e.target.value)}>
              <option value="">Choisir un client</option>
              {autres.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
            </select>
          </Champ>
          <button type="submit" disabled={!choix || occupe}>Associer</button>
        </form>
      )}
      {membres.length > 0 && <button type="button" className="secondaire" disabled={occupe} onClick={() => lancer(retirer)} style={{ marginTop: '.75rem' }}>Retirer du groupe</button>}
      <MessageErreur message={erreur} />
    </div>
  )
}

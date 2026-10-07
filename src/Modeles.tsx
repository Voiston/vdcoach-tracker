import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { EtatVide, FeuilleSaisie, MessageErreur, Squelette, supprimerAvecAnnulation, useNotifier } from './ui'

type Modele = { id: string; nom: string; modele_exercices: { nom: string }[] }

// Gestion des modèles de séance (on les crée depuis l'onglet « Séance »).
export default function Modeles() {
  const [modeles, setModeles] = useState<Modele[]>([])
  const [erreur, setErreur] = useState('')
  const [charge, setCharge] = useState(false)
  const notifier = useNotifier()
  const [enRenommage, setEnRenommage] = useState<Modele | null>(null)
  const [masques, setMasques] = useState<string[]>([])

  async function charger() {
    const { data, error } = await supabase.from('modeles').select('id, nom, modele_exercices(nom)').order('nom')
    setCharge(true)
    if (error) setErreur(messageErreur(error))
    else setModeles(data as unknown as Modele[])
  }

  useEffect(() => {
    charger()
  }, [])

  async function enregistrerNom(m: Modele, nom: string): Promise<string | undefined> {
    const { error } = await supabase.from('modeles').update({ nom }).eq('id', m.id)
    if (error) return messageErreur(error)
    charger()
    notifier('Modèle renommé')
  }

  function supprimer(m: Modele) {
    supprimerAvecAnnulation({
      notifier,
      message: `Modèle « ${m.nom} » supprimé`,
      masquer: () => setMasques(l => [...l, m.id]),
      restaurer: () => setMasques(l => l.filter(id => id !== m.id)),
      effacer: async () => (await supabase.from('modeles').delete().eq('id', m.id)).error,
    })
  }

  const visibles = modeles.filter(m => !masques.includes(m.id))

  return (
    <section>
      <h3>Modèles de séance</h3>
      <MessageErreur message={erreur} reessayer={charger} />
      {charge && !visibles.length && !erreur && <EtatVide titre="Aucun modèle" texte="Dans l'onglet Séance, saisis tes exercices puis touche « Enregistrer comme modèle »." />}
      {!charge && !erreur && <Squelette lignes={2} />}
      <ul className="liste" hidden={!charge}>
        {visibles.map(m => (
          <li key={m.id}>
            <div>
              <strong>{m.nom}</strong>
              <p className="meta">{m.modele_exercices.length} exercice(s)</p>
            </div>
            <div className="ligne">
              <button className="lien" onClick={() => setEnRenommage(m)}>Renommer</button>
              <button className="lien danger" onClick={() => supprimer(m)}>Supprimer</button>
            </div>
          </li>
        ))}
      </ul>
      {enRenommage && (
        <FeuilleSaisie
          titre="Renommer le modèle"
          libelle="Nom du modèle"
          valeur={enRenommage.nom}
          obligatoire
          onFermer={() => setEnRenommage(null)}
          onValider={async nom => {
            const e = await enregistrerNom(enRenommage, nom)
            if (!e) setEnRenommage(null)
            return e
          }}
        />
      )}
    </section>
  )
}

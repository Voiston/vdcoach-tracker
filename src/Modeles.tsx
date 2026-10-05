import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type Modele = { id: string; nom: string; modele_exercices: { nom: string }[] }

// Gestion des modèles de séance (on les crée depuis l'onglet « Séance »).
export default function Modeles() {
  const [modeles, setModeles] = useState<Modele[]>([])
  const [erreur, setErreur] = useState('')

  async function charger() {
    const { data, error } = await supabase.from('modeles').select('id, nom, modele_exercices(nom)').order('nom')
    if (error) setErreur(error.message)
    else setModeles(data as unknown as Modele[])
  }

  useEffect(() => {
    charger()
  }, [])

  async function renommer(m: Modele) {
    const nom = window.prompt('Nouveau nom du modèle :', m.nom)?.trim()
    if (!nom || nom === m.nom) return
    const { error } = await supabase.from('modeles').update({ nom }).eq('id', m.id)
    if (error) setErreur(error.message)
    else charger()
  }

  async function supprimer(m: Modele) {
    if (!window.confirm(`Supprimer le modèle « ${m.nom} » ?`)) return
    const { error } = await supabase.from('modeles').delete().eq('id', m.id)
    if (error) setErreur(error.message)
    else charger()
  }

  return (
    <section>
      <h3>Modèles de séance</h3>
      {erreur && <p className="erreur">{erreur}</p>}
      {!modeles.length && !erreur && <p className="meta">Aucun modèle. Crée-en un depuis l'onglet « Séance ».</p>}
      <ul className="liste">
        {modeles.map(m => (
          <li key={m.id}>
            <div>
              <strong>{m.nom}</strong>
              <p className="meta">{m.modele_exercices.length} exercice(s)</p>
            </div>
            <div className="ligne">
              <button className="lien" onClick={() => renommer(m)}>Renommer</button>
              <button className="lien" onClick={() => supprimer(m)}>Supprimer</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

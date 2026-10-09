import { useEffect, useState } from 'react'
import { MUSCLES } from './definitions'
import { useEcranLarge } from './ui'

export type ExoChoix = { nom: string; groupe?: string; materiel?: string; muscles: { muscle: string; coefficient: number }[] }

// Recherche insensible aux accents et aux majuscules (« elevation » trouve « Élévation »)
export const normaliser = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

export default function SelecteurExercice({ exercices, faits, onChoisir, onFermer }: {
  exercices: ExoChoix[]
  faits: Set<string> // exercices déjà faits par ce client (noms normalisés) : proposés en premier
  onChoisir: (nom: string) => void
  onFermer: () => void
}) {
  const [recherche, setRecherche] = useState('')
  const [muscle, setMuscle] = useState('')
  const large = useEcranLarge() // sur téléphone, on évite d'ouvrir le clavier qui masquerait la liste

  useEffect(() => {
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [onFermer])

  const q = normaliser(recherche)
  const liste = exercices
    .filter(e => (!q || normaliser(e.nom).includes(q)) && (!muscle || e.muscles.some(m => m.muscle === muscle)))
    .sort((a, b) => Number(faits.has(normaliser(b.nom))) - Number(faits.has(normaliser(a.nom))) || a.nom.localeCompare(b.nom, 'fr'))
  const existe = exercices.some(e => normaliser(e.nom) === q)

  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille selecteur" role="dialog" aria-modal="true" aria-labelledby="selecteur-titre" onClick={e => e.stopPropagation()}>
        <h3 id="selecteur-titre">Choisir un exercice</h3>
        <input type="search" aria-label="Rechercher un exercice" placeholder="Rechercher…" value={recherche} onChange={e => setRecherche(e.target.value)} autoFocus={large} />
        <select aria-label="Filtrer par muscle" value={muscle} onChange={e => setMuscle(e.target.value)}>
          <option value="">Tous les muscles</option>
          {Object.entries(MUSCLES).map(([k, libelle]) => <option key={k} value={k}>{libelle}</option>)}
        </select>
        <ul className="selecteur-liste">
          {q && !existe && (
            <li>
              <button type="button" onClick={() => onChoisir(recherche.trim())}>
                <span>Utiliser « {recherche.trim()} »</span>
                <span className="meta">Exercice hors bibliothèque</span>
              </button>
            </li>
          )}
          {liste.map(e => (
            <li key={e.nom}>
              <button type="button" onClick={() => onChoisir(e.nom)}>
                <span>{e.nom}{faits.has(normaliser(e.nom)) && <span className="puce deja-fait">Déjà fait</span>}</span>
                <span className="meta">{[e.groupe, e.materiel].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
        {!liste.length && !(q && !existe) && <p className="meta">Aucun exercice ne correspond.</p>}
        <button type="button" className="secondaire" onClick={onFermer}>Fermer</button>
      </div>
    </div>
  )
}

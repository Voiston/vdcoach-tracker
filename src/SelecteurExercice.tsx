import { useEffect, useState } from 'react'
import { MUSCLES } from './definitions'
import { useEcranLarge } from './ui'

export type ExoChoix = { nom: string; groupe?: string; materiel?: string; muscles: { muscle: string; coefficient: number }[] }

// Recherche insensible aux accents et aux majuscules (« elevation » trouve « Élévation »)
export const normaliser = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

export default function SelecteurExercice({
  exercices,
  faits,
  zonesSensibles = [],
  multiple = false,
  onChoisir,
  onChoisirMultiple,
  onFermer,
}: {
  exercices: ExoChoix[]
  faits: Set<string>
  zonesSensibles?: string[]
  multiple?: boolean
  onChoisir: (nom: string) => void
  onChoisirMultiple?: (noms: string[]) => void
  onFermer: () => void
}) {
  const [recherche, setRecherche] = useState('')
  const [muscle, setMuscle] = useState('')
  const [selection, setSelection] = useState<string[]>([])
  const large = useEcranLarge()

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

  function clicExercice(nom: string) {
    if (!multiple) {
      onChoisir(nom)
      return
    }
    setSelection(s => (s.includes(nom) ? s.filter(x => x !== nom) : [...s, nom]))
  }

  function validerSelection() {
    if (!selection.length) return
    if (onChoisirMultiple) onChoisirMultiple(selection)
    else onChoisir(selection[0])
  }

  return (
    <div className="voile" onClick={onFermer}>
      <div className="feuille selecteur" role="dialog" aria-modal="true" aria-labelledby="selecteur-titre" onClick={e => e.stopPropagation()}>
        <h3 id="selecteur-titre">{multiple ? 'Ajouter un ou plusieurs exercices' : 'Choisir un exercice'}</h3>
        <input type="search" aria-label="Rechercher un exercice" placeholder="Rechercher…" value={recherche} onChange={e => setRecherche(e.target.value)} autoFocus={large} />
        <select aria-label="Filtrer par muscle" value={muscle} onChange={e => setMuscle(e.target.value)}>
          <option value="">Tous les muscles</option>
          {Object.entries(MUSCLES).map(([k, libelle]) => <option key={k} value={k}>{libelle}</option>)}
        </select>
        <ul className="selecteur-liste">
          {q && !existe && (
            <li>
              <button
                type="button"
                onClick={() => {
                  const nom = recherche.trim()
                  if (multiple && !selection.length) onChoisir(nom)
                  else clicExercice(nom)
                  setRecherche('')
                }}
              >
                <span>+ Utiliser « {recherche.trim()} »</span>
                <span className="meta">Exercice hors bibliothèque</span>
              </button>
            </li>
          )}
          {liste.map(e => {
            const sollicites = e.muscles.filter(m => zonesSensibles.includes(m.muscle))
            const coche = selection.includes(e.nom)
            const ordre = coche ? selection.indexOf(e.nom) + 1 : null
            return (
              <li key={e.nom}>
                <button
                  type="button"
                  className={coche ? 'choisi' : undefined}
                  aria-pressed={multiple ? coche : undefined}
                  onClick={() => clicExercice(e.nom)}
                >
                  <span className="selecteur-ligne-titre">
                    {multiple && (
                      <span className={`selecteur-coche${coche ? ' actif' : ''}`} aria-hidden="true">
                        {ordre ?? '+'}
                      </span>
                    )}
                    {e.nom}
                    {faits.has(normaliser(e.nom)) && <span className="puce deja-fait">Déjà fait</span>}
                    {sollicites.length > 0 && (
                      <span className="puce alerte-muscle">
                        ⚠ Sollicite : {sollicites.map(m => MUSCLES[m.muscle] ?? m.muscle).join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="meta">{[e.groupe, e.materiel].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            )
          })}
        </ul>
        {!liste.length && !(q && !existe) && <p className="meta">Aucun exercice ne correspond.</p>}
        <div className="ligne">
          <button type="button" className="secondaire" onClick={onFermer} style={{ flex: 1 }}>Fermer</button>
          {multiple && selection.length > 0 && (
            <button type="button" onClick={validerSelection} style={{ flex: 2 }}>
              Ajouter {selection.length} exercice{selection.length > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
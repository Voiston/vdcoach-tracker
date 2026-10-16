import { useEffect, useMemo, useState } from 'react'
import { ARTICULATIONS, MUSCLES } from './definitions'
import { useEcranLarge } from './ui'

export type ExoChoix = {
  nom: string
  groupe?: string
  materiel?: string
  muscles: { muscle: string; coefficient: number }[]
}

export type SchemaMoteur =
  | 'squat'
  | 'charniere'
  | 'fente'
  | 'poussee_h'
  | 'poussee_v'
  | 'tirage_h'
  | 'tirage_v'
  | 'gainage'
  | 'isolation'
  | 'cardio'
  | 'mobilite'
  | 'autre'

export const LIBELLES_SCHEMA: Record<SchemaMoteur, string> = {
  squat: 'Dominante genou (Squat / Presse)',
  charniere: 'Charnière de hanche (Soulevé / Pont)',
  fente: 'Unilatéral jambes (Fente / Step)',
  poussee_h: 'Poussée horizontale (Pecs / Pompes)',
  poussee_v: 'Poussée verticale (Épaules)',
  tirage_h: 'Tirage horizontal (Rowing / Dos)',
  tirage_v: 'Tirage vertical (Traction / Poulie)',
  gainage: 'Gainage & Sangle abdominale',
  isolation: 'Isolation',
  cardio: 'Cardio & Métabolique',
  mobilite: 'Mobilité & Étirements',
  autre: 'Mouvement général',
}

const CLE_EXOS_FAVORIS = 'vdcoach_exos_favoris'

// Recherche insensible aux accents et aux majuscules (« elevation » trouve « Élévation »)
export const normaliser = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

export function lireExosFavoris(): Set<string> {
  try {
    const brut = localStorage.getItem(CLE_EXOS_FAVORIS)
    return new Set(brut ? (JSON.parse(brut) as string[]).map(normaliser) : [])
  } catch {
    return new Set()
  }
}

export function basculerExoFavori(nom: string): Set<string> {
  const favs = lireExosFavoris()
  const cle = normaliser(nom)
  if (favs.has(cle)) favs.delete(cle)
  else favs.add(cle)
  try {
    localStorage.setItem(CLE_EXOS_FAVORIS, JSON.stringify([...favs]))
  } catch {
    /* stockage indisponible */
  }
  return new Set(favs)
}

/**
 * Détecte automatiquement le schéma moteur d'un exercice à partir de son nom et de son groupe
 */
export function detecterSchemaMoteur(nom: string, groupe?: string): SchemaMoteur {
  const txt = normaliser(`${nom} ${groupe ?? ''}`)
  if (normaliser(groupe ?? '') === 'mobilite' || /(mobilite|etirement|stretch|assouplissement|cat-cow|chat-vache|open book|livre ouvert)/.test(txt)) return 'mobilite'
  if (normaliser(groupe ?? '') === 'cardio' || /(velo|course|rameur|skierg|assault|burpee|corde a sauter|tapis|elliptique|hiit|jumping|skater|montee de genou)/.test(txt)) return 'cardio'
  if (/(fente|bulgare|step up|step-up|montee sur banc|pistol|unilateral|unipod|une jambe|1 jambe)/.test(txt)) return 'fente'
  if (/(squat|presse|goblet|leg extension|chaise|hack|sissy|wall sit|thruster)/.test(txt)) return 'squat'
  if (/(souleve|deadlift|rdl|roumain|hip thrust|pont fessier|glute bridge|good morning|swing|leg curl|ischio|extension lombaire|kettlebell swing)/.test(txt)) return 'charniere'
  if (/(developpe couche|developpe incline|pompe|push up|push-up|chest press|ecarte|dips|pompes)/.test(txt)) return 'poussee_h'
  if (/(developpe militaire|developpe epaule|shoulder press|overhead|pike push|arnold|developpe halt)/.test(txt)) return 'poussee_v'
  if (/(rowing|tirage horizontal|tirage bucheron|buste penche|face pull|seal row|tirage anneaux|trx tirage|sangles)/.test(txt)) return 'tirage_h'
  if (/(traction|pull up|pull-up|chin up|tirage vertical|tirage poitrine|lat pulldown|pull over|pull-over)/.test(txt)) return 'tirage_v'
  if (/(gainage|planche|crunch|abdo|dead bug|deadbug|hollow|pallof|mountain climber|releve de jambes|releve de buste|russian twist|oblique|bird dog)/.test(txt)) return 'gainage'
  if (/(curl|extension triceps|elevation laterale|elevation frontale|oiseau|mollet|adducteur|abducteur|kickback)/.test(txt)) return 'isolation'
  return 'autre'
}

/**
 * Détecte les articulations potentiellement sollicitées (pour croiser avec client.zones_sensibles)
 */
export function articulationsSollicitees(nom: string, groupe?: string): string[] {
  const schema = detecterSchemaMoteur(nom, groupe)
  const txt = normaliser(nom)
  const art = new Set<string>()

  if (schema === 'squat' || schema === 'fente' || /(saut|jump|box|fente|squat|presse|leg extension|course)/.test(txt)) {
    art.add('genou')
  }
  if (schema === 'charniere' || schema === 'squat' || schema === 'fente') {
    art.add('hanche')
  }
  if (/(souleve|deadlift|good morning|rowing|swing|crunch|sit up|releve de buste|lombaire)/.test(txt)) {
    art.add('rachis_lombaire')
  }
  if (schema === 'poussee_h' || schema === 'poussee_v' || schema === 'tirage_v' || /(dips|elevation|developpe|pompe|traction|overhead|snatch|gainage inverse)/.test(txt)) {
    art.add('epaule')
  }
  if (/(curl|triceps|dips|pompe|traction|developpe|rowing)/.test(txt)) {
    art.add('coude')
  }
  if (/(pompe|planche|gainage main|gainage inverse|front squat|clean|snatch|kettlebell|barre|halteres)/.test(txt)) {
    art.add('poignet')
  }
  if (/(mollet|corde a sauter|course|saut|jump|fente|squat|step)/.test(txt)) {
    art.add('cheville')
    art.add('pied')
  }
  return [...art]
}

export function zonesSensiblesSollicitees(
  exo: Pick<ExoChoix, 'nom' | 'groupe' | 'muscles'>,
  zonesSensibles: string[],
): string[] {
  if (!zonesSensibles.length) return []
  const musclesTouches = (exo.muscles ?? [])
    .filter(m => zonesSensibles.includes(m.muscle))
    .map(m => MUSCLES[m.muscle] ?? m.muscle)
  const artTouchees = articulationsSollicitees(exo.nom, exo.groupe)
    .filter(a => zonesSensibles.includes(a))
    .map(a => ARTICULATIONS[a] ?? a)
  return [...new Set([...musclesTouches, ...artTouchees])]
}

type FiltreMateriel = 'tous' | 'poids_corps' | 'leger' | 'meme'
type VueSelecteur = 'equivalents' | 'habituels' | 'favoris' | 'tous'

export default function SelecteurExercice({
  exercices,
  faits,
  zonesSensibles = [],
  multiple = false,
  remplacementDe = null,
  conserverParametres = true,
  onChangeConserverParametres,
  onChoisir,
  onChoisirMultiple,
  onFermer,
}: {
  exercices: ExoChoix[]
  faits: Set<string>
  zonesSensibles?: string[]
  multiple?: boolean
  remplacementDe?: string | null
  conserverParametres?: boolean
  onChangeConserverParametres?: (v: boolean) => void
  onChoisir: (nom: string) => void
  onChoisirMultiple?: (noms: string[]) => void
  onFermer: () => void
}) {
  const enRemplacement = Boolean(remplacementDe && remplacementDe.trim())
  const [vue, setVue] = useState<VueSelecteur>(() => (enRemplacement ? 'equivalents' : faits.size > 0 && !multiple ? 'habituels' : 'tous'))
  const [recherche, setRecherche] = useState('')
  const [muscle, setMuscle] = useState('')
  const [groupe, setGroupe] = useState('')
  const [filtreMat, setFiltreMat] = useState<FiltreMateriel>('tous')
  const [selection, setSelection] = useState<string[]>([])
  const [favoris, setFavoris] = useState<Set<string>>(() => lireExosFavoris())
  const large = useEcranLarge()

  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [onFermer])

  // Si l'utilisateur tape une recherche, on cherche dans tous les exercices
  const q = normaliser(recherche)
  const exoOrigine = useMemo(() => {
    if (!remplacementDe) return null
    const cleOrigine = normaliser(remplacementDe)
    return exercices.find(e => normaliser(e.nom) === cleOrigine) ?? { nom: remplacementDe, muscles: [] }
  }, [exercices, remplacementDe])

  const schemaOrigine = useMemo(
    () => (exoOrigine ? detecterSchemaMoteur(exoOrigine.nom, exoOrigine.groupe) : 'autre'),
    [exoOrigine],
  )

  const groupesDisponibles = useMemo(
    () => [...new Set(exercices.map(e => e.groupe).filter((g): g is string => Boolean(g)))].sort(),
    [exercices],
  )

  function correspondMateriel(e: ExoChoix): boolean {
    if (filtreMat === 'tous') return true
    const m = normaliser(e.materiel ?? '')
    if (filtreMat === 'poids_corps') return !m || /(poids du corps|aucun|sans|tapis)/.test(m)
    if (filtreMat === 'leger') return !m || /(poids du corps|haltere|kettlebell|elastique|sangle|chaise|banc|swiss)/.test(m)
    if (filtreMat === 'meme' && exoOrigine?.materiel) return normaliser(exoOrigine.materiel) === m
    return true
  }

  // Calcul des alternatives classées par pertinence pour l'onglet « Équivalents »
  const equivalents = useMemo(() => {
    if (!exoOrigine) return []
    const cleOrigine = normaliser(exoOrigine.nom)
    const musclesPrincipaux = new Set(exoOrigine.muscles.filter(m => m.coefficient >= 1).map(m => m.muscle))
    const tousMuscles = new Set(exoOrigine.muscles.map(m => m.muscle))

    return exercices
      .filter(e => normaliser(e.nom) !== cleOrigine && correspondMateriel(e))
      .map(e => {
        let score = 0
        const raisons: string[] = []
        const schemaCand = detecterSchemaMoteur(e.nom, e.groupe)

        if (schemaOrigine !== 'autre' && schemaCand === schemaOrigine) {
          score += 55
          raisons.push('Même schéma moteur')
        }
        if (exoOrigine.groupe && e.groupe === exoOrigine.groupe) {
          score += 25
          if (!raisons.length) raisons.push(e.groupe)
        }
        const principauxCommuns = e.muscles.filter(m => m.coefficient >= 1 && musclesPrincipaux.has(m.muscle))
        if (principauxCommuns.length > 0) {
          score += principauxCommuns.length * 25
          raisons.push(principauxCommuns.map(m => MUSCLES[m.muscle] ?? m.muscle).join(', '))
        } else {
          const secondairesCommuns = e.muscles.filter(m => tousMuscles.has(m.muscle))
          if (secondairesCommuns.length > 0) {
            score += secondairesCommuns.length * 10
          }
        }

        if (faits.has(normaliser(e.nom))) score += 12
        if (favoris.has(normaliser(e.nom))) score += 8

        const alertes = zonesSensiblesSollicitees(e, zonesSensibles)
        if (alertes.length > 0) score -= 65

        return { exo: e, score, raisons }
      })
      .filter(x => x.score >= 20)
      .sort((a, b) => b.score - a.score || a.exo.nom.localeCompare(b.exo.nom, 'fr'))
      .slice(0, 12)
  }, [exoOrigine, exercices, schemaOrigine, filtreMat, faits, favoris, zonesSensibles])

  const liste = useMemo(() => {
    // Si recherche texte active, on filtre sur toute la bibliothèque
    const base =
      q
        ? exercices
        : vue === 'equivalents'
          ? equivalents.map(x => x.exo)
          : vue === 'habituels'
            ? exercices.filter(e => faits.has(normaliser(e.nom)))
            : vue === 'favoris'
              ? exercices.filter(e => favoris.has(normaliser(e.nom)))
              : exercices

    const filtree = base.filter(
      e =>
        (!q || normaliser(e.nom).includes(q) || normaliser(e.groupe ?? '').includes(q) || normaliser(e.materiel ?? '').includes(q)) &&
        (!muscle || e.muscles.some(m => m.muscle === muscle)) &&
        (!groupe || e.groupe === groupe) &&
        correspondMateriel(e),
    )

    if (vue === 'equivalents' && !q) return filtree

    return [...filtree].sort(
      (a, b) =>
        Number(favoris.has(normaliser(b.nom))) - Number(favoris.has(normaliser(a.nom))) ||
        Number(faits.has(normaliser(b.nom))) - Number(faits.has(normaliser(a.nom))) ||
        a.nom.localeCompare(b.nom, 'fr'),
    )
  }, [exercices, equivalents, vue, q, muscle, groupe, filtreMat, faits, favoris])

  const raisonsMap = useMemo(
    () => new Map(equivalents.map(x => [normaliser(x.exo.nom), x.raisons])),
    [equivalents],
  )

  const existe = exercices.some(e => normaliser(e.nom) === q)
  const nbHabituels = useMemo(() => exercices.filter(e => faits.has(normaliser(e.nom))).length, [exercices, faits])
  const nbFavoris = useMemo(() => exercices.filter(e => favoris.has(normaliser(e.nom))).length, [exercices, favoris])

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
      <div
        className="feuille selecteur"
        role="dialog"
        aria-modal="true"
        aria-labelledby="selecteur-titre"
        onClick={e => e.stopPropagation()}
      >
        <div className="selecteur-entete">
          <div>
            <h3 id="selecteur-titre">
              {enRemplacement
                ? `⇄ Remplacer « ${remplacementDe} »`
                : multiple
                  ? 'Ajouter un ou plusieurs exercices'
                  : 'Choisir un exercice'}
            </h3>
            {enRemplacement && schemaOrigine !== 'autre' && (
              <p className="meta selecteur-schema">{LIBELLES_SCHEMA[schemaOrigine]}</p>
            )}
          </div>
          <button type="button" className="btn-icone" aria-label="Fermer" onClick={onFermer}>
            ✕
          </button>
        </div>

        {enRemplacement && onChangeConserverParametres && (
          <label className="case selecteur-conserver">
            <input
              type="checkbox"
              checked={conserverParametres}
              onChange={e => onChangeConserverParametres(e.target.checked)}
            />
            <span>Conserver séries, reps, repos et superset prévus (adapter charge & réglage)</span>
          </label>
        )}

        {/* Onglets de vue rapide */}
        <div className="segments selecteur-vues" role="tablist" aria-label="Vues du sélecteur">
          {enRemplacement && (
            <button
              type="button"
              role="tab"
              aria-selected={vue === 'equivalents' && !q}
              className={vue === 'equivalents' && !q ? 'actif' : ''}
              onClick={() => {
                setRecherche('')
                setVue('equivalents')
              }}
            >
              ⇄ Équivalents ({equivalents.length})
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={vue === 'habituels' && !q}
            className={vue === 'habituels' && !q ? 'actif' : ''}
            onClick={() => {
              setRecherche('')
              setVue('habituels')
            }}
          >
            ↺ Habituels ({nbHabituels})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vue === 'favoris' && !q}
            className={vue === 'favoris' && !q ? 'actif' : ''}
            onClick={() => {
              setRecherche('')
              setVue('favoris')
            }}
          >
            ★ Favoris ({nbFavoris})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={vue === 'tous' || Boolean(q)}
            className={vue === 'tous' || Boolean(q) ? 'actif' : ''}
            onClick={() => setVue('tous')}
          >
            Tous ({exercices.length})
          </button>
        </div>

        {/* Filtres rapides de matériel (Terrain) */}
        <div className="puces selecteur-filtres-mat" role="group" aria-label="Filtre rapide de matériel">
          {[
            { id: 'tous', libelle: 'Tout matériel' },
            { id: 'poids_corps', libelle: 'Poids du corps' },
            { id: 'leger', libelle: 'Haltères / Élastique' },
            ...(exoOrigine?.materiel ? [{ id: 'meme', libelle: `Même (${exoOrigine.materiel})` }] : []),
          ].map(f => (
            <button
              key={f.id}
              type="button"
              className={`puce-choix puce-compacte${filtreMat === f.id ? ' actif' : ''}`}
              aria-pressed={filtreMat === f.id}
              onClick={() => setFiltreMat(f.id as FiltreMateriel)}
            >
              {f.libelle}
            </button>
          ))}
        </div>

        <input
          type="search"
          aria-label="Rechercher un exercice"
          placeholder="Rechercher un exercice, matériel, groupe…"
          value={recherche}
          onChange={e => setRecherche(e.target.value)}
          autoFocus={large}
        />

        {(vue === 'tous' || Boolean(q)) && (
          <div className="grille-2 selecteur-filtres-grille">
            <select aria-label="Filtrer par groupe" value={groupe} onChange={e => setGroupe(e.target.value)}>
              <option value="">Tous les groupes</option>
              {groupesDisponibles.map(g => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <select aria-label="Filtrer par muscle" value={muscle} onChange={e => setMuscle(e.target.value)}>
              <option value="">Tous les muscles</option>
              {Object.entries(MUSCLES).map(([k, libelle]) => (
                <option key={k} value={k}>
                  {libelle}
                </option>
              ))}
            </select>
          </div>
        )}

        <ul className="selecteur-liste">
          {q && !existe && (
            <li>
              <button
                type="button"
                className="selecteur-btn-choix"
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
            const alertes = zonesSensiblesSollicitees(e, zonesSensibles)
            const coche = selection.includes(e.nom)
            const ordre = coche ? selection.indexOf(e.nom) + 1 : null
            const estFav = favoris.has(normaliser(e.nom))
            const raisons = raisonsMap.get(normaliser(e.nom))
            return (
              <li key={e.nom} className="selecteur-item">
                <button
                  type="button"
                  className={`selecteur-btn-choix${coche ? ' choisi' : ''}`}
                  aria-pressed={multiple ? coche : undefined}
                  onClick={() => clicExercice(e.nom)}
                >
                  <span className="selecteur-ligne-titre">
                    {multiple && (
                      <span className={`selecteur-coche${coche ? ' actif' : ''}`} aria-hidden="true">
                        {ordre ?? '+'}
                      </span>
                    )}
                    <span className="selecteur-nom">{e.nom}</span>
                    {faits.has(normaliser(e.nom)) && <span className="puce deja-fait">Déjà fait</span>}
                    {alertes.length > 0 && (
                      <span className="puce alerte-muscle">
                        ⚠ Sollicite : {alertes.join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="meta">
                    {[
                      ...(vue === 'equivalents' && raisons?.length ? [`✓ ${raisons.join(' · ')}`] : []),
                      e.groupe,
                      e.materiel,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </button>
                <button
                  type="button"
                  className={`btn-icone btn-etoile${estFav ? ' actif' : ''}`}
                  aria-label={estFav ? `Retirer ${e.nom} des favoris` : `Ajouter ${e.nom} aux favoris`}
                  title={estFav ? 'Retirer des favoris' : 'Épingler en favori'}
                  onClick={ev => {
                    ev.stopPropagation()
                    setFavoris(basculerExoFavori(e.nom))
                  }}
                >
                  {estFav ? '★' : '☆'}
                </button>
              </li>
            )
          })}
        </ul>

        {!liste.length && !(q && !existe) && (
          <div className="etat-vide" style={{ padding: '1rem', marginTop: 0 }}>
            <p className="meta">
              {vue === 'favoris'
                ? 'Aucun exercice favori pour l’instant. Touche ☆ à droite d’un exercice pour l’épingler ici.'
                : vue === 'habituels'
                  ? 'Aucun exercice enregistré dans l’historique de ce client.'
                  : 'Aucun exercice ne correspond à ces filtres.'}
            </p>
            {vue !== 'tous' && (
              <button type="button" className="secondaire btn-compact" onClick={() => setVue('tous')}>
                Voir tous les exercices
              </button>
            )}
          </div>
        )}

        <div className="ligne">
          <button type="button" className="secondaire" onClick={onFermer} style={{ flex: 1 }}>
            Fermer
          </button>
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
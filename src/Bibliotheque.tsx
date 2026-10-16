import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { MUSCLES, NIVEAUX, niveauDe, musclesDuGroupe } from './definitions'
import { Champ, EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useNotifier, useOccupe, useSuppressionsEnAttente, useSuppressionTerminee } from './ui'
import LegendeNiveaux from './LegendeNiveaux'
import Icone from './icones'
import { CATALOGUE_EXERCICES, exosManquantsDuCatalogue, importerExercicesCatalogue, type ExerciceCatalogue } from './catalogue-exercices'
import { normaliser } from './SelecteurExercice'

const GROUPES = ['Jambes', 'Fessiers', 'Pectoraux', 'Dos', 'Épaules', 'Bras', 'Abdominaux', 'Corps entier', 'Cardio', 'Mobilité']
const MATERIELS = ['Poids du corps', 'Haltères', 'Kettlebell', 'Élastique', 'Barre de traction', 'Sangles de suspension', 'Chaise / banc', 'Swiss ball', 'Corde à sauter', 'Autre']

type Reference = { id: string; nom: string; groupe: string; materiel: string; notes: string | null; video_url: string | null; exercice_muscles: { muscle: string; coefficient: number }[] }
type Formulaire = { id?: string; ancienNom?: string; nom: string; groupe: string; materiel: string; notes: string; video_url: string; muscles: { muscle: string; coefficient: string }[] }

const vide = (): Formulaire => ({ nom: '', groupe: GROUPES[0], materiel: MATERIELS[0], notes: '', video_url: '', muscles: [] })
const lienSur = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null)

export default function Bibliotheque({ rechercheInitiale = '' }: { rechercheInitiale?: string }) {
  const [liste, setListe] = useState<Reference[]>([])
  const [groupe, setGroupe] = useState('')
  const [recherche, setRecherche] = useState(rechercheInitiale)
  const [form, setForm] = useState<Formulaire | null>(null)
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()
  const [charge, setCharge] = useState(false)
  const notifier = useNotifier()
  const suppressions = useSuppressionsEnAttente()
  const [masques, setMasques] = useState<string[]>([])
  const [ouvrirCatalogue, setOuvrirCatalogue] = useState(false)
  const [rechercheCat, setRechercheCat] = useState('')
  const [filtreCatGroupe, setFiltreCatGroupe] = useState('')

  async function charger() {
    const { data, error } = await supabase.from('bibliotheque_exercices').select('*, exercice_muscles(muscle, coefficient)').order('groupe').order('nom')
    setCharge(true)
    if (error) setErreur(messageErreur(error))
    else setListe(data as Reference[])
  }

  useEffect(() => {
    charger()
  }, [])

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const estCreation = !form.id
    const url = form.video_url.trim()
    if (url && !lienSur(url)) return setErreur('Le lien vidéo doit commencer par http:// ou https://')
    const nouveauNom = form.nom.trim()
    const champs = { nom: nouveauNom, groupe: form.groupe, materiel: form.materiel, notes: form.notes.trim() || null, video_url: url || null }
    const message = (code?: string) => (code === '23505' ? 'Un exercice porte déjà ce nom.' : undefined)

    let id = form.id
    if (id) {
      const { error } = await supabase.from('bibliotheque_exercices').update(champs).eq('id', id)
      if (error) return setErreur(message(error.code) ?? messageErreur(error))
      if (form.ancienNom && form.ancienNom !== nouveauNom) {
        const ancienEchappe = form.ancienNom.replace(/[\\%_]/g, '\\$&')
        const majs = await Promise.all([
          supabase.from('exercices').update({ nom: nouveauNom }).ilike('nom', ancienEchappe),
          supabase.from('modele_exercices').update({ nom: nouveauNom }).ilike('nom', ancienEchappe),
          supabase.from('objectifs').update({ reference: nouveauNom }).eq('source', 'charge').ilike('reference', ancienEchappe),
        ])
        const errCascade = majs.find(r => r.error)?.error
        if (errCascade) return setErreur(messageErreur(errCascade))
      }
    } else {
      const { data, error } = await supabase.from('bibliotheque_exercices').insert(champs).select('id').single()
      if (error) return setErreur(message(error.code) ?? messageErreur(error))
      id = data.id as string
      form.id = id
      form.ancienNom = nouveauNom
      setForm({ ...form, id, ancienNom: nouveauNom })
    }

    const { data: anciensMuscles, error: errAnciens } = await supabase
      .from('exercice_muscles')
      .select('muscle')
      .eq('exercice_id', id)
    if (errAnciens) return setErreur(messageErreur(errAnciens))

    const muscles = [...new Map(form.muscles.filter(m => m.muscle).map(m => [m.muscle, Number(m.coefficient)])).entries()]
    if (muscles.length) {
      const { error: errUpsert } = await supabase
        .from('exercice_muscles')
        .upsert(
          muscles.map(([muscle, coefficient]) => ({ exercice_id: id, muscle, coefficient })),
          { onConflict: 'exercice_id,muscle' },
        )
      if (errUpsert) return setErreur(messageErreur(errUpsert))

      const nouveauxMuscles = new Set(muscles.map(([m]) => m))
      const aSupprimer = (anciensMuscles ?? [])
        .map(a => a.muscle as string)
        .filter(m => !nouveauxMuscles.has(m))
      if (aSupprimer.length) {
        const { error: errDel } = await supabase
          .from('exercice_muscles')
          .delete()
          .eq('exercice_id', id)
          .in('muscle', aSupprimer)
        if (errDel) return setErreur(messageErreur(errDel))
      }
    } else if ((anciensMuscles ?? []).length) {
      const { error: errSuppr } = await supabase.from('exercice_muscles').delete().eq('exercice_id', id)
      if (errSuppr) return setErreur(messageErreur(errSuppr))
    }

    setForm(null)
    setErreur('')
    charger()
    notifier(estCreation ? 'Exercice ajouté' : 'Exercice modifié')
  }

  useSuppressionTerminee(charger)

  function supprimer(x: Reference) {
    supprimerAvecAnnulation({
      id: x.id,
      notifier,
      message: `« ${x.nom} » supprimé`,
      masquer: () => setMasques(l => [...l, x.id]),
      restaurer: () => setMasques(l => l.filter(id => id !== x.id)),
      effacer: async () => {
        const { error } = await supabase.from('bibliotheque_exercices').delete().eq('id', x.id)
        if (!error) charger()
        return error
      },
    })
  }

  const affiches = liste.filter(x => !masques.includes(x.id) && !suppressions.has(x.id) && (!groupe || x.groupe === groupe) && x.nom.toLowerCase().includes(recherche.trim().toLowerCase()))

  const nomsDansBiblio = useMemo(() => new Set(liste.map(e => normaliser(e.nom))), [liste])
  const manquants = useMemo(() => exosManquantsDuCatalogue(liste), [liste])
  const catalogueFiltre = useMemo(() => {
    const q = normaliser(rechercheCat)
    return CATALOGUE_EXERCICES.filter(e => (!filtreCatGroupe || e.groupe === filtreCatGroupe) && (!q || normaliser(e.nom).includes(q) || normaliser(e.notes).includes(q)))
  }, [filtreCatGroupe, rechercheCat])

  async function importerTout() {
    if (!manquants.length) return
    lancer(async () => {
      const res = await importerExercicesCatalogue(manquants)
      if (res.erreur) {
        setErreur(res.erreur)
      } else {
        notifier(`${res.ajoutes} exercice(s) ajouté(s) à la bibliothèque`)
        setOuvrirCatalogue(false)
        charger()
      }
    })
  }

  async function importerUn(exo: ExerciceCatalogue) {
    lancer(async () => {
      const res = await importerExercicesCatalogue([exo])
      if (res.erreur) {
        setErreur(res.erreur)
      } else {
        notifier(`« ${exo.nom} » ajouté à la bibliothèque`)
        charger()
      }
    })
  }

  return (
    <section>
      <h2>Exercices</h2>
      <MessageErreur message={erreur} reessayer={charger} />

      {form ? (
        <div className="carte-section premiere-carte formulaire-etroit" style={{ marginBottom: '1.25rem' }}>
          <h3>{form.id ? "Modifier l'exercice" : 'Nouvel exercice'}</h3>
          <form onSubmit={e => lancer(() => enregistrer(e))}>
            <Champ libelle="Nom"><input autoComplete="off" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required /></Champ>
            <div className="grille-2">
              <Champ libelle="Groupe musculaire"><select value={form.groupe} onChange={e => setForm({ ...form, groupe: e.target.value })}>
                {GROUPES.map(g => <option key={g}>{g}</option>)}
              </select></Champ>
              <Champ libelle="Matériel"><select value={form.materiel} onChange={e => setForm({ ...form, materiel: e.target.value })}>
                {MATERIELS.map(m => <option key={m}>{m}</option>)}
              </select></Champ>
            </div>
            <Champ libelle="Consignes de technique (facultatif)"><textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Champ>
            <Champ libelle="Lien vidéo (facultatif)"><input inputMode="url" type="url" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} /></Champ>
            <fieldset>
              <legend>Muscles sollicités</legend>
              {form.muscles.map((m, i) => (
                <div className="ligne" key={i}>
                  <select aria-label="Muscle" value={m.muscle} onChange={e => setForm({ ...form, muscles: form.muscles.map((x, j) => (j === i ? { ...x, muscle: e.target.value } : x)) })}>
                    {(() => {
                      const duGroupe = musclesDuGroupe(form.groupe)
                      const principaux = Object.entries(MUSCLES).filter(([k]) => duGroupe.includes(k))
                      const autres = Object.entries(MUSCLES).filter(([k]) => !duGroupe.includes(k))
                      return (
                        <>
                          {principaux.length > 0 && (
                            <optgroup label={`Muscles du groupe ${form.groupe}`}>
                              {principaux.map(([k, libelle]) => <option key={k} value={k}>{libelle}</option>)}
                            </optgroup>
                          )}
                          {autres.length > 0 && (
                            <optgroup label="Autres muscles (secondaires / stabilisateurs)">
                              {autres.map(([k, libelle]) => <option key={k} value={k}>{libelle}</option>)}
                            </optgroup>
                          )}
                        </>
                      )
                    })()}
                  </select>
                  <select aria-label="Niveau de sollicitation" value={m.coefficient} onChange={e => setForm({ ...form, muscles: form.muscles.map((x, j) => (j === i ? { ...x, coefficient: e.target.value } : x)) })}>
                    {NIVEAUX.map(n => <option key={n.valeur} value={String(n.valeur)}>{n.libelle}</option>)}
                  </select>
                  <button type="button" className="btn-icone danger" aria-label="Retirer ce muscle" onClick={() => setForm({ ...form, muscles: form.muscles.filter((_, j) => j !== i) })}>✕</button>
                </div>
              ))}
              <button
                type="button"
                className="secondaire"
                onClick={() => {
                  const duGroupe = musclesDuGroupe(form.groupe)
                  const prop = duGroupe.find(k => !form.muscles.some(m => m.muscle === k))
                    ?? Object.keys(MUSCLES).find(k => !form.muscles.some(m => m.muscle === k))
                    ?? 'quadriceps'
                  setForm({ ...form, muscles: [...form.muscles, { muscle: prop, coefficient: form.muscles.length ? '0.5' : '1' }] })
                }}
              >
                + Ajouter un muscle
              </button>
              <p className="champ-aide">Principal : le muscle qui travaille le plus. Secondaire : environ la moitié. Stabilisateur : environ un quart. Ces niveaux pondèrent le calcul des séries par muscle.</p>
            </fieldset>
            <div className="ligne pied-carte">
              <button type="submit" disabled={occupe}>{occupe ? 'Enregistrement…' : form.id ? 'Enregistrer' : "Ajouter l'exercice"}</button>
              <button type="button" className="secondaire" onClick={() => { setForm(null); setErreur('') }}>Annuler</button>
            </div>
          </form>
        </div>
      ) : (
        <div className="ligne" style={{ marginBottom: '.75rem', gap: '.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setForm(vide())}>+ Nouvel exercice</button>
          <button type="button" className="secondaire" onClick={() => setOuvrirCatalogue(true)}>
            + Catalogue recommandé {manquants.length > 0 && `(${manquants.length})`}
          </button>
        </div>
      )}

      <div className="ligne">
        <select aria-label="Filtrer par groupe" value={groupe} onChange={e => setGroupe(e.target.value)}>
          <option value="">Tous les groupes</option>
          {GROUPES.map(g => <option key={g}>{g}</option>)}
        </select>
        <input aria-label="Rechercher un exercice" placeholder="Rechercher…" value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      <LegendeNiveaux />

      {!charge && !erreur && <Squelette lignes={5} />}
      <ul className="liste" hidden={!charge}>
        {affiches.map(x => (
          <li key={x.id}>
            <div>
              <strong>{x.nom}</strong>
              <p className="meta">{x.groupe} · {x.materiel}</p>
              {x.exercice_muscles.length > 0 && (
                <div className="puces">
                  <span className="meta">Muscles :</span>
                  {[...x.exercice_muscles].sort((a, b) => Number(b.coefficient) - Number(a.coefficient)).map(m => (
                    <span key={m.muscle} className={`puce ${niveauDe(Number(m.coefficient))}`}>{MUSCLES[m.muscle] ?? m.muscle}</span>
                  ))}
                </div>
              )}
              {x.notes && <p>{x.notes}</p>}
              {lienSur(x.video_url) && <a href={lienSur(x.video_url)!} target="_blank" rel="noopener noreferrer">Vidéo</a>}
            </div>
            <div className="actions-icone">
              <button
                type="button"
                className="btn-icone"
                aria-label={`Modifier ${x.nom}`}
                title="Modifier l'exercice"
                onClick={() => {
                  setForm({
                    id: x.id,
                    ancienNom: x.nom,
                    nom: x.nom,
                    groupe: x.groupe,
                    materiel: x.materiel,
                    notes: x.notes ?? '',
                    video_url: x.video_url ?? '',
                    muscles: x.exercice_muscles.map(m => ({ muscle: m.muscle, coefficient: String(Number(m.coefficient)) })),
                  })
                  setErreur('')
                }}
              >
                <Icone nom="modifier" />
              </button>
              <button
                type="button"
                className="btn-icone danger"
                aria-label={`Supprimer ${x.nom}`}
                title="Supprimer l'exercice"
                onClick={() => supprimer(x)}
              >
                <Icone nom="supprimer" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      {charge && !affiches.length && (liste.length
        ? <EtatVide titre="Aucun exercice trouvé" texte="Essaie une autre recherche ou un autre groupe." action={{ libelle: 'Réinitialiser les filtres', onClick: () => { setGroupe(''); setRecherche('') } }} />
        : <EtatVide titre="Bibliothèque vide" texte={`Ajoute tes exercices manuellement ou installe le catalogue recommandé pour le coaching à domicile (${CATALOGUE_EXERCICES.length} exercices).`} action={{ libelle: 'Explorer le catalogue recommandé', onClick: () => setOuvrirCatalogue(true) }} />)}

      {ouvrirCatalogue && (
        <div className="voile" onClick={() => setOuvrirCatalogue(false)}>
          <div
            className="feuille selecteur"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalogue-titre"
            onClick={e => e.stopPropagation()}
          >
            <div className="selecteur-entete">
              <div>
                <h3 id="catalogue-titre">Catalogue recommandé ({CATALOGUE_EXERCICES.length})</h3>
                <p className="meta" style={{ margin: '.2rem 0 0' }}>
                  {manquants.length > 0
                    ? `${manquants.length} exercice(s) disponible(s) à ajouter.`
                    : 'Tous les exercices du catalogue sont déjà dans ta bibliothèque.'}
                </p>
              </div>
              <button type="button" className="btn-icone" aria-label="Fermer" onClick={() => setOuvrirCatalogue(false)}>
                ✕
              </button>
            </div>

            <div className="grille-2">
              <select aria-label="Filtrer par groupe" value={filtreCatGroupe} onChange={e => setFiltreCatGroupe(e.target.value)}>
                <option value="">Tous les groupes ({CATALOGUE_EXERCICES.length})</option>
                {GROUPES.map(g => (
                  <option key={g} value={g}>{g} ({CATALOGUE_EXERCICES.filter(x => x.groupe === g).length})</option>
                ))}
              </select>
              <input
                aria-label="Rechercher dans le catalogue"
                placeholder="Rechercher dans le catalogue…"
                value={rechercheCat}
                onChange={e => setRechercheCat(e.target.value)}
              />
            </div>

            {manquants.length > 0 && (
              <div className="ligne" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={occupe}
                  onClick={importerTout}
                >
                  {occupe ? 'Import en cours…' : `Tout ajouter (${manquants.length} nouveaux)`}
                </button>
                <span className="meta">{CATALOGUE_EXERCICES.length - manquants.length} déjà présent(s)</span>
              </div>
            )}

            <ul className="selecteur-liste">
              {catalogueFiltre.map(exo => {
                const dejaPresent = nomsDansBiblio.has(normaliser(exo.nom))
                return (
                  <li key={exo.nom} style={{ padding: '.65rem .5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
                        <strong>{exo.nom}</strong>
                        {dejaPresent ? (
                          <span className="puce stabilisateur">✓ Déjà présent</span>
                        ) : (
                          <span className="puce principal">Nouveau</span>
                        )}
                      </div>
                      <p className="meta" style={{ margin: '.2rem 0' }}>{exo.groupe} · {exo.materiel}</p>
                      {exo.muscles.length > 0 && (
                        <div className="puces" style={{ margin: '.25rem 0' }}>
                          {exo.muscles.map(m => (
                            <span key={m.muscle} className={`puce ${niveauDe(m.coefficient)}`}>
                              {MUSCLES[m.muscle] ?? m.muscle}
                            </span>
                          ))}
                        </div>
                      )}
                      {exo.notes && <p style={{ fontSize: '.85rem', color: 'var(--discret)', margin: '.25rem 0 0' }}>{exo.notes}</p>}
                    </div>

                    {!dejaPresent && (
                      <button
                        type="button"
                        disabled={occupe}
                        className="secondaire"
                        style={{ minHeight: 'auto', padding: '.4rem .75rem', fontSize: '.85rem', flexShrink: 0 }}
                        onClick={() => importerUn(exo)}
                      >
                        + Ajouter
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>

            <div className="ligne pied-carte" style={{ marginTop: '.25rem' }}>
              <button type="button" className="secondaire" onClick={() => setOuvrirCatalogue(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
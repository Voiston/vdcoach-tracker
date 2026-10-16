import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { analyserSupersets, libelleRepos, resumeCardio } from './format'
import FenetreProgrammePdf, { type LigneProgramme } from './ProgrammePdf'
import SelecteurExercice, { type ExoChoix } from './SelecteurExercice'
import Icone from './icones'
import { Champ, EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useNotifier, useOccupe, useSuppressionsEnAttente, useSuppressionTerminee } from './ui'
import { REGLES, verifier } from './validation'

type ModeleExo = LigneProgramme & { id?: string; ordre: number }
type Modele = { id: string; nom: string; duree_min: number | null; modele_exercices: ModeleExo[] }

type LigneEditionModele = {
  nom: string
  series: string
  repetitions: string
  charge_kg: string
  duree_sec: string
  distance_km: string
  repos_sec: string
  reglage: string
  lie_suivant: boolean
}

const CLE_MODELES_FAVORIS = 'vdcoach_modeles_favoris'
const DUREES_RAPIDES = ['30', '45', '60', '75', '90']
const cle = (n: string) => n.trim().toLowerCase()
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))
const txt = (n: number | null | undefined) => (n == null ? '' : String(n))

export function lireModelesFavoris(): Set<string> {
  try {
    const brut = localStorage.getItem(CLE_MODELES_FAVORIS)
    return new Set(brut ? (JSON.parse(brut) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function basculerModeleFavori(id: string): Set<string> {
  const favs = lireModelesFavoris()
  if (favs.has(id)) favs.delete(id)
  else favs.add(id)
  try {
    localStorage.setItem(CLE_MODELES_FAVORIS, JSON.stringify([...favs]))
  } catch {
    /* stockage indisponible */
  }
  return new Set(favs)
}

export default function Modeles() {
  const [modeles, setModeles] = useState<Modele[]>([])
  const [favoris, setFavoris] = useState<Set<string>>(() => lireModelesFavoris())
  const [biblio, setBiblio] = useState<ExoChoix[]>([])
  const [erreur, setErreur] = useState('')
  const [charge, setCharge] = useState(false)
  const notifier = useNotifier()
  const suppressions = useSuppressionsEnAttente()
  const [occupe, lancer] = useOccupe()
  const [modelePdf, setModelePdf] = useState<Modele | null>(null)
  const [masques, setMasques] = useState<string[]>([])

  // État de l'éditeur complet (création ou modification d'un modèle)
  const [editeurOuvert, setEditeurOuvert] = useState(false)
  const [idEdition, setIdEdition] = useState<string | null>(null)
  const [nomEdition, setNomEdition] = useState('')
  const [dureeEdition, setDureeEdition] = useState('60')
  const [lignesEdition, setLignesEdition] = useState<LigneEditionModele[]>([])
  const [cibleSelecteur, setCibleSelecteur] = useState<'ajout' | number | null>(null)
  const [erreurEdition, setErreurEdition] = useState('')

  async function charger() {
    const { data, error } = await supabase
      .from('modeles')
      .select('id, nom, duree_min, modele_exercices(id, ordre, nom, series, repetitions, charge_kg, duree_sec, duree_min, distance_km, reglage, lie_suivant, repos_sec)')
      .order('nom')
    setCharge(true)
    if (error) setErreur(messageErreur(error))
    else setModeles(data as unknown as Modele[])
  }

  async function chargerBibliotheque() {
    const { data } = await supabase
      .from('bibliotheque_exercices')
      .select('nom, groupe, materiel, exercice_muscles(muscle, coefficient)')
      .order('nom')
    setBiblio(
      (data ?? []).map(x => ({
        nom: x.nom as string,
        groupe: x.groupe as string,
        materiel: x.materiel as string,
        muscles: (x.exercice_muscles ?? []) as { muscle: string; coefficient: number }[],
      })),
    )
  }

  useEffect(() => {
    charger()
    chargerBibliotheque()
  }, [])

  const estCardio = (nom: string) => biblio.find(b => cle(b.nom) === cle(nom))?.groupe === 'Cardio'

  function creerLigneDefaut(nom: string): LigneEditionModele {
    const cardio = estCardio(nom)
    return {
      nom,
      series: '3',
      repetitions: cardio ? '' : '10',
      charge_kg: '',
      duree_sec: cardio ? '30' : '',
      distance_km: '',
      repos_sec: '60',
      reglage: '',
      lie_suivant: false,
    }
  }

  function ouvrirCreation() {
    setIdEdition(null)
    setNomEdition('')
    setDureeEdition('60')
    setLignesEdition([])
    setErreurEdition('')
    setEditeurOuvert(true)
  }

  function ouvrirModification(m: Modele) {
    const exos = [...m.modele_exercices].sort((a, b) => a.ordre - b.ordre)
    setIdEdition(m.id)
    setNomEdition(m.nom)
    setDureeEdition(txt(m.duree_min ?? 60))
    setLignesEdition(
      exos.map(x => ({
        nom: x.nom,
        series: txt(x.series ?? 3),
        repetitions: txt(x.repetitions),
        charge_kg: txt(x.charge_kg),
        duree_sec: txt(x.duree_sec ?? (x.duree_min != null ? x.duree_min * 60 : null)),
        distance_km: txt(x.distance_km),
        repos_sec: txt(x.repos_sec),
        reglage: x.reglage ?? '',
        lie_suivant: Boolean(x.lie_suivant),
      })),
    )
    setErreurEdition('')
    setEditeurOuvert(true)
  }

  function fermerEditeur() {
    setEditeurOuvert(false)
    setIdEdition(null)
    setErreurEdition('')
  }

  function ajouterNoms(noms: string[]) {
    if (typeof cibleSelecteur === 'number') {
      const nouveauNom = noms[0]
      if (nouveauNom) {
        setLignesEdition(l => l.map((x, idx) => (idx === cibleSelecteur ? { ...x, nom: nouveauNom } : x)))
      }
    } else {
      setLignesEdition(l => [...l, ...noms.map(creerLigneDefaut)])
    }
    setCibleSelecteur(null)
  }

  function majLigne<K extends keyof LigneEditionModele>(i: number, champ: K, valeur: LigneEditionModele[K]) {
    setLignesEdition(l => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))
  }

  function deplacerLigne(i: number, delta: -1 | 1) {
    const cible = i + delta
    if (cible < 0 || cible >= lignesEdition.length) return
    setLignesEdition(l => {
      const copie = [...l]
      const [elem] = copie.splice(i, 1)
      copie.splice(cible, 0, elem)
      return copie
    })
  }

  function retirerLigne(i: number) {
    setLignesEdition(l => l.filter((_, j) => j !== i))
  }

  const invalide =
    verifier(dureeEdition, REGLES.duree) ||
    !nomEdition.trim() ||
    !lignesEdition.length ||
    lignesEdition.some(
      l =>
        verifier(l.series, REGLES.series) ||
        verifier(l.repetitions, REGLES.repetitions) ||
        verifier(l.duree_sec, REGLES.duree_sec) ||
        verifier(l.repos_sec, REGLES.duree_sec) ||
        verifier(l.charge_kg, REGLES.charge) ||
        verifier(l.distance_km, REGLES.distance),
    )

  async function enregistrerModele(commeNouveau = false) {
    const nom = nomEdition.trim()
    if (!nom) return setErreurEdition('Donne un nom au modèle.')
    if (!lignesEdition.length) return setErreurEdition('Ajoute au moins un exercice.')

    const errDuree = verifier(dureeEdition, REGLES.duree)
    if (errDuree) return setErreurEdition(`Durée : ${errDuree}`)

    for (const [idx, l] of lignesEdition.entries()) {
      const err =
        verifier(l.series, REGLES.series) ||
        verifier(l.repetitions, REGLES.repetitions) ||
        verifier(l.duree_sec, REGLES.duree_sec) ||
        verifier(l.repos_sec, REGLES.duree_sec) ||
        verifier(l.charge_kg, REGLES.charge) ||
        verifier(l.distance_km, REGLES.distance)
      if (err) {
        return setErreurEdition(`Exercice « ${l.nom || `#${idx + 1}`} » : ${err}`)
      }
    }

    const cibleId = commeNouveau ? null : idEdition
    const nomFinal = commeNouveau && idEdition ? `${nom} (variante)` : nom

    let modeleId = cibleId
    let anciensIds: string[] = []

    if (modeleId) {
      const { error } = await supabase
        .from('modeles')
        .update({ nom: nomFinal, duree_min: num(dureeEdition) })
        .eq('id', modeleId)
      if (error) return setErreurEdition(messageErreur(error))

      const { data: anciensExos, error: errAnciens } = await supabase
        .from('modele_exercices')
        .select('id')
        .eq('modele_id', modeleId)
      if (errAnciens) return setErreurEdition(messageErreur(errAnciens))
      anciensIds = (anciensExos ?? []).map(x => x.id as string)
    } else {
      const { data, error } = await supabase
        .from('modeles')
        .insert({ nom: nomFinal, duree_min: num(dureeEdition) })
        .select('id')
        .single()
      if (error) return setErreurEdition(messageErreur(error))
      modeleId = data.id as string
    }

    const lignesDb = lignesEdition.map((l, i) => ({
      modele_id: modeleId,
      ordre: i,
      nom: l.nom.trim(),
      series: num(l.series),
      repetitions: num(l.repetitions),
      charge_kg: num(l.charge_kg),
      duree_sec: num(l.duree_sec),
      duree_min: null,
      distance_km: num(l.distance_km),
      repos_sec: num(l.repos_sec),
      reglage: l.reglage.trim() || null,
      lie_suivant: i < lignesEdition.length - 1 ? l.lie_suivant : false,
    }))

    let nouveauxIds: string[] = []
    if (lignesDb.length) {
      const { data: crees, error: errExos } = await supabase
        .from('modele_exercices')
        .insert(lignesDb)
        .select('id')
      if (errExos) {
        if (!cibleId && modeleId) await supabase.from('modeles').delete().eq('id', modeleId)
        return setErreurEdition(messageErreur(errExos))
      }
      nouveauxIds = (crees ?? []).map(x => x.id as string)
    }

    if (anciensIds.length) {
      const { error: errDel } = await supabase.from('modele_exercices').delete().in('id', anciensIds)
      if (errDel) {
        if (nouveauxIds.length) await supabase.from('modele_exercices').delete().in('id', nouveauxIds)
        return setErreurEdition(messageErreur(errDel))
      }
    }

    setEditeurOuvert(false)
    setIdEdition(null)
    setErreurEdition('')
    charger()
    notifier(cibleId ? `Modèle « ${nomFinal} » mis à jour` : `Modèle « ${nomFinal} » créé`)
  }

  async function dupliquerModele(m: Modele) {
    const nouveauNom = `${m.nom} (copie)`
    const { data, error } = await supabase
      .from('modeles')
      .insert({ nom: nouveauNom, duree_min: m.duree_min })
      .select('id')
      .single()
    if (error) return setErreur(messageErreur(error))

    const exos = [...m.modele_exercices].sort((a, b) => a.ordre - b.ordre)
    if (exos.length > 0) {
      const lignes = exos.map((x, i) => ({
        modele_id: data.id,
        ordre: i,
        nom: x.nom,
        series: x.series ?? 3,
        repetitions: x.repetitions ?? null,
        charge_kg: x.charge_kg ?? null,
        duree_sec: x.duree_sec ?? null,
        duree_min: x.duree_min ?? null,
        distance_km: x.distance_km ?? null,
        repos_sec: x.repos_sec ?? null,
        reglage: x.reglage ?? null,
        lie_suivant: Boolean(x.lie_suivant),
      }))
      const { error: errExos } = await supabase.from('modele_exercices').insert(lignes)
      if (errExos) {
        await supabase.from('modeles').delete().eq('id', data.id)
        return setErreur(messageErreur(errExos))
      }
    }
    await charger()
    notifier(`« ${nouveauNom} » créé`)
  }

  useSuppressionTerminee(charger)

  function supprimer(m: Modele) {
    supprimerAvecAnnulation({
      id: m.id,
      notifier,
      message: `Modèle « ${m.nom} » supprimé`,
      masquer: () => setMasques(l => [...l, m.id]),
      restaurer: () => setMasques(l => l.filter(id => id !== m.id)),
      effacer: async () => (await supabase.from('modeles').delete().eq('id', m.id)).error,
    })
  }

  const visibles = [...modeles]
    .filter(m => !masques.includes(m.id) && !suppressions.has(m.id))
    .sort((a, b) => Number(favoris.has(b.id)) - Number(favoris.has(a.id)) || a.nom.localeCompare(b.nom, 'fr'))

  const supersetsEdition = analyserSupersets(lignesEdition)

  return (
    <section>
      <div className="entete-section entete-colonne">
        <h3>Modèles de séance</h3>
        {!editeurOuvert && (
          <button type="button" className="secondaire btn-compact" onClick={ouvrirCreation}>
            + Nouveau modèle
          </button>
        )}
      </div>

      {editeurOuvert && (
        <div className="carte-section">
          <h3>{idEdition ? 'Modifier le modèle' : 'Nouveau modèle'}</h3>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!invalide) lancer(() => enregistrerModele(false))
            }}
          >
            <div className="grille-2">
              <Champ libelle="Nom du modèle">
                <input autoFocus placeholder="Ex. Full body A" value={nomEdition} onChange={e => setNomEdition(e.target.value)} />
              </Champ>
              <div className="champ">
                <span className="champ-libelle">Durée prévue (min)</span>
                <div className="durees-rapides">
                  {DUREES_RAPIDES.map(d => (
                    <button
                      key={d}
                      type="button"
                      className={`puce-choix${dureeEdition === d ? ' actif' : ''}`}
                      onClick={() => setDureeEdition(dureeEdition === d ? '' : d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="champ">
              <span className="champ-libelle">Exercices ({lignesEdition.length})</span>
              {lignesEdition.length > 0 && (
                <div className="modele-editeur-liste">
                  {lignesEdition.map((l, i) => {
                    const sup = supersetsEdition[i]
                    return (
                      <div key={`${l.nom}-${i}`} className={`modele-editeur-item${sup.groupe !== null ? ` grp-sup-${sup.groupe}` : ''}`}>
                        <div className="modele-editeur-entete">
                          {sup.etiquette && <span className="puce superset-mini superset-badge">{sup.etiquette}</span>}
                          <button
                            type="button"
                            className="lien modele-editeur-nom"
                            title="Cliquer pour remplacer cet exercice"
                            onClick={() => setCibleSelecteur(i)}
                          >
                            <strong>{l.nom}</strong> <span>⇄</span>
                          </button>
                          <div className="actions-icone">
                            {i > 0 && (
                              <button type="button" className="btn-icone" aria-label="Monter" onClick={() => deplacerLigne(i, -1)}>↑</button>
                            )}
                            {i < lignesEdition.length - 1 && (
                              <button type="button" className="btn-icone" aria-label="Descendre" onClick={() => deplacerLigne(i, 1)}>↓</button>
                            )}
                            <button type="button" className="btn-icone danger" aria-label={`Retirer ${l.nom}`} onClick={() => retirerLigne(i)}>✕</button>
                          </div>
                        </div>

                        <div className="modele-editeur-champs">
                          <label className={verifier(l.series, REGLES.series) ? 'invalide' : ''}>
                            <span>Séries</span>
                            <input
                              inputMode="numeric"
                              placeholder="3"
                              value={l.series}
                              onChange={e => majLigne(i, 'series', e.target.value)}
                              aria-invalid={Boolean(verifier(l.series, REGLES.series))}
                            />
                            {verifier(l.series, REGLES.series) && (
                              <span className="champ-erreur" role="alert">{verifier(l.series, REGLES.series)}</span>
                            )}
                          </label>
                          <label className={verifier(l.repetitions, REGLES.repetitions) ? 'invalide' : ''}>
                            <span>Reps</span>
                            <input
                              inputMode="numeric"
                              placeholder="10"
                              value={l.repetitions}
                              onChange={e => majLigne(i, 'repetitions', e.target.value)}
                              aria-invalid={Boolean(verifier(l.repetitions, REGLES.repetitions))}
                            />
                            {verifier(l.repetitions, REGLES.repetitions) && (
                              <span className="champ-erreur" role="alert">{verifier(l.repetitions, REGLES.repetitions)}</span>
                            )}
                          </label>
                          <label className={verifier(l.duree_sec, REGLES.duree_sec) ? 'invalide' : ''}>
                            <span>Temps (s)</span>
                            <input
                              inputMode="numeric"
                              placeholder="—"
                              value={l.duree_sec}
                              onChange={e => majLigne(i, 'duree_sec', e.target.value)}
                              aria-invalid={Boolean(verifier(l.duree_sec, REGLES.duree_sec))}
                            />
                            {verifier(l.duree_sec, REGLES.duree_sec) && (
                              <span className="champ-erreur" role="alert">{verifier(l.duree_sec, REGLES.duree_sec)}</span>
                            )}
                          </label>
                          <label className={verifier(l.repos_sec, REGLES.duree_sec) ? 'invalide' : ''}>
                            <span>Repos (s)</span>
                            <input
                              inputMode="numeric"
                              placeholder="60"
                              value={l.repos_sec}
                              onChange={e => majLigne(i, 'repos_sec', e.target.value)}
                              aria-invalid={Boolean(verifier(l.repos_sec, REGLES.duree_sec))}
                            />
                            {verifier(l.repos_sec, REGLES.duree_sec) && (
                              <span className="champ-erreur" role="alert">{verifier(l.repos_sec, REGLES.duree_sec)}</span>
                            )}
                          </label>
                        </div>

                        <div className="ligne" style={{ marginTop: '.25rem', flexWrap: 'wrap' }}>
                          <input
                            className="champ-reglage"
                            style={{ flex: 1, minHeight: '2.2rem', fontSize: '.82rem' }}
                            placeholder="⚙ Consigne ou réglage type…"
                            value={l.reglage}
                            onChange={e => majLigne(i, 'reglage', e.target.value)}
                          />
                          {i < lignesEdition.length - 1 && (
                            <button
                              type="button"
                              className={`lien superset-lien${l.lie_suivant ? ' actif' : ''}`}
                              onClick={() => majLigne(i, 'lie_suivant', !l.lie_suivant)}
                            >
                              {l.lie_suivant ? '⛓ Superset' : '+ Superset'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
              <button type="button" className="secondaire" onClick={() => setCibleSelecteur('ajout')}>
                + Ajouter des exercices
              </button>
            </div>

            <MessageErreur message={erreurEdition} />
            <div className="ligne pied-carte" style={{ flexWrap: 'wrap' }}>
              <button type="submit" disabled={occupe || Boolean(invalide)}>
                {occupe ? 'Enregistrement…' : idEdition ? 'Enregistrer les modifications' : 'Créer le modèle'}
              </button>
              {idEdition && (
                <button
                  type="button"
                  className="secondaire"
                  disabled={occupe || Boolean(invalide)}
                  onClick={() => lancer(() => enregistrerModele(true))}
                >
                  Enregistrer comme nouveau
                </button>
              )}
              <button type="button" className="secondaire" onClick={fermerEditeur}>
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      <MessageErreur message={erreur} reessayer={charger} />
      {!charge && !erreur && <Squelette lignes={2} />}
      {charge && !visibles.length && !erreur && !editeurOuvert && (
        <EtatVide
          titre="Aucun modèle"
          texte="Un modèle regroupe les exercices d'une séance type pour la retrouver en un clic."
          action={{ libelle: '+ Nouveau modèle', onClick: ouvrirCreation }}
        />
      )}

      <ul className="liste" hidden={!charge}>
        {visibles.map(m => {
          const exos = [...m.modele_exercices].sort((a, b) => a.ordre - b.ordre)
          const supersets = analyserSupersets(exos)
          const estFav = favoris.has(m.id)
          return (
            <li key={m.id}>
              <div>
                <div className="modele-entete">
                  <div>
                    <strong>
                      {estFav && <span style={{ color: 'var(--accent)', marginRight: '.3rem' }}>★</span>}
                      {m.nom}
                    </strong>
                    <p className="meta">
                      {exos.length} exercice(s){m.duree_min ? ` · ${m.duree_min} min` : ''}
                    </p>
                  </div>
                  <div className="actions-icone">
                    <button
                      type="button"
                      className={`btn-icone btn-etoile${estFav ? ' actif' : ''}`}
                      aria-label={estFav ? `Retirer ${m.nom} des favoris` : `Épingler ${m.nom} en favori`}
                      title={estFav ? 'Retirer des favoris' : 'Épingler en favori (accès 1-clic en séance)'}
                      onClick={() => setFavoris(basculerModeleFavori(m.id))}
                    >
                      {estFav ? '★' : '☆'}
                    </button>
                    <button
                      type="button"
                      className="btn-icone"
                      aria-label={`Dupliquer ${m.nom}`}
                      title="Dupliquer ce modèle"
                      onClick={() => lancer(() => dupliquerModele(m))}
                    >
                      ⎘
                    </button>
                    <button
                      type="button"
                      className="btn-icone"
                      aria-label={`Modifier ${m.nom}`}
                      title="Modifier les exercices et paramètres du modèle"
                      onClick={() => ouvrirModification(m)}
                    >
                      <Icone nom="modifier" />
                    </button>
                    <button
                      type="button"
                      className="btn-icone danger"
                      aria-label={`Supprimer ${m.nom}`}
                      title="Supprimer le modèle"
                      onClick={() => supprimer(m)}
                    >
                      <Icone nom="supprimer" />
                    </button>
                  </div>
                </div>

                <div className="modele-liste-exos">
                  {exos.map((x, idx) => {
                    const cardioTxt = resumeCardio(x)
                    const reposTxt = libelleRepos(x.repos_sec)
                    const sup = supersets[idx]
                    return (
                      <p key={idx} className={`meta${sup.groupe !== null ? ` ligne-sup grp-sup-${sup.groupe}` : ''}`}>
                        {sup.etiquette && <span className="puce superset-mini superset-badge">{sup.etiquette}</span>}
                        {x.nom}
                        {x.series && x.repetitions ? ` — ${x.series}×${x.repetitions}` : ''}
                        {cardioTxt ? ` — ${cardioTxt}` : ''}
                        {reposTxt ? ` · repos ${reposTxt}` : ''}
                        {x.reglage ? ` (${x.reglage})` : ''}
                      </p>
                    )
                  })}
                </div>

                <div className="ligne pied-carte" style={{ flexWrap: 'wrap' }}>
                  <button type="button" className="secondaire btn-compact" onClick={() => ouvrirModification(m)}>
                    Modifier les exercices
                  </button>
                  {exos.length > 0 && (
                    <button type="button" className="secondaire btn-compact" onClick={() => setModelePdf(m)}>
                      <Icone nom="pdf" />
                      PDF
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {modelePdf && (
        <FenetreProgrammePdf
          titreInitial={modelePdf.nom}
          lignes={[...modelePdf.modele_exercices].sort((a, b) => a.ordre - b.ordre)}
          onFermer={() => setModelePdf(null)}
        />
      )}
      {cibleSelecteur !== null && (
        <SelecteurExercice
          exercices={biblio}
          faits={new Set<string>()}
          multiple={cibleSelecteur === 'ajout'}
          remplacementDe={typeof cibleSelecteur === 'number' ? lignesEdition[cibleSelecteur]?.nom : null}
          onChoisir={n => ajouterNoms([n])}
          onChoisirMultiple={ajouterNoms}
          onFermer={() => setCibleSelecteur(null)}
        />
      )}
    </section>
  )
}
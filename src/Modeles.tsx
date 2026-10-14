import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { analyserSupersets, resumeCardio } from './format'
import FenetreProgrammePdf, { type LigneProgramme } from './ProgrammePdf'
import SelecteurExercice, { type ExoChoix } from './SelecteurExercice'
import Icone from './icones'
import { Champ, EtatVide, FeuilleSaisie, MessageErreur, Squelette, supprimerAvecAnnulation, useNotifier, useOccupe } from './ui'

type ModeleExo = LigneProgramme & { ordre: number }
type Modele = { id: string; nom: string; duree_min: number | null; modele_exercices: ModeleExo[] }

const cle = (n: string) => n.trim().toLowerCase()

export default function Modeles() {
  const [modeles, setModeles] = useState<Modele[]>([])
  const [biblio, setBiblio] = useState<ExoChoix[]>([])
  const [erreur, setErreur] = useState('')
  const [charge, setCharge] = useState(false)
  const notifier = useNotifier()
  const [occupe, lancer] = useOccupe()
  const [enRenommage, setEnRenommage] = useState<Modele | null>(null)
  const [modelePdf, setModelePdf] = useState<Modele | null>(null)
  const [masques, setMasques] = useState<string[]>([])

  const [creation, setCreation] = useState(false)
  const [nomNouveau, setNomNouveau] = useState('')
  const [nomsChoisis, setNomsChoisis] = useState<string[]>([])
  const [selecteurOuvert, setSelecteurOuvert] = useState(false)
  const [erreurCreation, setErreurCreation] = useState('')

  async function charger() {
    const { data, error } = await supabase
      .from('modeles')
      .select('id, nom, duree_min, modele_exercices(ordre, nom, series, repetitions, charge_kg, duree_sec, duree_min, distance_km, reglage, lie_suivant)')
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

  function ouvrirCreation() {
    setCreation(true)
    setNomNouveau('')
    setNomsChoisis([])
    setErreurCreation('')
  }

  function fermerCreation() {
    setCreation(false)
    setErreurCreation('')
  }

  function ajouterNoms(noms: string[]) {
    setNomsChoisis(l => [...l, ...noms.filter(n => !l.includes(n))])
    setSelecteurOuvert(false)
  }

  function retirerNom(i: number) {
    setNomsChoisis(l => l.filter((_, j) => j !== i))
  }

  async function enregistrerNouveau(e: React.FormEvent) {
    e.preventDefault()
    const nom = nomNouveau.trim()
    if (!nom) return setErreurCreation('Donne un nom au modèle.')
    if (!nomsChoisis.length) return setErreurCreation('Ajoute au moins un exercice.')

    const { data, error } = await supabase.from('modeles').insert({ nom }).select('id').single()
    if (error) return setErreurCreation(messageErreur(error))

    const lignes = nomsChoisis.map((n, i) => ({
      modele_id: data.id,
      ordre: i,
      nom: n,
      series: 3,
      repetitions: estCardio(n) ? null : 10,
      charge_kg: null,
      duree_sec: estCardio(n) ? 30 : null,
      duree_min: null,
      distance_km: null,
      reglage: null,
      lie_suivant: false,
    }))
    const { error: errExos } = await supabase.from('modele_exercices').insert(lignes)
    if (errExos) {
      await supabase.from('modeles').delete().eq('id', data.id)
      return setErreurCreation(messageErreur(errExos))
    }

    setCreation(false)
    setErreurCreation('')
    charger()
    notifier(`Modèle « ${nom} » créé`)
  }

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
      <div className="entete-section entete-colonne">
        <h3>Modèles de séance</h3>
        {!creation && (
          <button type="button" className="secondaire btn-compact" onClick={ouvrirCreation}>
            + Nouveau modèle
          </button>
        )}
      </div>

      {creation && (
        <div className="carte-section">
          <h3>Nouveau modèle</h3>
          <form onSubmit={e => lancer(() => enregistrerNouveau(e))}>
            <Champ libelle="Nom du modèle">
              <input autoFocus placeholder="Ex. Full body A" value={nomNouveau} onChange={e => setNomNouveau(e.target.value)} />
            </Champ>
            <div className="champ">
              <span className="champ-libelle">Exercices ({nomsChoisis.length})</span>
              {nomsChoisis.length > 0 && (
                <ol className="modele-exos">
                  {nomsChoisis.map((n, i) => (
                    <li key={`${n}-${i}`}>
                      <span>{n}</span>
                      <button type="button" className="btn-icone danger" aria-label={`Retirer ${n}`} onClick={() => retirerNom(i)}>✕</button>
                    </li>
                  ))}
                </ol>
              )}
              <button type="button" className="secondaire" onClick={() => setSelecteurOuvert(true)}>+ Ajouter des exercices</button>
            </div>
            <p className="meta">Par défaut : 3 séries de 10 répétitions (30 s pour le cardio). Tu ajusteras les charges pendant la séance.</p>
            <MessageErreur message={erreurCreation} />
            <div className="ligne pied-carte">
              <button type="submit" disabled={occupe}>{occupe ? 'Création…' : 'Créer le modèle'}</button>
              <button type="button" className="secondaire" onClick={fermerCreation}>Annuler</button>
            </div>
          </form>
        </div>
      )}

      <MessageErreur message={erreur} reessayer={charger} />
      {!charge && !erreur && <Squelette lignes={2} />}
      {charge && !visibles.length && !erreur && !creation && (
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
          return (
            <li key={m.id}>
              <div>
                <div className="modele-entete">
                  <div>
                    <strong>{m.nom}</strong>
                    <p className="meta">
                      {exos.length} exercice(s){m.duree_min ? ` · ${m.duree_min} min` : ''}
                    </p>
                  </div>
                  <div className="actions-icone">
                    <button
                      type="button"
                      className="btn-icone"
                      aria-label={`Renommer ${m.nom}`}
                      title="Renommer le modèle"
                      onClick={() => setEnRenommage(m)}
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
                    const sup = supersets[idx]
                    return (
                      <p key={idx} className={`meta${sup.groupe !== null ? ` ligne-sup grp-sup-${sup.groupe}` : ''}`}>
                        {sup.etiquette && <span className="puce superset-mini superset-badge">{sup.etiquette}</span>}
                        {x.nom}
                        {x.series && x.repetitions ? ` — ${x.series}×${x.repetitions}` : ''}
                        {cardioTxt ? ` — ${cardioTxt}` : ''}
                      </p>
                    )
                  })}
                </div>

                {exos.length > 0 && (
                  <div className="pied-carte">
                    <button type="button" className="secondaire btn-pdf" onClick={() => setModelePdf(m)}>
                      <Icone nom="pdf" />
                      Programme PDF
                    </button>
                  </div>
                )}
              </div>
            </li>
          )
        })}
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
      {modelePdf && (
        <FenetreProgrammePdf
          titreInitial={modelePdf.nom}
          lignes={[...modelePdf.modele_exercices].sort((a, b) => a.ordre - b.ordre)}
          onFermer={() => setModelePdf(null)}
        />
      )}
      {selecteurOuvert && (
        <SelecteurExercice
          exercices={biblio}
          faits={new Set<string>()}
          multiple
          onChoisir={n => ajouterNoms([n])}
          onChoisirMultiple={ajouterNoms}
          onFermer={() => setSelecteurOuvert(false)}
        />
      )}
    </section>
  )
}

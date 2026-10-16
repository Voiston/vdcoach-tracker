import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { verifier } from './validation'
import { messageErreur } from './erreurs'
import { Champ, EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useClient, useNotifier, useOccupe, useSuppressionsEnAttente, useSuppressionTerminee } from './ui'
import { TYPES, TESTS } from './definitions'
import JaugeObjectif from './JaugeObjectif'
import Icone from './icones'
import { chargerObjectifs, libelle, unite, valeurActuelle, type Objectif, type Source } from './objectifs-lib'

const SOURCES: Record<Source, string> = { mesure: 'Mesure corporelle', charge: 'Charge sur un exercice', test: 'Test physique' }
const nombre = (v: string) => (v.trim() === '' ? NaN : Number(v.replace(',', '.')))

export default function Objectifs() {
  const [pret, setPret] = useState(false)
  const clientId = useClient().id
  const [objectifs, setObjectifs] = useState<Objectif[]>([])
  const [derniereMesure, setDerniereMesure] = useState<Record<string, number>>({})
  const [meilleureCharge, setMeilleureCharge] = useState<Record<string, number>>({})
  const [noms, setNoms] = useState<string[]>([])
  const [formOuvert, setFormOuvert] = useState(false)
  const [source, setSource] = useState<Source>('mesure')
  const [ref, setRef] = useState('poids')
  const [depart, setDepart] = useState('')
  const [cible, setCible] = useState('')
  const [echeance, setEcheance] = useState('')
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()
  const notifier = useNotifier()
  const suppressions = useSuppressionsEnAttente()
  const [masquees, setMasquees] = useState<string[]>([])
  const regle = { min: ref === 'test_souplesse' ? -50 : 0, max: 10000 }

  useEffect(() => {
    supabase.from('bibliotheque_exercices').select('nom').then(({ data }) =>
      setNoms(prec => [...new Set([...prec, ...(data ?? []).map(x => x.nom as string)])].sort()))
  }, [])

  async function charger() {
    const { donnees, erreur: err } = await chargerObjectifs(clientId)
    setPret(true)
    if (err || !donnees) return setErreur(messageErreur(err))
    setErreur('')
    setObjectifs(donnees.objectifs)
    setDerniereMesure(donnees.derniereMesure)
    setMeilleureCharge(donnees.meilleureCharge)
    setNoms(prec => [...new Set([...prec, ...donnees.nomsExercices])].sort())
  }

  useEffect(() => {
    setPret(false)
    charger()
  }, [clientId])

  const actuelle = (s: Source, r: string) => valeurActuelle({ derniereMesure, meilleureCharge }, s, r)

  function viser(s: Source, r: string) {
    setSource(s)
    setRef(r)
    const v = actuelle(s, r)
    setDepart(v === null ? '' : String(v))
  }

  function changerSource(s: Source) {
    viser(s, s === 'charge' ? '' : Object.keys(s === 'mesure' ? TYPES : TESTS)[0])
  }

  function ouvrirFormulaire() {
    setErreur('')
    setFormOuvert(true)
  }

  function fermerFormulaire() {
    setCible('')
    setEcheance('')
    setErreur('')
    setFormOuvert(false)
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault()
    if (verifier(depart, regle) || verifier(cible, regle)) return
    const dep = nombre(depart)
    const cib = nombre(cible)
    if (!ref.trim() || Number.isNaN(dep) || Number.isNaN(cib)) return setErreur('Complète la référence, le départ et la cible.')
    if (dep === cib) return setErreur('Le départ et la cible doivent être différents.')
    const { error } = await supabase
      .from('objectifs')
      .insert({ client_id: clientId, source, reference: ref.trim(), valeur_depart: dep, valeur_cible: cib, echeance: echeance || null })
    if (error) return setErreur(messageErreur(error))
    setCible('')
    setEcheance('')
    setErreur('')
    setFormOuvert(false)
    charger()
    notifier('Objectif ajouté')
  }

  useSuppressionTerminee(charger)

  function supprimer(o: Objectif) {
    supprimerAvecAnnulation({
      id: o.id,
      notifier,
      message: `Objectif « ${libelle(o.source, o.reference)} » supprimé`,
      masquer: () => setMasquees(l => [...l, o.id]),
      restaurer: () => setMasquees(l => l.filter(id => id !== o.id)),
      effacer: async () => {
        const { error } = await supabase.from('objectifs').delete().eq('id', o.id)
        if (!error) charger()
        return error
      },
    })
  }

  const visibles = objectifs.filter(o => !masquees.includes(o.id) && !suppressions.has(o.id))

  return (
    <section className="formulaire-etroit">
      <MessageErreur message={erreur} reessayer={charger} />

      {!pret && <Squelette lignes={2} />}
      <ul className="liste" hidden={!pret || !visibles.length}>
        {visibles.map(o => (
          <li key={o.id}>
            <JaugeObjectif objectif={o} actuelle={actuelle(o.source, o.reference)} />
            <button
              type="button"
              className="btn-icone danger"
              aria-label={`Supprimer l'objectif ${libelle(o.source, o.reference)}`}
              title="Supprimer l'objectif"
              onClick={() => supprimer(o)}
            >
              <Icone nom="supprimer" />
            </button>
          </li>
        ))}
      </ul>

      {pret && !visibles.length && !formOuvert && (
        <EtatVide
          titre="Aucun objectif"
          texte="Fixe une cible chiffrée (poids, charge, test physique) et suis la progression ici."
          action={{ libelle: '+ Nouvel objectif', onClick: ouvrirFormulaire }}
        />
      )}

      {pret && visibles.length > 0 && !formOuvert && (
        <div className="entete-section">
          <button type="button" className="secondaire" onClick={ouvrirFormulaire}>+ Nouvel objectif</button>
        </div>
      )}

      {formOuvert && (
        <div className="carte-section">
          <h3>Nouvel objectif</h3>
          <form onSubmit={e => lancer(() => ajouter(e))}>
            <div className="grille-2">
              <Champ libelle="Type d'objectif">
                <select value={source} onChange={e => changerSource(e.target.value as Source)}>
                  {(Object.keys(SOURCES) as Source[]).map(s => <option key={s} value={s}>{SOURCES[s]}</option>)}
                </select>
              </Champ>
              {source === 'charge' ? (
                <>
                  <Champ libelle="Exercice">
                    <input list="noms-objectifs" value={ref} onChange={e => viser('charge', e.target.value)} />
                  </Champ>
                  <datalist id="noms-objectifs">{noms.map(n => <option key={n} value={n} />)}</datalist>
                </>
              ) : (
                <Champ libelle="Suivi concerné">
                  <select value={ref} onChange={e => viser(source, e.target.value)}>
                    {Object.entries(source === 'mesure' ? TYPES : TESTS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
                  </select>
                </Champ>
              )}
            </div>

            <div className="grille-2">
              <Champ libelle={`Départ (${unite(source, ref)})`} erreur={verifier(depart, regle)}>
                <input inputMode="decimal" value={depart} onChange={e => setDepart(e.target.value)} />
              </Champ>
              <Champ libelle={`Cible (${unite(source, ref)})`} erreur={verifier(cible, regle)}>
                <input inputMode="decimal" value={cible} onChange={e => setCible(e.target.value)} />
              </Champ>
            </div>

            <div className="champ-court">
              <Champ libelle="Échéance (facultatif)">
                <input type="date" value={echeance} onChange={e => setEcheance(e.target.value)} />
              </Champ>
            </div>
            <p className="meta">Le départ est proposé d'après les données du client ; l'échéance est facultative.</p>

            <div className="ligne pied-carte">
              <button type="submit" disabled={occupe || Boolean(verifier(depart, regle) || verifier(cible, regle))}>
                {occupe ? 'Ajout en cours…' : "Ajouter l'objectif"}
              </button>
              <button type="button" className="secondaire" onClick={fermerFormulaire}>Annuler</button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
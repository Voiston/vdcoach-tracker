import { useEffect, useState } from 'react'
import { messageErreur } from './erreurs'
import { ErreurChargement, EtatVide, MessageErreur, Squelette, useAller, useClient } from './ui'
import { MUSCLES, NIVEAUX, niveauDe } from './definitions'
import { calculerMuscles, chargerBibliothequeMuscles, chargerSeancesMuscles, type Reference, type SeanceExo } from './muscles-lib'

const PERIODES = [7, 30, 90]
const fr = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const libelleNiveau = (c: number) => NIVEAUX.find(n => n.valeur === c)?.libelle ?? `×${fr(c)}`

export default function Muscles() {
  const aller = useAller()
  const clientId = useClient().id
  const [jours, setJours] = useState(30)
  const [seances, setSeances] = useState<SeanceExo[]>([])
  const [precedent, setPrecedent] = useState<SeanceExo[]>([]) // même durée, juste avant la période affichée
  const [biblio, setBiblio] = useState<Record<string, Reference> | null>(null)
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    chargerBibliothequeMuscles().then(({ biblio, erreur: err }) => {
      if (err) return setErreur(messageErreur(err))
      setBiblio(biblio ?? {})
    })
  }, [])

  async function charger() {
    const [courante, precedente] = await Promise.all([chargerSeancesMuscles(clientId, jours), chargerSeancesMuscles(clientId, jours, jours)])
    setPret(true)
    const err = courante.erreur ?? precedente.erreur
    if (err || !courante.seances || !precedente.seances) return setErreur(messageErreur(err))
    setErreur('')
    setSeances(courante.seances)
    setPrecedent(precedente.seances)
  }

  useEffect(() => {
    setPret(false)
    charger()
  }, [clientId, jours])

  const { parMuscle, nonClasses, seriesTotal } = calculerMuscles(seances, biblio)

  // Comparaison avec la période précédente (masquée quand il n'y avait rien à comparer)
  const avant = calculerMuscles(precedent, biblio)
  const comparer = avant.seriesTotal > 0
  const evolution = (actuel: number, ancien: number) => Math.round(((actuel - ancien) / ancien) * 100)
  const formatEvolution = (pct: number) => (pct === 0 ? 'stable' : `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)} %`)
  const variation = (muscle: string, actuel: number) => {
    const ancien = avant.parMuscle[muscle]?.total ?? 0
    if (!ancien) return { texte: 'nouveau', classe: 'nouveau' }
    const pct = evolution(actuel, ancien)
    return { texte: formatEvolution(pct), classe: pct > 0 ? 'hausse' : pct < 0 ? 'baisse' : 'stable' }
  }

  const classement = Object.entries(parMuscle).sort((a, b) => b[1].total - a[1].total)
  const maximum = classement[0]?.[1].total ?? 1
  const peuTravailles = Object.keys(MUSCLES).filter(m => !parMuscle[m])
  const lesNonClasses = Object.entries(nonClasses)
  const prete = pret && biblio !== null

  return (
    <section>
      <div className="segments" role="group" aria-label="Période">
        {PERIODES.map(j => (
          <button key={j} type="button" className={j === jours ? 'actif' : ''} aria-pressed={j === jours} onClick={() => setJours(j)}>{j} jours</button>
        ))}
      </div>
      <MessageErreur message={erreur} reessayer={charger} />

      {!prete && !erreur && <Squelette lignes={5} />}
      {prete && !seances.length && (
        <EtatVide
          titre={`Aucune séance sur ${jours} jours`}
          texte="Ce client n'a pas de séance enregistrée sur cette période."
          action={jours < 90 ? { libelle: 'Voir sur 90 jours', onClick: () => setJours(90) } : undefined}
        />
      )}

      {prete && seances.length > 0 && (
        <>
          <p className="meta">
            {seances.length} séance(s) · {seriesTotal} série(s) sur {jours} jours
            {comparer && ` · ${formatEvolution(evolution(seriesTotal, avant.seriesTotal))} par rapport aux ${jours} jours précédents`}
          </p>
          {classement[0] && (
            <p className="muscle-top">
              Le plus travaillé : <strong>{MUSCLES[classement[0][0]] ?? classement[0][0]}</strong> ({fr(classement[0][1].total)} séries pondérées)
            </p>
          )}

          <ul className="muscles">
            {classement.map(([muscle, v]) => (
              <li key={muscle}>
                <details>
                  <summary>
                    <span>{MUSCLES[muscle] ?? muscle}</span>
                    <div className="barre"><i style={{ width: `${(v.total / maximum) * 100}%` }} /></div>
                    <b>
                      {fr(v.total)}<small> séries</small>
                      {comparer && <small className={`delta ${variation(muscle, v.total).classe}`}>{variation(muscle, v.total).texte}</small>}
                    </b>
                  </summary>
                  <ul>
                    {[...v.apports].sort((a, b) => b.series * b.coefficient - a.series * a.coefficient).map(a => (
                      <li key={a.exercice}>
                        {a.exercice} : {a.series} série(s) · <span className={`puce ${niveauDe(a.coefficient)}`}>{libelleNiveau(a.coefficient)}</span> → {fr(a.series * a.coefficient)}
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
          <p className="meta">Une série compte en entier pour le muscle principal, pour moitié pour un muscle secondaire, pour un quart pour un stabilisateur. Touche un muscle pour voir les exercices.</p>

          {peuTravailles.length > 0 && (
            <>
              <h3>Non travaillés sur la période</h3>
              <div className="puces">{peuTravailles.map(m => <span key={m} className="puce neutre">{MUSCLES[m]}</span>)}</div>
            </>
          )}

          {lesNonClasses.length > 0 && (
            <div className="attention">
              <p>
                <strong>Exercices non comptés :</strong>{' '}
                {lesNonClasses.map(([nom, n]) => `${nom} (${n} série(s))`).join(', ')}.
              </p>
              <p>Ils ne sont pas dans la bibliothèque, ou n'ont pas de muscles renseignés.</p>
              <button type="button" className="secondaire" onClick={() => aller('exercices')}>Compléter la bibliothèque</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

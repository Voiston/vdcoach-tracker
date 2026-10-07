import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { ErreurChargement, EtatVide, MessageErreur, Squelette, useAller, useClient } from './ui'
import { MUSCLES, NIVEAUX, niveauDe } from './definitions'

type Reference = { nom: string; groupe: string; exercice_muscles: { muscle: string; coefficient: number }[] }
type SeanceExo = { date_seance: string; exercices: { nom: string; series: number | null }[] }
type Apport = { exercice: string; series: number; coefficient: number }

const PERIODES = [7, 30, 90]
const cle = (n: string) => n.trim().toLowerCase()
const fr = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const libelleNiveau = (c: number) => NIVEAUX.find(n => n.valeur === c)?.libelle ?? `×${fr(c)}`

export default function Muscles() {
  const aller = useAller()
  const clientId = useClient().id
  const [jours, setJours] = useState(30)
  const [seances, setSeances] = useState<SeanceExo[]>([])
  const [biblio, setBiblio] = useState<Record<string, Reference> | null>(null)
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    supabase.from('bibliotheque_exercices').select('nom, groupe, exercice_muscles(muscle, coefficient)').then(({ data, error }) => {
      if (error) return setErreur(messageErreur(error))
      setBiblio(Object.fromEntries((data as Reference[]).map(x => [cle(x.nom), x])))
    })
  }, [])

  async function charger() {
    if (!clientId) return
    const debut = new Date(Date.now() - jours * 86_400_000).toLocaleDateString('sv-SE')
    const { data, error } = await supabase
      .from('seances')
      .select('date_seance, exercices(nom, series)')
      .eq('client_id', clientId)
      .gte('date_seance', debut)
    setPret(true)
    if (error) return setErreur(messageErreur(error))
    setErreur('')
    setSeances(data as unknown as SeanceExo[])
  }

  useEffect(() => {
    setPret(false)
    charger()
  }, [clientId, jours])

  // Séries pondérées par muscle : une série d'un exercice compte pour chaque muscle sollicité, selon son niveau.
  const parMuscle: Record<string, { total: number; principal: number; apports: Apport[] }> = {}
  const nonClasses: Record<string, number> = {}
  let seriesTotal = 0
  for (const s of seances)
    for (const x of s.exercices) {
      const series = x.series ?? 1
      const ref = biblio?.[cle(x.nom)]
      if (ref?.groupe === 'Mobilité') continue
      seriesTotal += series
      if (!ref || !ref.exercice_muscles.length) {
        nonClasses[x.nom.trim()] = (nonClasses[x.nom.trim()] ?? 0) + series
        continue
      }
      for (const m of ref.exercice_muscles) {
        const coef = Number(m.coefficient)
        const e = (parMuscle[m.muscle] ??= { total: 0, principal: 0, apports: [] })
        e.total += series * coef
        if (coef >= 1) e.principal += series
        const existant = e.apports.find(a => a.exercice === ref.nom)
        if (existant) existant.series += series
        else e.apports.push({ exercice: ref.nom, series, coefficient: coef })
      }
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
          <p className="meta">{seances.length} séance(s) · {seriesTotal} série(s) sur {jours} jours</p>
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
                    <b>{fr(v.total)}</b>
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

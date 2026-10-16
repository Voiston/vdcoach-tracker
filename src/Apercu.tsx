import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { dateFr, nb } from './format'
import { EtatVide, MessageErreur, Squelette, TitreSection, useClient } from './ui'
import { MUSCLES } from './definitions'
import type { Rubrique } from './Profil'
import JaugeObjectif from './JaugeObjectif'
import Mannequin from './Mannequin'
import BilanMensuel from './BilanMensuel'
import { etatObjectif, valeurActuelle, type DonneesObjectifs, type Objectif } from './objectifs-lib'
import { calculerMuscles, chargerBibliothequeMuscles, evolutionPct, libelleEvolution, variationMuscle, type Volume } from './muscles-lib'

type SeanceComplete = {
  id: string
  date_seance: string
  duree_min: number | null
  exercices: { nom: string; ordre: number; series: number | null; charge_kg: number | null }[]
}

export default function Apercu({ onRubrique }: { onRubrique: (r: Rubrique) => void }) {
  const client = useClient()
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [dernieres, setDernieres] = useState<SeanceComplete[]>([])
  const [donnees, setDonnees] = useState<DonneesObjectifs | null>(null)
  const [muscles, setMuscles] = useState<{ muscle: string; total: number; variation: { texte: string; classe: string } | null }[]>([])
  const [parMuscle, setParMuscle] = useState<Record<string, Volume>>({})
  const [evolution, setEvolution] = useState<string | null>(null)

  async function charger() {
    const jour = (n: number) => {
      const d = new Date()
      d.setDate(d.getDate() - n)
      return d.toLocaleDateString('sv-SE')
    }
    const aujourdhuiStr = jour(0)
    const j30 = jour(29)
    const j60 = jour(59)

    const [s, o, m, b] = await Promise.all([
      supabase
        .from('seances')
        .select('id, date_seance, duree_min, exercices(nom, ordre, series, charge_kg)')
        .eq('client_id', client.id)
        .order('date_seance', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('objectifs').select('*').eq('client_id', client.id).order('created_at'),
      supabase.from('mesures').select('type, valeur').eq('client_id', client.id).order('date_mesure'),
      chargerBibliothequeMuscles(),
    ])
    setPret(true)
    const err = s.error ?? o.error ?? m.error ?? b.erreur
    if (err) return setErreur(messageErreur(err))
    setErreur('')

    const toutes = (s.data ?? []) as unknown as SeanceComplete[]
    setDernieres(toutes.slice(0, 3))

    const derniereMesure: Record<string, number> = {}
    for (const x of m.data ?? []) derniereMesure[x.type] = Number(x.valeur)

    const meilleureCharge: Record<string, number> = {}
    const nomsExercices: string[] = []
    for (const seance of toutes) {
      for (const x of seance.exercices) {
        if (x.charge_kg === null) continue
        const k = String(x.nom).trim().toLowerCase()
        meilleureCharge[k] = Math.max(meilleureCharge[k] ?? 0, Number(x.charge_kg))
        nomsExercices.push(String(x.nom).trim())
      }
    }
    setDonnees({ objectifs: (o.data ?? []) as Objectif[], derniereMesure, meilleureCharge, nomsExercices })

    const s30 = toutes.filter(x => x.date_seance >= j30 && x.date_seance <= aujourdhuiStr)
    const p30 = toutes.filter(x => x.date_seance >= j60 && x.date_seance < j30)
    const courante = calculerMuscles(s30, b.biblio ?? null)
    const avant = calculerMuscles(p30, b.biblio ?? null)
    const comparer = avant.seriesTotal > 0
    setEvolution(comparer ? libelleEvolution(evolutionPct(courante.seriesTotal, avant.seriesTotal)) : null)
    setParMuscle(courante.parMuscle)
    setMuscles(
      Object.entries(courante.parMuscle)
        .sort((x, y) => y[1].total - x[1].total)
        .slice(0, 3)
        .map(([muscle, v]) => ({ muscle, total: v.total, variation: comparer ? variationMuscle(avant.parMuscle, muscle, v.total) : null })),
    )
  }

  useEffect(() => {
    setPret(false)
    charger()
  }, [client.id])

  const suivis = (donnees?.objectifs ?? []).map(o => {
    const actuelle = valeurActuelle(donnees!, o.source, o.reference)
    return { o, actuelle, ...etatObjectif(o, actuelle) }
  })
  const aSuivre = suivis.filter(x => !x.atteint).sort((x, y) => (x.o.echeance ?? '9999').localeCompare(y.o.echeance ?? '9999'))
  const atteints = suivis.length - aSuivre.length

  return (
    <section>
      <MessageErreur message={erreur} reessayer={charger} />
      {!pret && !erreur && <Squelette lignes={3} />}
      {pret && !erreur && (
        <>
          <div className="colonnes-auto">
            <div className="groupe">
              {client.objectifs && (
                <div className="encart-objectif-general">
                  <span className="champ-libelle">Objectif général</span>
                  <p>{client.objectifs}</p>
                </div>
              )}

              <TitreSection icone="objectif">Objectifs chiffrés</TitreSection>
              {aSuivre.length > 0 ? (
                <ul className="liste">
                  {aSuivre.slice(0, 3).map(x => (
                    <li key={x.o.id}><JaugeObjectif objectif={x.o} actuelle={x.actuelle} /></li>
                  ))}
                </ul>
              ) : (
                suivis.length ? (
                  <p className="meta">Tous les objectifs sont atteints 🎯</p>
                ) : (
                  <EtatVide titre="Aucun objectif chiffré" texte="Fixe une cible (poids, charge, test physique) pour suivre la progression de ce client." action={{ libelle: 'Fixer un objectif', onClick: () => onRubrique('objectifs') }} />
                )
              )}
              {aSuivre.length > 3 && <p className="meta">+ {aSuivre.length - 3} autre(s) objectif(s) en cours</p>}
              {atteints > 0 && aSuivre.length > 0 && <p className="meta">🎯 {atteints} objectif(s) déjà atteint(s)</p>}
              {suivis.length > 0 && <button type="button" className="lien" onClick={() => onRubrique('objectifs')}>Voir les objectifs →</button>}
            </div>

            <div className="groupe">
              <TitreSection icone="muscles">Muscles les plus travaillés (30 jours)</TitreSection>
              <p className="meta">Séries pondérées : une série compte en entier pour le muscle principal, pour moitié pour un secondaire, pour un quart pour un stabilisateur.</p>
              {evolution && <p className="meta">{evolution} par rapport aux 30 jours précédents</p>}
              {muscles.length > 0 ? (
                <ul className="barres">
                  {muscles.map(m => (
                    <li key={m.muscle}>
                      <span>{MUSCLES[m.muscle] ?? m.muscle}</span>
                      <div><i style={{ width: `${(m.total / muscles[0].total) * 100}%` }} /></div>
                      <b>{nb(m.total)}<small> séries</small>{m.variation && <small className={`delta ${m.variation.classe}`}>{m.variation.texte}</small>}</b>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="meta">Aucune série comptée sur les 30 derniers jours.</p>
              )}
              {muscles.length > 0 && <Mannequin parMuscle={parMuscle} />}
              <button type="button" className="lien" onClick={() => onRubrique('suivi')}>Voir le détail →</button>
            </div>

            <div className="groupe">
              <TitreSection icone="calendrier">Dernières séances</TitreSection>
              {dernieres.length ? (
                <ul className="liste">
                  {dernieres.map(s => (
                    <li key={s.id}>
                      <div>
                        <strong>{dateFr(s.date_seance)}</strong>
                        <p className="meta">
                          {[...s.exercices].sort((a, b) => a.ordre - b.ordre).map(x => x.nom).join(', ') || 'Aucun exercice saisi'}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EtatVide titre="Aucune séance pour l'instant" texte={`Enregistre la première séance de ${client.prenom}.`} action={{ libelle: 'Nouvelle séance', onClick: () => onRubrique('seance') }} />
              )}
              <button type="button" className="lien" onClick={() => onRubrique('seances')}>Toutes les séances →</button>
            </div>
          </div>

          <BilanMensuel />
        </>
      )}
    </section>
  )
}
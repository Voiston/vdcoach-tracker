import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { EtatVide, MessageErreur, Squelette, TitreSection, useClient } from './ui'
import { MUSCLES } from './definitions'
import type { Rubrique } from './Profil'
import JaugeObjectif from './JaugeObjectif'
import { chargerObjectifs, etatObjectif, valeurActuelle, type DonneesObjectifs } from './objectifs-lib'
import { calculerMuscles, chargerBibliothequeMuscles, chargerSeancesMuscles, evolutionPct, libelleEvolution, variationMuscle } from './muscles-lib'

type Derniere = { id: string; date_seance: string; duree_min: number | null; exercices: { nom: string; ordre: number }[] }
const courte = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const fr = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
function ilYa(d: string) {
  const jours = Math.floor((Date.now() - Date.parse(d)) / 86_400_000)
  return jours <= 0 ? "aujourd'hui" : jours === 1 ? 'hier' : `il y a ${jours} j`
}

export default function Apercu({ onRubrique }: { onRubrique: (r: Rubrique) => void }) {
  const client = useClient()
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [total, setTotal] = useState(0)
  const [ceMois, setCeMois] = useState(0)
  const [dernieres, setDernieres] = useState<Derniere[]>([])
  const [donnees, setDonnees] = useState<DonneesObjectifs | null>(null)
  const [muscles, setMuscles] = useState<{ muscle: string; total: number; variation: { texte: string; classe: string } | null }[]>([])
  const [evolution, setEvolution] = useState<string | null>(null) // évolution du volume total vs les 30 jours précédents

  async function charger() {
    const debutMois = `${new Date().toLocaleDateString('sv-SE').slice(0, 7)}-01`
    const [t, m, d, o, b, s30, p30] = await Promise.all([
      supabase.from('seances').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      supabase.from('seances').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('date_seance', debutMois),
      supabase.from('seances').select('id, date_seance, duree_min, exercices(nom, ordre)').eq('client_id', client.id)
        .order('date_seance', { ascending: false }).order('created_at', { ascending: false }).limit(3),
      chargerObjectifs(client.id),
      chargerBibliothequeMuscles(),
      chargerSeancesMuscles(client.id, 30),
      chargerSeancesMuscles(client.id, 30, 30),
    ])
    setPret(true)
    const err = t.error ?? m.error ?? d.error ?? o.erreur ?? b.erreur ?? s30.erreur ?? p30.erreur
    if (err) return setErreur(messageErreur(err))
    setErreur('')
    setTotal(t.count ?? 0)
    setCeMois(m.count ?? 0)
    setDernieres(d.data as unknown as Derniere[])
    setDonnees(o.donnees ?? null)
    const courante = calculerMuscles(s30.seances ?? [], b.biblio ?? null)
    const avant = calculerMuscles(p30.seances ?? [], b.biblio ?? null)
    const comparer = avant.seriesTotal > 0 // sans séance sur la période précédente, il n'y a rien à comparer
    setEvolution(comparer ? libelleEvolution(evolutionPct(courante.seriesTotal, avant.seriesTotal)) : null)
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

  // Objectifs chiffrés : ceux à suivre d'abord (échéance la plus proche en premier), les atteints sont comptés à part
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
          <div className="stats">
            <div><strong>{total}</strong><span>séances</span></div>
            <div><strong>{ceMois}</strong><span>ce mois-ci</span></div>
            <div><strong className="texte" title={dernieres[0] ? courte(dernieres[0].date_seance) : undefined}>{dernieres[0] ? ilYa(dernieres[0].date_seance) : '—'}</strong><span>dernière séance</span></div>
          </div>

          <div className="colonnes-auto">
            <div className="groupe">
          {client.objectifs && (
            <>
              <h3>Objectif général</h3>
              <p>{client.objectifs}</p>
            </>
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
                  <b>{fr(m.total)}<small> séries</small>{m.variation && <small className={`delta ${m.variation.classe}`}>{m.variation.texte}</small>}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="meta">Aucune série comptée sur les 30 derniers jours.</p>
          )}
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
        </>
      )}
    </section>
  )
}

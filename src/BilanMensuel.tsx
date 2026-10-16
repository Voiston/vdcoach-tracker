import { useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import {
  calculerBilan,
  construireBilan,
  selectionnerCourbesExercices,
  type Bilan,
  type CourbeExercice,
  type MesureBilan,
  type SeanceCharges,
} from './bilan-lib'
import BilanPdf, { ApercuBilanPdf } from './BilanPdf'
import type { Point } from './Courbe'
import { bornesMois, decalerMois, libelleMois, moisCourant } from './facturation-lib'
import { calculerMuscles, chargerBibliothequeMuscles, type Volume } from './muscles-lib'
import { chargerObjectifs } from './objectifs-lib'
import { Champ, MessageErreur, useClient, useNotifier, useOccupe } from './ui'

export default function BilanMensuel() {
  const client = useClient()
  const notifier = useNotifier()
  const courant = moisCourant()
  const moisProposes = [courant, decalerMois(courant, -1), decalerMois(courant, -2)]
  const [mois, setMois] = useState(courant)
  const [texte, setTexte] = useState<string | null>(null)
  const [bilan, setBilan] = useState<Bilan | null>(null)
  const [parMuscle, setParMuscle] = useState<Record<string, Volume>>({})
  const [poids, setPoids] = useState<Point[]>([])
  const [courbesExos, setCourbesExos] = useState<CourbeExercice[]>([])
  const [exoChoisi, setExoChoisi] = useState('')
  const [mot, setMot] = useState('')
  const [apercuOuvert, setApercuOuvert] = useState(false)
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()

  async function preparer() {
    const [s, m, o, b] = await Promise.all([
      supabase.from('seances').select('date_seance, exercices(nom, series, charge_kg, duree_sec, duree_min)').eq('client_id', client.id).order('date_seance'),
      supabase.from('mesures').select('type, valeur, date_mesure').eq('client_id', client.id).order('date_mesure').order('id'),
      chargerObjectifs(client.id),
      chargerBibliothequeMuscles(),
    ])
    const err = s.error ?? m.error ?? o.erreur ?? b.erreur
    if (err) return setErreur(messageErreur(err))
    setErreur('')

    const seances = (s.data ?? []) as unknown as SeanceCharges[]
    const mesures = (m.data ?? []) as MesureBilan[]
    const { debut, fin } = bornesMois(mois)

    const donneesBilan = { prenom: client.prenom, mois, seances, mesures, objectifs: o.donnees }
    setBilan(calculerBilan(donneesBilan))
    setTexte(construireBilan(donneesBilan))

    // Volume musculaire sur les séances du mois choisi
    const seancesMois = seances
      .filter(x => x.date_seance >= debut && x.date_seance < fin)
      .map(x => ({
        date_seance: x.date_seance,
        exercices: x.exercices.map(e => ({
          nom: e.nom,
          series: e.series ?? 1,
          duree_sec: e.duree_sec,
          duree_min: e.duree_min,
        })),
      }))
    setParMuscle(calculerMuscles(seancesMois, b.biblio ?? null).parMuscle)

    // Courbe de poids jusqu'à la fin du mois choisi
    setPoids(
      mesures
        .filter(x => x.type === 'poids' && x.date_mesure < fin)
        .map(x => ({ date: x.date_mesure, valeur: Number(x.valeur) })),
    )

    // Courbes d'exercices : on privilégie les exercices pratiqués pendant le mois qui ont au moins 2 séances avec charge (> 0 kg)
    const candidats = selectionnerCourbesExercices(seances, mois)
    setCourbesExos(candidats)
    setExoChoisi(candidats[0]?.nom ?? '')
  }

  async function copier() {
    if (texte === null) return
    try {
      await navigator.clipboard.writeText(texte)
      notifier('Bilan copié')
    } catch {
      notifier('Copie impossible depuis ce navigateur.')
    }
  }

  function exporterPdf() {
    const ancienTitre = document.title
    document.title = `Bilan-${client.prenom}-${mois}`
    window.print()
    setTimeout(() => { document.title = ancienTitre }, 500)
  }

  const courbeExercice = courbesExos.find(c => c.nom === exoChoisi) ?? null

  return (
    <div>
      <h3>Bilan du mois</h3>
      <p className="meta">Un récapitulatif à envoyer à {client.prenom} (en PDF A4 ou en message texte) : séances, records, mesures, muscles et objectifs.</p>
      <div className="ligne">
        <select aria-label="Mois du bilan" value={mois} onChange={e => { setMois(e.target.value); setTexte(null); setBilan(null); setApercuOuvert(false) }}>
          {moisProposes.map(m => <option key={m} value={m}>{libelleMois(m)}</option>)}
        </select>
        <button type="button" className="secondaire" disabled={occupe} onClick={() => lancer(preparer)}>
          {occupe ? 'Préparation…' : 'Préparer le bilan'}
        </button>
      </div>
      <MessageErreur message={erreur} reessayer={() => lancer(preparer)} />

      {texte !== null && bilan !== null && (
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.8rem' }}>
          <Champ libelle="Le mot du coach (affiché en haut du PDF, facultatif)">
            <textarea
              rows={3}
              placeholder={`Ex. Bravo ${client.prenom} pour ta régularité ce mois-ci ! On continue sur cette lancée le mois prochain.`}
              value={mot}
              onChange={e => setMot(e.target.value)}
            />
          </Champ>

          {courbesExos.length > 1 && (
            <Champ libelle="Courbe d'exercice à inclure dans le PDF">
              <select value={exoChoisi} onChange={e => setExoChoisi(e.target.value)}>
                {courbesExos.map(c => <option key={c.nom} value={c.nom}>{c.nom} ({c.points.length} séances)</option>)}
              </select>
            </Champ>
          )}

          <div className="ligne" style={{ flexWrap: 'wrap' }}>
            <button type="button" onClick={() => setApercuOuvert(true)}>Aperçu du PDF</button>
            <button type="button" className="secondaire" onClick={exporterPdf}>Télécharger / Imprimer</button>
            <button type="button" className="secondaire" onClick={copier}>Copier le message texte</button>
          </div>

          <details>
            <summary className="meta" style={{ cursor: 'pointer' }}>Voir ou modifier le texte du message</summary>
            <textarea
              aria-label="Bilan à envoyer"
              rows={Math.min(18, texte.split('\n').length + 1)}
              value={texte}
              onChange={e => setTexte(e.target.value)}
              style={{ marginTop: '.5rem' }}
            />
          </details>

          <BilanPdf
            bilan={bilan}
            parMuscle={parMuscle}
            courbes={{ poids, exercice: courbeExercice }}
            mot={mot}
          />

          {apercuOuvert && (
            <ApercuBilanPdf
              bilan={bilan}
              parMuscle={parMuscle}
              courbes={{ poids, exercice: courbeExercice }}
              mot={mot}
              onFermer={() => setApercuOuvert(false)}
              onImprimer={exporterPdf}
            />
          )}
        </div>
      )}
    </div>
  )
}
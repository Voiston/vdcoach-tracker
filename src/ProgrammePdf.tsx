import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import logo from './logo-vdcoach.svg?inline'
import { analyserSupersets, libelleRepos, resumeCardio } from './format'
import { supabase } from './supabase'
import { Champ } from './ui'
import './impression.css'

export type LigneProgramme = {
  nom: string
  series?: number | null
  repetitions?: number | null
  charge_kg?: number | null
  duree_sec?: number | null
  duree_min?: number | null
  distance_km?: number | null
  repos_sec?: number | null
  reglage?: string | null
  lie_suivant?: boolean | null
}

type InfoBiblio = { groupe: string; materiel: string; notes: string | null; video_url: string | null }

const cle = (n: string) => n.trim().toLowerCase()
const lienSur = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u) ? u : null)

// Résumé de l'effort : répétitions, temps ou cardio, puis la charge si elle est renseignée
function resumeEffort(l: LigneProgramme): string {
  const parties: string[] = []
  const cardio = resumeCardio(l)
  if (l.repetitions) parties.push(`${l.series ? `${l.series} × ` : ''}${l.repetitions} reps`)
  else if (cardio) parties.push(cardio)
  else if (l.series) parties.push(`${l.series} séries`)
  if (l.charge_kg) parties.push(`${l.charge_kg} kg`)
  return parties.join(' · ')
}

function DocumentProgramme({
  titre,
  prenom,
  consigne,
  lignes,
  biblio,
}: {
  titre: string
  prenom: string
  consigne: string
  lignes: LigneProgramme[]
  biblio: Record<string, InfoBiblio>
}) {
  const supersets = analyserSupersets(lignes)

  return (
    <div className="bp-document">
      <div className="bp-entete">
        <img src={logo} alt="VDCoach" />
        <div className="bp-titre">
          <small>Programme d’entraînement</small>
          <h1>{prenom.trim() || titre}</h1>
          {prenom.trim() && <span>{titre}</span>}
        </div>
      </div>

      {consigne.trim() && (
        <div className="bp-mot">
          <strong>Consignes du coach</strong>
          <p>{consigne.trim()}</p>
        </div>
      )}

      <section className="bp-section prog-section">
        <h2 className="bp-h">Séance ({lignes.length} exercice{lignes.length > 1 ? 's' : ''})</h2>
        <div className="prog-liste">
          {lignes.map((l, i) => {
            const info = biblio[cle(l.nom)]
            const video = lienSur(info?.video_url)
            const sup = supersets[i]
            const repos = libelleRepos(l.repos_sec)
            const effort = resumeEffort(l)

            const classes = [
              'prog-exo',
              sup.groupe !== null ? `superset-groupe grp-sup-${sup.groupe}` : '',
              l.lie_suivant && i < lignes.length - 1 ? 'lie-suivant' : '',
            ].filter(Boolean).join(' ')

            return (
              <div key={i} className={classes}>
                <div className="prog-exo-entete">
                  <div>
                    <span className="prog-num">{sup.etiquette ?? `#${i + 1}`}</span>
                    <strong className="prog-nom">{l.nom}</strong>
                    {info && <small className="prog-meta">{info.groupe} · {info.materiel}</small>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {effort && (
                      <div>
                        <b className="prog-dosage">{effort}</b>
                      </div>
                    )}
                    {repos && (
                      <div className="prog-meta" style={{ margin: 0, fontSize: '9.5pt', fontWeight: 700, color: 'var(--accent-fonce)' }}>
                        ⏱ Repos {repos}
                      </div>
                    )}
                  </div>
                </div>
                {l.reglage && <p className="prog-reglage"><strong>Réglage :</strong> {l.reglage}</p>}
                {info?.notes && <p className="prog-notes">{info.notes}</p>}
                {video && (
                  <p className="prog-video">
                    <a href={video} target="_blank" rel="noopener noreferrer">▶ Voir la vidéo de démonstration</a>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <div className="bp-pied">
        <span>vdcoach.fr</span>
        <span>Édité le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>
  )
}

export default function FenetreProgrammePdf({
  titreInitial,
  prenomInitial = '',
  consigneInitiale = '',
  lignes,
  onFermer,
}: {
  titreInitial: string
  prenomInitial?: string
  consigneInitiale?: string
  lignes: LigneProgramme[]
  onFermer: () => void
}) {
  const [titre, setTitre] = useState(titreInitial)
  const [prenom, setPrenom] = useState(prenomInitial)
  const [consigne, setConsigne] = useState(consigneInitiale)
  const [biblio, setBiblio] = useState<Record<string, InfoBiblio>>({})

  useEffect(() => {
    supabase
      .from('bibliotheque_exercices')
      .select('nom, groupe, materiel, notes, video_url')
      .then(({ data }) => {
        setBiblio(Object.fromEntries((data ?? []).map(x => [cle(x.nom as string), x as InfoBiblio])))
      })
  }, [])

  useEffect(() => {
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [onFermer])

  function imprimer() {
    const ancien = document.title
    document.title = `Programme-${prenom.trim() || titre.trim() || 'VDCoach'}`
    window.print()
    setTimeout(() => { document.title = ancien }, 500)
  }

  return createPortal(
    <>
      <div className="bilan-apercu-voile" role="dialog" aria-modal="true" aria-label="Aperçu du programme PDF" onClick={onFermer}>
        <div className="bilan-apercu-barre" onClick={e => e.stopPropagation()}>
          <strong>Programme PDF (A4)</strong>
          <div className="ligne">
            <button type="button" className="secondaire" onClick={onFermer}>Fermer</button>
            <button type="button" onClick={imprimer}>Télécharger / Imprimer</button>
          </div>
        </div>

        <div className="prog-options" onClick={e => e.stopPropagation()}>
          <div className="ligne">
            <Champ libelle="Titre du programme">
              <input value={titre} onChange={e => setTitre(e.target.value)} />
            </Champ>
            <Champ libelle="Prénom du client (facultatif)">
              <input placeholder="Ex. Sophie" value={prenom} onChange={e => setPrenom(e.target.value)} />
            </Champ>
          </div>
          <Champ libelle="Consignes d’échauffement / récupération (facultatif)">
            <textarea rows={2} placeholder="Ex. 5 min de mobilité articulaire avant de commencer." value={consigne} onChange={e => setConsigne(e.target.value)} />
          </Champ>
        </div>

        <div className="bilan-apercu-page" onClick={e => e.stopPropagation()}>
          <DocumentProgramme titre={titre} prenom={prenom} consigne={consigne} lignes={lignes} biblio={biblio} />
        </div>
      </div>

      <div id="bilan-impression">
        <DocumentProgramme titre={titre} prenom={prenom} consigne={consigne} lignes={lignes} biblio={biblio} />
      </div>
    </>,
    document.body,
  )
}

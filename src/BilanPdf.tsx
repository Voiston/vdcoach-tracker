import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import logo from './logo-vdcoach.svg?inline'
import Courbe, { type Point } from './Courbe'
import { SchemaMuscles } from './Mannequin'
import { nb } from './format'
import { phrasesEquilibre, type Volume } from './muscles-lib'
import { libelleMois } from './facturation-lib'
import type { Bilan } from './bilan-lib'
import './impression.css'

export type CourbesBilan = { poids: Point[]; exercice: { nom: string; points: Point[] } | null }
type Props = { bilan: Bilan; parMuscle: Record<string, Volume>; courbes: CourbesBilan; mot: string }

const signe = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '')

export function DocumentBilan({ bilan, parMuscle, courbes, mot }: Props) {
  const equilibres = phrasesEquilibre(parMuscle)
  const aMuscles = Object.keys(parMuscle).length > 0
  const aCourbes = courbes.poids.length >= 2 || courbes.exercice !== null

  return (
    <div className="bp-document">
      <div className="bp-entete">
        <img src={logo} alt="VDCoach" />
        <div className="bp-titre">
          <small>Bilan mensuel</small>
          <h1>{bilan.prenom}</h1>
          <span>{libelleMois(bilan.mois)}</span>
        </div>
      </div>

      <div className="bp-stats">
        <div><strong>{bilan.nbSeances}</strong><span>{bilan.nbSeances > 1 ? 'séances réalisées' : 'séance réalisée'}</span></div>
        <div><strong>{bilan.records.length}</strong><span>{bilan.records.length > 1 ? 'records battus' : 'record battu'}</span></div>
        <div><strong>{bilan.objectifs.length}</strong><span>{bilan.objectifs.length > 1 ? 'objectifs en cours' : 'objectif en cours'}</span></div>
      </div>

      {mot.trim() && (
        <div className="bp-mot">
          <strong>Le mot du coach</strong>
          <p>{mot.trim()}</p>
        </div>
      )}

      {bilan.records.length > 0 && (
        <section className="bp-section">
          <h2 className="bp-h">Records du mois</h2>
          <ul className="bp-records">
            {bilan.records.map(r => (
              <li key={r.exercice}>
                <span>{r.exercice}<small>avant : {nb(r.avant)} kg</small></span>
                <b>{nb(r.charge)} kg</b>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bilan.evolutions.length > 0 && (
        <section className="bp-section">
          <h2 className="bp-h">Mesures et tests</h2>
          <table className="bp-table">
            <thead>
              <tr><th>Mesure</th><th>Début de mois</th><th>Fin de mois</th><th>Évolution</th></tr>
            </thead>
            <tbody>
              {bilan.evolutions.map(m => (
                <tr key={m.label}>
                  <td>{m.label}</td>
                  <td>{m.depart === null ? '—' : `${nb(m.depart)} ${m.unite}`}</td>
                  <td>{nb(m.arrivee)} {m.unite}</td>
                  <td className="bp-ecart">{m.ecart === null ? '—' : m.ecart === 0 ? 'stable' : `${signe(m.ecart)}${nb(Math.abs(m.ecart))} ${m.unite}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {bilan.objectifs.length > 0 && (
        <section className="bp-section">
          <h2 className="bp-h">Objectifs en cours</h2>
          <ul className="bp-objectifs">
            {bilan.objectifs.map(o => (
              <li key={`${o.label}-${o.cible}`}>
                <div><strong>{o.label}</strong><b>{o.pct} %</b></div>
                <p className="bp-detail">{nb(o.depart)} → {o.actuelle === null ? '?' : nb(o.actuelle)} → {nb(o.cible)} {o.unite}</p>
                <div className="bp-barre"><i style={{ width: `${o.pct}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {aMuscles && (
        <section className="bp-section">
          <h2 className="bp-h">Muscles travaillés</h2>
          <div className="bp-muscles">
            <SchemaMuscles parMuscle={parMuscle} />
            <div className="bp-equilibre">
              {equilibres.length > 0 && <ul>{equilibres.map(t => <li key={t}>{t}</li>)}</ul>}
              <p className="bp-note">Séries pondérées sur le mois : une série compte en entier pour le muscle principal, pour moitié pour un muscle secondaire, pour un quart pour un stabilisateur.</p>
              <div className="bp-legende"><span>moins sollicité</span><i /><span>plus sollicité</span></div>
            </div>
          </div>
        </section>
      )}

      {aCourbes && (
        <section className="bp-section">
          <h2 className="bp-h">Progression</h2>
          <div className="bp-courbes">
            {courbes.poids.length >= 2 && (
              <div>
                <h3 className="bp-sh">Poids</h3>
                <Courbe nom="Poids" points={courbes.poids} unite="kg" />
              </div>
            )}
            {courbes.exercice && (
              <div>
                <h3 className="bp-sh">{courbes.exercice.nom} : charge maximale par séance</h3>
                <Courbe nom={courbes.exercice.nom} points={courbes.exercice.points} unite="kg" />
              </div>
            )}
          </div>
        </section>
      )}

      <div className="bp-pied">
        <span>vdcoach.fr</span>
        <span>Édité le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      </div>
    </div>
  )
}

export function ApercuBilanPdf(props: Props & { onFermer: () => void; onImprimer: () => void }) {
  const { onFermer, onImprimer, ...docProps } = props

  useEffect(() => {
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [onFermer])

  return createPortal(
    <div className="bilan-apercu-voile" role="dialog" aria-modal="true" aria-label="Aperçu du bilan PDF" onClick={onFermer}>
      <div className="bilan-apercu-barre" onClick={e => e.stopPropagation()}>
        <strong>Aperçu A4 — {docProps.bilan.prenom}</strong>
        <div className="ligne">
          <button type="button" className="secondaire" onClick={onFermer}>Fermer</button>
          <button type="button" onClick={onImprimer}>Télécharger / Imprimer</button>
        </div>
      </div>
      <div className="bilan-apercu-page" onClick={e => e.stopPropagation()}>
        <DocumentBilan {...docProps} />
      </div>
    </div>,
    document.body,
  )
}

export default function BilanPdf(props: Props) {
  return createPortal(<div id="bilan-impression"><DocumentBilan {...props} /></div>, document.body)
}
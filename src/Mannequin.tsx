import { useState } from 'react'
import { MUSCLES, NIVEAUX, niveauDe } from './definitions'
import { nb } from './format'
import { phrasesEquilibre, type Volume } from './muscles-lib'

const libelleNiveau = (c: number) => NIVEAUX.find(n => n.valeur === c)?.libelle ?? `×${nb(c)}`

type Partie = [muscle: string, d: string]

// Tout est dessiné pour la moitié gauche du corps (x ≤ 100) ; la moitié droite est son miroir.
const SILHOUETTE =
  'M100 44 L91 44 L91 60 C82 63 66 64 55 70 C47 73 43 84 43 96 L38 150 L35 205 C32 222 32 238 36 243 L46 243 ' +
  'C48 232 47 220 46 208 L55 152 L62 108 C64 128 70 140 72 152 C70 170 66 185 66 200 C64 230 66 262 69 292 ' +
  'C66 315 64 345 72 380 L70 402 L88 402 L83 380 C86 350 88 320 90 292 C94 262 97 232 100 206 Z'

const DELTO_LAT = 'M55 70 C47 73 43 84 43 96 L44 104 L50 104 C50 92 51 80 55 70 Z'
const DELTO = 'M55 70 L62 74 C63 84 63 94 60 102 L50 104 C50 92 51 80 55 70 Z'
const BRAS = 'M42.5 104 L61 104 C60 120 58 134 56 147 L38.5 147 Z'
const AVANT_BRAS = 'M38 152 L55 152 L46 207 L35 207 Z'
const MOLLETS = 'M69.5 296 C66 318 66 340 71 366 L84 366 C86 340 88 318 89.5 296 Z'

const FACE: Partie[] = [
  ['delto_lat', DELTO_LAT],
  ['delto_ant', DELTO],
  ['pectoraux', 'M100 76 C88 74 74 74 63 78 C62 92 62 104 67 112 C78 123 92 124 100 121 Z'],
  ['biceps', BRAS],
  ['avant_bras', AVANT_BRAS],
  ['obliques', 'M65 118 C74 124 80 127 82 130 L82 178 L69 178 C72 168 73 160 72 152 C69 142 66 130 65 118 Z'],
  ['abdominaux', 'M100 123 C92 123 86 125 82 130 L82 178 C88 182 95 184 100 184 Z'],
  ['adducteurs', 'M100 208 L94 212 C90 232 86 252 84 274 L90 290 C94 262 97 236 100 208 Z'],
  ['quadriceps', 'M66 206 C78 212 88 212 94 212 C90 232 86 252 84 274 L84 290 L69 290 C65 262 64 232 66 206 Z'],
  ['mollets', MOLLETS],
]

const DOS: Partie[] = [
  ['haut_dos', 'M100 56 L91 62 C84 65 74 67 62 74 C63 84 65 94 68 100 C80 100 92 104 100 108 Z'],
  ['grand_dorsal', 'M63 110 C75 106 90 110 100 112 L100 142 C93 152 88 162 84 172 C78 164 74 158 72 152 C68 140 64 126 63 110 Z'],
  ['lombaires', 'M100 140 C94 148 90 156 88 166 L88 190 C93 192 97 193 100 193 Z'],
  ['delto_lat', DELTO_LAT],
  ['delto_post', DELTO],
  ['triceps', BRAS],
  ['avant_bras', AVANT_BRAS],
  ['fessiers', 'M100 192 C88 190 75 191 66 198 C64 214 70 228 82 232 C90 233 97 230 100 226 Z'],
  ['ischios', 'M69 235 C80 239 90 238 97.5 234 C95 254 93 273 90 290 L70 290 C67 270 66 252 69 235 Z'],
  ['mollets', MOLLETS],
]

function Vue({ legende, parties, volumes, maxi, choisi, onChoisir }: {
  legende: string
  parties: Partie[]
  volumes: Record<string, number>
  maxi: number
  choisi?: string | null
  onChoisir?: (muscle: string) => void
}) {
  return (
    <figure>
      <svg viewBox="0 0 200 410" role="img" aria-label={`Silhouette, vue ${legende.toLowerCase()}`}>
        <ellipse className="corps" cx="100" cy="26" rx="17" ry="21" />
        {[false, true].map(miroir => (
          <g key={String(miroir)} transform={miroir ? 'translate(200 0) scale(-1 1)' : undefined}>
            <path className="corps" d={SILHOUETTE} />
            {parties.map(([muscle, d]) => {
              const v = volumes[muscle] ?? 0
              return (
                <path
                  key={muscle}
                  d={d}
                  className={`muscle${v > 0 ? ' travaille' : ''}${muscle === choisi ? ' choisi' : ''}`}
                  style={v > 0 ? { fillOpacity: 0.3 + 0.7 * (v / maxi) } : undefined}
                  onClick={onChoisir ? () => onChoisir(muscle) : undefined}
                >
                  <title>{MUSCLES[muscle]}{v > 0 ? ` : ${nb(v)} séries` : ''}</title>
                </path>
              )
            })}
          </g>
        ))}
      </svg>
      <figcaption>{legende}</figcaption>
    </figure>
  )
}

/** Silhouettes Face + Dos statiques (utilisées aussi dans le PDF du bilan mensuel). */
export function SchemaMuscles({ parMuscle, choisi, onChoisir }: {
  parMuscle: Record<string, Volume>
  choisi?: string | null
  onChoisir?: (muscle: string) => void
}) {
  const volumes = Object.fromEntries(Object.entries(parMuscle).map(([muscle, v]) => [muscle, v.total]))
  const maxi = Math.max(0, ...Object.values(volumes))
  return (
    <div className="mannequin">
      <Vue legende="Face" parties={FACE} volumes={volumes} maxi={maxi} choisi={choisi} onChoisir={onChoisir} />
      <Vue legende="Dos" parties={DOS} volumes={volumes} maxi={maxi} choisi={choisi} onChoisir={onChoisir} />
    </div>
  )
}

export default function Mannequin({ parMuscle }: { parMuscle: Record<string, Volume> }) {
  const [choisi, setChoisi] = useState<string | null>(null)
  const volumes = Object.fromEntries(Object.entries(parMuscle).map(([muscle, v]) => [muscle, v.total]))
  const choisir = (muscle: string) => setChoisi(c => (c === muscle ? null : muscle))
  const equilibres = phrasesEquilibre(parMuscle)
  const apports = choisi ? [...(parMuscle[choisi]?.apports ?? [])].sort((a, b) => b.series * b.coefficient - a.series * a.coefficient) : []

  return (
    <div>
      <SchemaMuscles parMuscle={parMuscle} choisi={choisi} onChoisir={choisir} />
      <p className="courbe-info" aria-live="polite">
        {choisi
          ? <><strong>{MUSCLES[choisi]}</strong> · {volumes[choisi] ? `${nb(volumes[choisi])} séries pondérées` : 'non travaillé sur la période'}</>
          : 'Touche un muscle pour voir sa valeur.'}
      </p>
      {apports.length > 0 && (
        <ul className="apports">
          {apports.map(a => (
            <li key={a.exercice}>
              {a.exercice} : {a.series} série(s) · <span className={`puce ${niveauDe(a.coefficient)}`}>{libelleNiveau(a.coefficient)}</span> → {nb(a.series * a.coefficient)}
            </li>
          ))}
        </ul>
      )}
      {equilibres.length > 0 && (
        <>
          <h4 className="sous-titre">Équilibre musculaire</h4>
          <ul className="apports">
            {equilibres.map(t => <li key={t}>{t}</li>)}
          </ul>
          <p className="meta">Séries pondérées. Poussée : pectoraux, deltoïdes antérieurs, triceps. Tirage : grand dorsal, haut du dos, biceps.</p>
        </>
      )}
    </div>
  )
}
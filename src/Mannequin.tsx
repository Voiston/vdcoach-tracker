import { useContext, useState } from 'react'
import { MUSCLES, NIVEAUX, niveauDe, type Silhouette } from './definitions'
import { nb } from './format'
import { phrasesEquilibre, type Volume } from './muscles-lib'
import { ClientCtx } from './ui'

const libelleNiveau = (c: number) => NIVEAUX.find(n => n.valeur === c)?.libelle ?? `×${nb(c)}`

type Partie = [muscle: string, d: string]

// Tout est dessiné pour la moitié gauche du corps (x ≤ 100) ; la moitié droite est son miroir.

/* ---------- Silhouette homme ---------- */
const SILHOUETTE_HOMME =
  'M100 44 L91 44 L91 60 C82 63 66 64 55 70 C47 73 43 84 43 96 L38 150 L35 205 C32 222 32 238 36 243 L46 243 ' +
  'C48 232 47 220 46 208 L55 152 L62 108 C64 128 70 140 72 152 C70 170 66 185 66 200 C64 230 66 262 69 292 ' +
  'C66 315 64 345 72 380 L70 402 L88 402 L83 380 C86 350 88 320 90 292 C94 262 97 232 100 206 Z'

const DELTO_LAT_H = 'M55 70 C47 73 43 84 43 96 L44 104 L50 104 C50 92 51 80 55 70 Z'
const DELTO_H = 'M55 70 L62 74 C63 84 63 94 60 102 L50 104 C50 92 51 80 55 70 Z'
const BRAS_H = 'M42.5 104 L61 104 C60 120 58 134 56 147 L38.5 147 Z'
const AVANT_BRAS_H = 'M38 152 L55 152 L46 207 L35 207 Z'

// Mollets, abdominaux, adducteurs et lombaires : identiques pour les deux silhouettes
const MOLLETS = 'M69.5 296 C66 318 66 340 71 366 L84 366 C86 340 88 318 89.5 296 Z'
const ABDOMINAUX = 'M100 123 C92 123 86 125 82 130 L82 178 C88 182 95 184 100 184 Z'
const ADDUCTEURS = 'M100 208 L94 212 C90 232 86 252 84 274 L90 290 C94 262 97 236 100 208 Z'
const LOMBAIRES = 'M100 140 C94 148 90 156 88 166 L88 190 C93 192 97 193 100 193 Z'

const FACE_HOMME: Partie[] = [
  ['delto_lat', DELTO_LAT_H],
  ['delto_ant', DELTO_H],
  ['pectoraux', 'M100 76 C88 74 74 74 63 78 C62 92 62 104 67 112 C78 123 92 124 100 121 Z'],
  ['biceps', BRAS_H],
  ['avant_bras', AVANT_BRAS_H],
  ['obliques', 'M65 118 C74 124 80 127 82 130 L82 178 L69 178 C72 168 73 160 72 152 C69 142 66 130 65 118 Z'],
  ['abdominaux', ABDOMINAUX],
  ['adducteurs', ADDUCTEURS],
  ['quadriceps', 'M66 206 C78 212 88 212 94 212 C90 232 86 252 84 274 L84 290 L69 290 C65 262 64 232 66 206 Z'],
  ['mollets', MOLLETS],
]

const DOS_HOMME: Partie[] = [
  ['haut_dos', 'M100 56 L91 62 C84 65 74 67 62 74 C63 84 65 94 68 100 C80 100 92 104 100 108 Z'],
  ['grand_dorsal', 'M63 110 C75 106 90 110 100 112 L100 142 C93 152 88 162 84 172 C78 164 74 158 72 152 C68 140 64 126 63 110 Z'],
  ['lombaires', LOMBAIRES],
  ['delto_lat', DELTO_LAT_H],
  ['delto_post', DELTO_H],
  ['triceps', BRAS_H],
  ['avant_bras', AVANT_BRAS_H],
  ['fessiers', 'M100 192 C88 190 75 191 66 198 C64 214 70 228 82 232 C90 233 97 230 100 226 Z'],
  ['ischios', 'M69 235 C80 239 90 238 97.5 234 C95 254 93 273 90 290 L70 290 C67 270 66 252 69 235 Z'],
  ['mollets', MOLLETS],
]

/* ---------- Silhouette femme : épaules et taille plus étroites, hanches plus larges, bras plus fins ---------- */
const SILHOUETTE_FEMME =
  'M100 44 L92 44 L92 60 C84 63 70 64 59 70 C52 73 48 84 48 96 L44 150 L41 205 C38 222 38 238 42 243 L51 243 ' +
  'C53 232 52 220 51 208 L59 152 L65 108 C66 124 72 138 76 152 C72 168 63 182 61 200 C60 230 64 262 68 292 ' +
  'C66 315 64 345 72 380 L70 402 L88 402 L83 380 C86 350 88 320 90 292 C94 262 97 232 100 206 Z'

const DELTO_LAT_F = 'M59 70 C52 73 48 84 48 96 L49 104 L54 104 C54 92 55 80 59 70 Z'
const DELTO_F = 'M59 70 L65 74 C66 84 66 94 63 102 L54 104 C54 92 55 80 59 70 Z'
const BRAS_F = 'M47.5 104 L64 104 C63 120 61 134 59.5 147 L44.2 147 Z'
const AVANT_BRAS_F = 'M44 152 L59 152 L51 207 L41 207 Z'

const FACE_FEMME: Partie[] = [
  ['delto_lat', DELTO_LAT_F],
  ['delto_ant', DELTO_F],
  ['pectoraux', 'M100 76 C89 74 77 74 66 78 C65 92 65 104 69 112 C79 123 92 124 100 121 Z'],
  ['biceps', BRAS_F],
  ['avant_bras', AVANT_BRAS_F],
  ['obliques', 'M68 118 C76 124 80 127 82 130 L82 178 L69.5 178 C73 168 75.5 160 75 152 C72 142 69 130 68 118 Z'],
  ['abdominaux', ABDOMINAUX],
  ['adducteurs', ADDUCTEURS],
  ['quadriceps', 'M62.5 206 C76 212 88 212 94 212 C90 232 86 252 84 274 L84 290 L69 290 C65 262 63 232 62.5 206 Z'],
  ['mollets', MOLLETS],
]

const DOS_FEMME: Partie[] = [
  ['haut_dos', 'M100 56 L92 62 C85 65 76 67 64 74 C65 84 67 94 70 100 C81 100 92 104 100 108 Z'],
  ['grand_dorsal', 'M66 110 C77 106 90 110 100 112 L100 142 C93 152 88 162 85 172 C80 164 77 158 75 152 C72 140 67 126 66 110 Z'],
  ['lombaires', LOMBAIRES],
  ['delto_lat', DELTO_LAT_F],
  ['delto_post', DELTO_F],
  ['triceps', BRAS_F],
  ['avant_bras', AVANT_BRAS_F],
  ['fessiers', 'M100 192 C88 190 72 191 62.5 198 C60.5 214 64 228 82 232 C90 233 97 230 100 226 Z'],
  ['ischios', 'M65 235 C78 239 90 238 97.5 234 C95 254 93 273 90 290 L69.5 290 C66 270 63 252 65 235 Z'],
  ['mollets', MOLLETS],
]

const MODELES: Record<Silhouette, { corps: string; face: Partie[]; dos: Partie[] }> = {
  homme: { corps: SILHOUETTE_HOMME, face: FACE_HOMME, dos: DOS_HOMME },
  femme: { corps: SILHOUETTE_FEMME, face: FACE_FEMME, dos: DOS_FEMME },
}

function Vue({ legende, corps, parties, volumes, maxi, choisi, onChoisir }: {
  legende: string
  corps: string
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
            <path className="corps" d={corps} />
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

/**
 * Silhouettes Face + Dos statiques (utilisées aussi dans le PDF du bilan mensuel).
 * Sans propriété « silhouette », on prend celle du client en cours (homme par défaut).
 */
export function SchemaMuscles({ parMuscle, choisi, onChoisir, silhouette }: {
  parMuscle: Record<string, Volume>
  choisi?: string | null
  onChoisir?: (muscle: string) => void
  silhouette?: Silhouette
}) {
  const ctx = useContext(ClientCtx)
  const modele = MODELES[silhouette ?? ctx?.client.silhouette ?? 'homme'] ?? MODELES.homme
  const volumes = Object.fromEntries(Object.entries(parMuscle).map(([muscle, v]) => [muscle, v.total]))
  const maxi = Math.max(0, ...Object.values(volumes))
  return (
    <div className="mannequin">
      <Vue legende="Face" corps={modele.corps} parties={modele.face} volumes={volumes} maxi={maxi} choisi={choisi} onChoisir={onChoisir} />
      <Vue legende="Dos" corps={modele.corps} parties={modele.dos} volumes={volumes} maxi={maxi} choisi={choisi} onChoisir={onChoisir} />
    </div>
  )
}

export default function Mannequin({ parMuscle, silhouette }: { parMuscle: Record<string, Volume>; silhouette?: Silhouette }) {
  const [choisi, setChoisi] = useState<string | null>(null)
  const volumes = Object.fromEntries(Object.entries(parMuscle).map(([muscle, v]) => [muscle, v.total]))
  const choisir = (muscle: string) => setChoisi(c => (c === muscle ? null : muscle))
  const equilibres = phrasesEquilibre(parMuscle)
  const apports = choisi ? [...(parMuscle[choisi]?.apports ?? [])].sort((a, b) => b.series * b.coefficient - a.series * a.coefficient) : []

  return (
    <div>
      <SchemaMuscles parMuscle={parMuscle} choisi={choisi} onChoisir={choisir} silhouette={silhouette} />
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
          <p className="meta">Séries pondérées. Poussée : pectoraux, deltoïdes antérieurs, triceps. Tirage : grand dorsal, haut du dos, biceps.</p>        </>
      )}
    </div>
  )
}
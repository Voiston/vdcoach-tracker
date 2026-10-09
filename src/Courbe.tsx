import { useState } from 'react'

export type Point = { date: string; valeur: number; record?: boolean }

const jour = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
const nb = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')

/**
 * Courbe de progression interactive : on survole ou on touche la courbe pour lire la valeur et la date d'un point
 * (flèches du clavier aussi). Option : ligne d'objectif en pointillés et marque des records personnels.
 */
export default function Courbe({ nom, points, unite, cible }: { nom: string; points: Point[]; unite: string; cible?: { valeur: number } }) {
  const [choisi, setChoisi] = useState<number | null>(null)

  if (points.length < 2)
    return (
      <div className="courbe-vide">
        {points.length > 0 && <strong>{nb(points[0].valeur)} {unite}</strong>}
        <span>{points.length ? 'Une seule valeur pour l’instant : la courbe apparaît dès la deuxième.' : 'Pas encore de données.'}</span>
        {cible && <span>Objectif : {nb(cible.valeur)} {unite}</span>}
      </div>
    )

  const W = 320, H = 170, G = 34, D = 14, T = 14, B = 26
  const t = points.map(p => Date.parse(p.date))
  const v = points.map(p => p.valeur)
  const [t0, t1] = [Math.min(...t), Math.max(...t)]
  const valeurs = cible ? [...v, cible.valeur] : v
  let [bas, haut] = [Math.min(...valeurs), Math.max(...valeurs)]
  if (bas === haut) { bas -= 1; haut += 1 }
  const marge = (haut - bas) * 0.08
  const [b0, b1] = [bas - marge, haut + marge]
  const x = (ms: number) => G + ((ms - t0) / (t1 - t0 || 1)) * (W - G - D)
  const y = (val: number) => H - B - ((val - b0) / (b1 - b0)) * (H - B - T)
  const trace = points.map((p, k) => `${k ? 'L' : 'M'}${x(t[k]).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(' ')

  const i = Math.min(choisi ?? points.length - 1, points.length - 1)
  const p = points[i]
  const delta = v[v.length - 1] - v[0]

  function viser(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let meilleur = 0
    for (let k = 1; k < points.length; k++) if (Math.abs(x(t[k]) - px) < Math.abs(x(t[meilleur]) - px)) meilleur = k
    setChoisi(meilleur)
  }

  function clavier(e: React.KeyboardEvent) {
    const cibles: Record<string, number> = { ArrowLeft: Math.max(0, i - 1), ArrowRight: Math.min(points.length - 1, i + 1), Home: 0, End: points.length - 1 }
    if (!(e.key in cibles)) return
    e.preventDefault()
    setChoisi(cibles[e.key])
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="courbe"
        role="img"
        tabIndex={0}
        aria-label={`${nom} : ${points.length} valeurs, de ${nb(v[0])} à ${nb(v[v.length - 1])} ${unite}. Utilise les flèches gauche et droite pour parcourir les points.`}
        onPointerMove={viser}
        onPointerDown={viser}
        onKeyDown={clavier}
      >
        <line className="axe" x1={G} y1={H - B} x2={W - D} y2={H - B} />
        {cible && (
          <>
            <line className="cible" x1={G} x2={W - D} y1={y(cible.valeur)} y2={y(cible.valeur)} />
            <text className="cible-texte" x={W - D} y={y(cible.valeur) - 4} fontSize="10" textAnchor="end">Objectif {nb(cible.valeur)}</text>
          </>
        )}
        <line className="repere" x1={x(t[i])} x2={x(t[i])} y1={T} y2={H - B} />
        <path d={trace} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((q, k) => (
          <g key={k}>
            {q.record && <circle className="record" cx={x(t[k])} cy={y(q.valeur)} r="7" fill="none" />}
            <circle cx={x(t[k])} cy={y(q.valeur)} r={k === i ? 5 : 3} fill="currentColor" />
          </g>
        ))}
        <text x={2} y={y(haut === bas ? haut : Math.max(...v)) + 4} fontSize="10">{nb(Math.max(...v))}</text>
        <text x={2} y={y(Math.min(...v)) + 4} fontSize="10">{nb(Math.min(...v))}</text>
        <text x={G} y={H - 8} fontSize="10">{jour(points[0].date)}</text>
        <text x={W - D} y={H - 8} fontSize="10" textAnchor="end">{jour(points[points.length - 1].date)}</text>
      </svg>
      <p className="courbe-info" aria-live="polite">
        <strong>{nb(p.valeur)} {unite}</strong> · {jour(p.date)}{p.record ? ' · 🏆 Record' : ''}
      </p>
      <p className="meta">
        {delta > 0 ? '+' : ''}{nb(delta)} {unite} depuis le {jour(points[0].date)}
        {cible ? ` · objectif : ${nb(cible.valeur)} ${unite}` : ''}
      </p>
    </div>
  )
}

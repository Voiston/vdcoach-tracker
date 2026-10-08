import { etatObjectif, libelle, unite, type Objectif } from './objectifs-lib'

export default function JaugeObjectif({ objectif: o, actuelle }: { objectif: Objectif; actuelle: number | null }) {
  const { pct, atteint, reste } = etatObjectif(o, actuelle)
  const nom = libelle(o.source, o.reference)
  return (
    <div className="objectif">
      <strong>{nom}</strong>
      <p className="meta">
        {Number(o.valeur_depart)} → <b>{actuelle ?? '?'}</b> → {Number(o.valeur_cible)} {unite(o.source, o.reference)}
      </p>
      <div className={`jauge ${atteint ? 'atteint' : ''}`} role="progressbar" aria-label={`Progression : ${nom}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <p className="meta">
        {Math.round(pct)} %
        {atteint ? ' · 🎯 Atteint' : reste === null ? '' : reste >= 0 ? ` · ${reste} jour(s) restant(s)` : ` · échéance dépassée de ${-reste} j`}
      </p>
    </div>
  )
}

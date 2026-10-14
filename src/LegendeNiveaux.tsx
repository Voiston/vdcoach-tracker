// Explique les couleurs des badges musculaires affichés sur les exercices.
// Les classes correspondent à celles produites par niveauDe() dans definitions.ts.
const NIVEAUX_LEGENDE = [
  { classe: 'principal', libelle: 'Principal', detail: 'muscle qui travaille le plus' },
  { classe: 'secondaire', libelle: 'Secondaire', detail: 'environ la moitié de la charge' },
  { classe: 'stabilisateur', libelle: 'Stabilisateur', detail: 'environ un quart de la charge' },
]

export default function LegendeNiveaux() {
  return (
    <div className="legende-niveaux" role="note" aria-label="Légende des niveaux de sollicitation">
      <span className="legende-titre">Muscles ciblés :</span>
      {NIVEAUX_LEGENDE.map(n => (
        <span key={n.classe} className="legende-item">
          <span className={`puce ${n.classe}`}>{n.libelle}</span>
          <span className="meta">{n.detail}</span>
        </span>
      ))}
    </div>
  )
}

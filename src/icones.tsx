const CHEMINS: Record<string, string> = {
  seance: 'M12 5v14M5 12h14',
  historique: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0z',
  suivi: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
  exercices: 'M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12',
  clients: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M17 14c2.5.3 4 2 4 5',
}

export default function Icone({ nom }: { nom: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={CHEMINS[nom]} />
    </svg>
  )
}

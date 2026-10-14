const CHEMINS: Record<string, string> = {
  facturation: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6',
  recherche: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3',
  objectif: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM12 11.5v1',
  muscles: 'M3 12h4l3-8 4 16 3-8h4',
  calendrier: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4',
  reglages: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 14V3M1 14h6M9 8h6M17 16h6',
  seance: 'M12 5v14M5 12h14',
  historique: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0z',
  suivi: 'M4 19V5M4 19h16M8 15l4-4 3 3 5-6',
  exercices: 'M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12',
  clients: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-5 6-5s6 2 6 5M17 11a2.5 2.5 0 1 0 0-5M17 14c2.5.3 4 2 4 5',
  modifier: 'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3zM15 5l4 4',
  supprimer: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6',
  pdf: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6M12 18v-6M9.5 15.5L12 18l2.5-2.5',
}

export default function Icone({ nom }: { nom: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={CHEMINS[nom]} />
    </svg>
  )
}
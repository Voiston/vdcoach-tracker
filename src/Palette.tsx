import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { normaliser } from './SelecteurExercice'
import Icone from './icones'

type Entree = { cle: string; libelle: string; detail: string; type: 'client' | 'seance' | 'exercice' | 'page'; valeur: string }
type ClientCourt = { id: string; prenom: string; nom: string | null; actif: boolean }

const PAGES = [
  { page: 'clients', libelle: 'Clients' },
  { page: 'exercices', libelle: 'Exercices' },
  { page: 'facturation', libelle: 'Facturation' },
  { page: 'reglages', libelle: 'Réglages' },
]

export default function Palette({ ouvert, onFermer, onClient, onSeance, onExercice, onPage }: {
  ouvert: boolean
  onFermer: () => void
  onClient: (id: string) => void
  onSeance: (id: string) => void
  onExercice: (nom: string) => void
  onPage: (page: string) => void
}) {
  const [clients, setClients] = useState<ClientCourt[]>([])
  const [exercices, setExercices] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [index, setIndex] = useState(0)

  // Les données sont rechargées à chaque ouverture : la liste est toujours à jour
  useEffect(() => {
    if (!ouvert) return
    setQ('')
    setIndex(0)
    supabase.from('clients').select('id, prenom, nom, actif').order('prenom').then(({ data }) => setClients((data ?? []) as ClientCourt[]))
    supabase.from('bibliotheque_exercices').select('nom').order('nom').then(({ data }) => setExercices((data ?? []).map(x => x.nom as string)))
  }, [ouvert])

  useEffect(() => {
    setIndex(0)
  }, [q])

  useEffect(() => {
    if (!ouvert) return
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [ouvert, onFermer])

  if (!ouvert) return null

  const nomComplet = (c: ClientCourt) => `${c.prenom} ${c.nom ?? ''}`.trim()
  const entreeClient = (c: ClientCourt): Entree => ({ cle: `c-${c.id}`, libelle: nomComplet(c), detail: c.actif ? 'Ouvrir le profil' : 'Client archivé', type: 'client', valeur: c.id })
  const entreeSeance = (c: ClientCourt): Entree => ({ cle: `s-${c.id}`, libelle: `Nouvelle séance — ${nomComplet(c)}`, detail: 'Démarrer une séance', type: 'seance', valeur: c.id })
  const entreePage = (p: { page: string; libelle: string }): Entree => ({ cle: `p-${p.page}`, libelle: p.libelle, detail: 'Aller à la page', type: 'page', valeur: p.page })

  const n = normaliser(q)
  const entrees: Entree[] = n
    ? [
        ...clients.filter(c => normaliser(nomComplet(c)).includes(n)).map(entreeClient),
        ...clients.filter(c => c.actif && normaliser(nomComplet(c)).includes(n)).slice(0, 3).map(entreeSeance),
        ...exercices.filter(e => normaliser(e).includes(n)).slice(0, 5).map(e => ({ cle: `e-${e}`, libelle: e, detail: 'Voir dans la bibliothèque', type: 'exercice' as const, valeur: e })),
        ...PAGES.filter(p => normaliser(p.libelle).includes(n)).map(entreePage),
      ]
    : [...PAGES.map(entreePage), ...clients.filter(c => c.actif).slice(0, 6).map(entreeClient)]
  const affichees = entrees.slice(0, 12)

  function choisir(e: Entree | undefined) {
    if (!e) return
    onFermer()
    if (e.type === 'client') onClient(e.valeur)
    else if (e.type === 'seance') onSeance(e.valeur)
    else if (e.type === 'exercice') onExercice(e.valeur)
    else onPage(e.valeur)
  }

  function clavier(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(affichees.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); choisir(affichees[index]) }
  }

  return (
    <div className="voile palette-voile" onClick={onFermer}>
      <div className="feuille palette" role="dialog" aria-modal="true" aria-label="Recherche rapide" onClick={e => e.stopPropagation()}>
        <div className="palette-champ">
          <Icone nom="recherche" />
          <input
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-liste"
            aria-activedescendant={affichees[index] ? `palette-${affichees[index].cle}` : undefined}
            aria-label="Rechercher un client, une séance ou un exercice"
            placeholder="Rechercher un client, une séance, un exercice…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={clavier}
          />
        </div>
        <ul id="palette-liste" role="listbox" className="palette-liste">
          {affichees.map((e, k) => (
            <li key={e.cle} id={`palette-${e.cle}`} role="option" aria-selected={k === index}>
              <button type="button" className={k === index ? 'actif' : ''} onMouseEnter={() => setIndex(k)} onClick={() => choisir(e)}>
                <span>{e.libelle}</span>
                <span className="meta">{e.detail}</span>
              </button>
            </li>
          ))}
        </ul>
        {!affichees.length && <p className="meta">Aucun résultat.</p>}
      </div>
    </div>
  )
}

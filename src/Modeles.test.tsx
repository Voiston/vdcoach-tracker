import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import Modeles from './Modeles'

const modelesMock = [
  {
    id: 'modele-1',
    nom: 'Full Body A',
    duree_min: 60,
    modele_exercices: [
      { id: 'exo-1', ordre: 0, nom: 'Squat', series: 3, repetitions: 10, charge_kg: 80, lie_suivant: true },
      { id: 'exo-2', ordre: 1, nom: 'Fentes', series: 3, repetitions: 10, charge_kg: 20, lie_suivant: false },
      { id: 'exo-3', ordre: 2, nom: 'Mollets', series: 3, repetitions: 15, charge_kg: 40, lie_suivant: false },
    ],
  },
]

vi.mock('./supabase', () => {
  const chain = () => {
    const obj: any = {}
    obj.select = vi.fn().mockReturnValue(obj)
    obj.insert = vi.fn().mockReturnValue(obj)
    obj.update = vi.fn().mockReturnValue(obj)
    obj.delete = vi.fn().mockReturnValue(obj)
    obj.eq = vi.fn().mockReturnValue(obj)
    obj.order = vi.fn().mockReturnValue(obj)
    obj.single = vi.fn().mockResolvedValue({ data: null, error: null })
    obj.then = (fn: (res: { data: any; error: any }) => void) =>
      Promise.resolve(fn({ data: modelesMock, error: null }))
    return obj
  }

  return {
    supabase: {
      from: vi.fn().mockImplementation(() => chain()),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    },
  }
})

describe('Modeles.tsx - Gestion des supersets dans l\'éditeur', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retirer le dernier exercice d\'un superset réinitialise lie_suivant sur le précédent', async () => {
    const { container } = render(<Modeles />)

    // Attendre l'affichage du modèle
    const btnModifier = await screen.findByRole('button', { name: /Modifier Full Body A/i })
    fireEvent.click(btnModifier)

    const editeur = container.querySelector('.carte-section') as HTMLElement
    expect(editeur).toBeInTheDocument()

    // Vérifier l'état initial dans l'éditeur : Squat lié (A1) et Fentes lié (A2)
    const withinEditeur = within(editeur)
    expect(withinEditeur.getByText('A1')).toBeInTheDocument()
    expect(withinEditeur.getByText('A2')).toBeInTheDocument()
    expect(withinEditeur.getByRole('button', { name: /⛓ Superset/i })).toBeInTheDocument()

    // Retirer Fentes (le 2e exercice du superset qui avait lie_suivant: false)
    const btnRetirerFentes = withinEditeur.getByRole('button', { name: /Retirer Fentes/i })
    fireEvent.click(btnRetirerFentes)

    // Fentes est retiré de l'éditeur
    expect(withinEditeur.queryByText('Fentes')).not.toBeInTheDocument()

    // Squat ne doit plus être lié à Mollets dans l'éditeur (aucun badge A1 ou A2)
    expect(withinEditeur.queryByText('A1')).not.toBeInTheDocument()
    expect(withinEditeur.queryByText('A2')).not.toBeInTheDocument()

    // Le bouton superset sur Squat doit maintenant proposer "+ Superset" et non "⛓ Superset"
    expect(withinEditeur.queryByRole('button', { name: /⛓ Superset/i })).not.toBeInTheDocument()
    expect(withinEditeur.getByRole('button', { name: /\+ Superset/i })).toBeInTheDocument()
  })

  it('déplacer un exercice lié vers la dernière position réinitialise lie_suivant', async () => {
    const { container } = render(<Modeles />)

    const btnModifier = await screen.findByRole('button', { name: /Modifier Full Body A/i })
    fireEvent.click(btnModifier)

    const editeur = container.querySelector('.carte-section') as HTMLElement
    expect(editeur).toBeInTheDocument()
    const withinEditeur = within(editeur)

    // On descend Squat deux fois pour le placer en dernière position
    const btnsDescendre = withinEditeur.getAllByRole('button', { name: /Descendre/i })
    // Le premier bouton "Descendre" correspond à Squat (index 0)
    fireEvent.click(btnsDescendre[0])

    // Maintenant Squat est à l'index 1. On le descend encore à l'index 2 (dernière position)
    const btnsDescendreApres = withinEditeur.getAllByRole('button', { name: /Descendre/i })
    // À l'index 1, c'est Squat
    fireEvent.click(btnsDescendreApres[1])

    // Squat est maintenant à la fin (index 2). Il ne doit plus avoir lie_suivant: true
    expect(withinEditeur.queryByRole('button', { name: /⛓ Superset/i })).not.toBeInTheDocument()
    expect(withinEditeur.queryByText('A1')).not.toBeInTheDocument()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import { importerExercicesCatalogue, type ExerciceCatalogue } from './catalogue-exercices'
import Bibliotheque from './Bibliotheque'
import { MSG_RESEAU } from './erreurs'

// Mock Supabase
const mockFrom = vi.fn()
vi.mock('./supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}))

describe('[REG-02] catalogue-exercices.ts - importerExercicesCatalogue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('traduit les erreurs réseau d’insertion avec messageErreur', async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Failed to fetch', code: '' },
        }),
      }),
    })

    const result = await importerExercicesCatalogue([
      {
        nom: 'Exo Test',
        groupe: 'Jambes',
        materiel: 'Poids du corps',
        notes: '',
        muscles: [],
      },
    ])

    expect(result.ajoutes).toBe(0)
    expect(result.erreur).toBe(MSG_RESEAU)
  })

  it('traduit les erreurs d’insertion des muscles avec messageErreur', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bibliotheque_exercices') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'id-1', nom: 'Exo Test' }],
              error: null,
            }),
          }),
        }
      }
      if (table === 'exercice_muscles') {
        return {
          upsert: vi.fn().mockResolvedValue({
            error: { message: 'network request failed', code: '' },
          }),
        }
      }
      return {}
    })

    const result = await importerExercicesCatalogue([
      {
        nom: 'Exo Test',
        groupe: 'Jambes',
        materiel: 'Poids du corps',
        notes: '',
        muscles: [{ muscle: 'quadriceps', coefficient: 1 }],
      },
    ])

    expect(result.ajoutes).toBe(1)
    expect(result.erreur).toBe(MSG_RESEAU)
  })
})

describe('[REG-02] Bibliotheque.tsx - Modale catalogue et échec partiel', () => {
  let dbExercices: any[] = []

  function chainMock(table: string) {
    const builder: any = {}
    builder.order = vi.fn().mockReturnValue(builder)
    builder.select = vi.fn().mockReturnValue(builder)
    builder.insert = vi.fn().mockReturnValue(builder)
    builder.upsert = vi.fn().mockResolvedValue({ error: null })
    builder.delete = vi.fn().mockReturnValue(builder)
    builder.eq = vi.fn().mockReturnValue(builder)
    builder.in = vi.fn().mockReturnValue(builder)
    builder.then = (fn: (res: any) => void) => {
      if (table === 'bibliotheque_exercices') {
        return Promise.resolve(fn({ data: dbExercices, error: null }))
      }
      return Promise.resolve(fn({ data: [], error: null }))
    }
    return builder
  }

  beforeEach(() => {
    dbExercices = []
    mockFrom.mockReset()
    mockFrom.mockImplementation((table: string) => chainMock(table))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('affiche le MessageErreur à l’intérieur de la modale en cas d’erreur d’import', async () => {
    render(<Bibliotheque />)

    // Attendre le chargement initial
    const btnOuvrir = await screen.findByRole('button', { name: /\+ Catalogue recommandé/ })
    fireEvent.click(btnOuvrir)

    const dialogue = screen.getByRole('dialog')
    expect(dialogue).toBeDefined()

    // Configurer l'échec d'insertion Supabase
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bibliotheque_exercices') {
        const builder: any = {}
        builder.order = vi.fn().mockReturnValue(builder)
        builder.select = vi.fn().mockReturnValue(builder)
        builder.insert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            then: (fn: any) => Promise.resolve(fn({ data: null, error: { message: 'Failed to fetch', code: '' } })),
          }),
        })
        builder.then = (fn: (res: any) => void) => Promise.resolve(fn({ data: dbExercices, error: null }))
        return builder
      }
      return chainMock(table)
    })

    // Cliquer sur "+ Ajouter" pour le premier exercice visible
    const boutonsAjouter = screen.getAllByRole('button', { name: '+ Ajouter' })
    await act(async () => {
      fireEvent.click(boutonsAjouter[0])
    })

    // L'erreur doit être visible DANS la modale
    const alerte = within(dialogue).getByRole('alert')
    expect(alerte).toBeDefined()
    expect(alerte.textContent).toContain(MSG_RESEAU)
  })

  it('appelle charger() en cas d’échec partiel afin d’actualiser manquants et éviter les doublons', async () => {
    render(<Bibliotheque />)

    const btnOuvrir = await screen.findByRole('button', { name: /\+ Catalogue recommandé/ })
    fireEvent.click(btnOuvrir)

    const dialogue = screen.getByRole('dialog')
    expect(dialogue).toBeDefined()

    // Simuler : Lot 1 (50 exercices) réussit, Lot 2 (exercices restants) échoue
    let appelLot = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bibliotheque_exercices') {
        const builder: any = {}
        builder.order = vi.fn().mockReturnValue(builder)
        builder.select = vi.fn().mockReturnValue(builder)
        builder.insert = vi.fn().mockImplementation((lignes: any[]) => {
          appelLot++
          const insertBuilder: any = {}
          if (appelLot === 1) {
            // 50 premiers exercices insérés avec succès
            const crees = lignes.map((l, idx) => ({ id: `exo-${idx}`, nom: l.nom, ...l, exercice_muscles: [] }))
            dbExercices = [...dbExercices, ...crees]
            insertBuilder.select = vi.fn().mockReturnValue({
              then: (fn: any) => Promise.resolve(fn({ data: crees.map(c => ({ id: c.id, nom: c.nom })), error: null })),
            })
          } else {
            // 2e lot échoue
            insertBuilder.select = vi.fn().mockReturnValue({
              then: (fn: any) => Promise.resolve(fn({ data: null, error: { message: 'Failed to fetch', code: '' } })),
            })
          }
          return insertBuilder
        })
        builder.then = (fn: (res: any) => void) => Promise.resolve(fn({ data: dbExercices, error: null }))
        return builder
      }
      return chainMock(table)
    })

    // Cliquer sur "Tout ajouter (...)"
    const btnToutAjouter = screen.getByRole('button', { name: /Tout ajouter/ })
    await act(async () => {
      fireEvent.click(btnToutAjouter)
    })

    // 1. La modale reste ouverte pour afficher l'erreur
    expect(screen.getByRole('dialog')).toBeDefined()
    expect(within(dialogue).getByRole('alert')).toBeDefined()

    // 2. Grâce au if (res.ajoutes > 0) await charger(), dbExercices (50) a été rechargé !
    // manquants a été recalculé : il reste désormais (65 - 50 = 15) exercices manquants !
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Tout ajouter \(15 nouveaux\)/ })).toBeDefined()
      expect(screen.getByText('50 déjà présent(s)')).toBeDefined()
    })
  })
})

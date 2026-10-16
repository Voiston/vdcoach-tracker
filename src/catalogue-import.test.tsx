import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor, within } from '@testing-library/react'
import {
  importerExercicesCatalogue,
  exosManquantsDuCatalogue,
  CATALOGUE_EXERCICES,
  type ExerciceCatalogue,
} from './catalogue-exercices'
import Bibliotheque from './Bibliotheque'
import { MSG_RESEAU, MSG_SERVEUR } from './erreurs'

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

  it('ne fait rien et renvoie ajoutes: 0 si la liste d’exercices à importer est vide', async () => {
    const result = await importerExercicesCatalogue([])
    expect(result).toEqual({ ajoutes: 0 })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('importe avec succès plusieurs lots (> 50 exercices) avec leurs muscles associés', async () => {
    // 65 exercices à importer : lot 1 (50) et lot 2 (15)
    const liste65: ExerciceCatalogue[] = Array.from({ length: 65 }, (_, i) => ({
      nom: `Exercice Catalogue ${i + 1}`,
      groupe: 'Jambes',
      materiel: 'Poids du corps',
      notes: `Notes ${i + 1}`,
      muscles: [{ muscle: 'quadriceps', coefficient: 1 }],
    }))

    const callsInsert: any[] = []
    const callsMuscles: any[] = []

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bibliotheque_exercices') {
        return {
          insert: vi.fn().mockImplementation((lignes: any[]) => {
            callsInsert.push(lignes)
            const crees = lignes.map((l, idx) => ({ id: `id-${callsInsert.length}-${idx}`, nom: l.nom }))
            return {
              select: vi.fn().mockResolvedValue({
                data: crees,
                error: null,
              }),
            }
          }),
        }
      }
      if (table === 'exercice_muscles') {
        return {
          upsert: vi.fn().mockImplementation((muscles: any[]) => {
            callsMuscles.push(muscles)
            return Promise.resolve({ error: null })
          }),
        }
      }
      return {}
    })

    const result = await importerExercicesCatalogue(liste65)

    expect(result).toEqual({ ajoutes: 65 })
    // Vérification du découpage en 2 lots de taille 50 max
    expect(callsInsert.length).toBe(2)
    expect(callsInsert[0].length).toBe(50)
    expect(callsInsert[1].length).toBe(15)

    // Vérification de l'insertion des muscles pour chaque lot
    expect(callsMuscles.length).toBe(2)
    expect(callsMuscles[0].length).toBe(50)
    expect(callsMuscles[1].length).toBe(15)
  })

  it('interrompt l’import et renvoie les ajouts partiels si le 2e lot de 50 exercices échoue', async () => {
    // 65 exercices : le 1er lot (50) doit réussir, le 2e lot (15) doit échouer
    const liste65: ExerciceCatalogue[] = Array.from({ length: 65 }, (_, i) => ({
      nom: `Exercice Batch ${i + 1}`,
      groupe: 'Pectoraux',
      materiel: 'Haltères',
      notes: '',
      muscles: [{ muscle: 'pectoraux', coefficient: 1 }],
    }))

    let batchCount = 0
    const callsMuscles: any[] = []

    mockFrom.mockImplementation((table: string) => {
      if (table === 'bibliotheque_exercices') {
        return {
          insert: vi.fn().mockImplementation((lignes: any[]) => {
            batchCount++
            if (batchCount === 1) {
              const crees = lignes.map((l, idx) => ({ id: `batch1-${idx}`, nom: l.nom }))
              return {
                select: vi.fn().mockResolvedValue({
                  data: crees,
                  error: null,
                }),
              }
            } else {
              // Échec sur le 2e lot
              return {
                select: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection timeout', status: 504 },
                }),
              }
            }
          }),
        }
      }
      if (table === 'exercice_muscles') {
        return {
          upsert: vi.fn().mockImplementation((muscles: any[]) => {
            callsMuscles.push(muscles)
            return Promise.resolve({ error: null })
          }),
        }
      }
      return {}
    })

    const result = await importerExercicesCatalogue(liste65)

    // 50 exercices ont été insérés avant l'échec
    expect(result.ajoutes).toBe(50)
    expect(result.erreur).toBe(MSG_SERVEUR)

    // Seuls les muscles du 1er lot ont été insérés
    expect(callsMuscles.length).toBe(1)
    expect(callsMuscles[0].length).toBe(50)
  })

  it('renvoie les exercices insérés et l’erreur si l’insertion des muscles du 2e lot échoue', async () => {
    const liste65: ExerciceCatalogue[] = Array.from({ length: 65 }, (_, i) => ({
      nom: `Exercice Muscles ${i + 1}`,
      groupe: 'Dos',
      materiel: 'Poids du corps',
      notes: '',
      muscles: [{ muscle: 'grand_dorsal', coefficient: 1 }],
    }))

    let batchCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'bibliotheque_exercices') {
        return {
          insert: vi.fn().mockImplementation((lignes: any[]) => {
            batchCount++
            const crees = lignes.map((l, idx) => ({ id: `m-batch${batchCount}-${idx}`, nom: l.nom }))
            return {
              select: vi.fn().mockResolvedValue({
                data: crees,
                error: null,
              }),
            }
          }),
        }
      }
      if (table === 'exercice_muscles') {
        return {
          upsert: vi.fn().mockImplementation(() => {
            if (batchCount === 1) {
              return Promise.resolve({ error: null })
            }
            // Erreur sur les muscles du 2e lot
            return Promise.resolve({ error: { message: 'Failed to fetch', code: '' } })
          }),
        }
      }
      return {}
    })

    const result = await importerExercicesCatalogue(liste65)

    // Les 65 exercices ont été créés dans bibliotheque_exercices
    expect(result.ajoutes).toBe(65)
    expect(result.erreur).toBe(MSG_RESEAU)
  })
})

describe('catalogue-exercices.ts - exosManquantsDuCatalogue', () => {
  it('renvoie tous les exercices du catalogue si aucun exercice n’existe en base', () => {
    const manquants = exosManquantsDuCatalogue([])
    expect(manquants.length).toBe(CATALOGUE_EXERCICES.length)
    expect(manquants).toEqual(CATALOGUE_EXERCICES)
  })

  it('exclut les exercices déjà présents dans la base', () => {
    const existants = [{ nom: 'Course à pieds' }, { nom: 'Gainage inversé' }]
    const manquants = exosManquantsDuCatalogue(existants)

    expect(manquants.length).toBe(CATALOGUE_EXERCICES.length - 2)
    expect(manquants.some(e => e.nom === 'Course à pieds')).toBe(false)
    expect(manquants.some(e => e.nom === 'Gainage inversé')).toBe(false)
    expect(manquants.some(e => e.nom === 'Pistol squats')).toBe(true)
  })

  it('est insensible à la casse et aux espaces superflus', () => {
    const existants = [{ nom: '  course à pieds  ' }, { nom: 'GAINAGE INVERSÉ' }]
    const manquants = exosManquantsDuCatalogue(existants)

    expect(manquants.some(e => e.nom === 'Course à pieds')).toBe(false)
    expect(manquants.some(e => e.nom === 'Gainage inversé')).toBe(false)
  })

  it('est insensible aux accents grâce à normaliser()', () => {
    // 'Gainage inverse' sans accent doit filtrer 'Gainage inversé'
    // 'Développé couché avec haltères' sans accent doit être filtré
    const existants = [
      { nom: 'Gainage inverse' },
      { nom: 'Developpe couche avec halteres' },
    ]
    const manquants = exosManquantsDuCatalogue(existants)

    expect(manquants.some(e => e.nom === 'Gainage inversé')).toBe(false)
    expect(manquants.some(e => e.nom === 'Développé couché avec haltères')).toBe(false)
  })

  it('renvoie un tableau vide si tous les exercices du catalogue sont déjà en base', () => {
    const existants = CATALOGUE_EXERCICES.map(e => ({ nom: e.nom }))
    const manquants = exosManquantsDuCatalogue(existants)

    expect(manquants).toEqual([])
  })

  it('ignore les exercices existants qui ne font pas partie du catalogue officiel', () => {
    const existants = [{ nom: 'Exercice custom unique de musculation' }]
    const manquants = exosManquantsDuCatalogue(existants)

    expect(manquants.length).toBe(CATALOGUE_EXERCICES.length)
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

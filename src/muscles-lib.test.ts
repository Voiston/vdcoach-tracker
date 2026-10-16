import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  cle,
  phrasesEquilibre,
  calculerMuscles,
  evolutionPct,
  libelleEvolution,
  variationMuscle,
  chargerBibliothequeMuscles,
  chargerSeancesMuscles,
  type Reference,
  type SeanceExo,
  type Volume,
} from './muscles-lib'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('muscles-lib.ts', () => {
  describe('cle', () => {
    it('nettoie et passe en minuscules', () => {
      expect(cle('  Développé Couché  ')).toBe('développé couché')
    })
  })

  describe('phrasesEquilibre', () => {
    it('renvoie vide si aucun volume sur les deux groupes d’une balance', () => {
      const parMuscle: Record<string, Volume> = {}
      expect(phrasesEquilibre(parMuscle)).toEqual([])
    })

    it('indique quand un groupe n’a aucun volume sur la période', () => {
      const parMuscle: Record<string, Volume> = {
        pectoraux: { total: 10, principal: 10, apports: [] },
      }
      const phrases = phrasesEquilibre(parMuscle)
      expect(phrases).toContain('Tirage : aucun volume sur la période')
      expect(phrases).not.toContain('Quadriceps')
    })

    it('détecte l’équilibre lorsque le ratio est >= 90%', () => {
      const parMuscle: Record<string, Volume> = {
        quadriceps: { total: 10, principal: 10, apports: [] },
        ischios: { total: 9.5, principal: 9.5, apports: [] },
      }
      const phrases = phrasesEquilibre(parMuscle)
      expect(phrases).toContain('Quadriceps et ischio-jambiers équilibrés')
    })

    it('calcule le pourcentage du groupe le plus faible par rapport au plus fort', () => {
      const parMuscle: Record<string, Volume> = {
        quadriceps: { total: 20, principal: 20, apports: [] },
        ischios: { total: 10, principal: 10, apports: [] },
      }
      const phrases = phrasesEquilibre(parMuscle)
      expect(phrases).toContain('Ischio-jambiers : 50 % du volume de quadriceps')
    })
  })

  describe('calculerMuscles', () => {
    const biblio: Record<string, Reference> = {
      'développé couché': {
        nom: 'Développé couché',
        groupe: 'Pectoraux',
        exercice_muscles: [
          { muscle: 'pectoraux', coefficient: 1 },
          { muscle: 'triceps', coefficient: 0.5 },
          { muscle: 'delto_ant', coefficient: 0.5 },
        ],
      },
      'traction': {
        nom: 'Traction',
        groupe: 'Dos',
        exercice_muscles: [
          { muscle: 'grand_dorsal', coefficient: 1 },
          { muscle: 'biceps', coefficient: 0.5 },
        ],
      },
      'étirement ischios': {
        nom: 'Étirement ischios',
        groupe: 'Mobilité',
        exercice_muscles: [{ muscle: 'ischios', coefficient: 1 }],
      },
      'course à pied': {
        nom: 'Course à pied',
        groupe: 'Cardio',
        exercice_muscles: [],
      },
      'rameur': {
        nom: 'Rameur',
        groupe: 'Cardio',
        exercice_muscles: [{ muscle: 'grand_dorsal', coefficient: 0.5 }],
      },
    }

    it('ignore les exercices du groupe Mobilité', () => {
      const seances: SeanceExo[] = [
        {
          date_seance: '2025-05-10',
          exercices: [{ nom: 'Étirement ischios', series: 3 }],
        },
      ]
      const res = calculerMuscles(seances, biblio)
      expect(res.seriesTotal).toBe(0)
      expect(res.parMuscle).toEqual({})
      expect(res.nonClasses).toEqual({})
    })

    it('ignore le cardio sans muscles ciblés et ne le classe pas en non-classé', () => {
      const seances: SeanceExo[] = [
        {
          date_seance: '2025-05-10',
          exercices: [{ nom: 'Course à pied', series: 1, duree_min: 20 }],
        },
      ]
      const res = calculerMuscles(seances, biblio)
      expect(res.seriesTotal).toBe(0)
      expect(res.nonClasses).toEqual({})
    })

    it('convertit la durée de cardio avec muscles en séries équivalentes', () => {
      const seances: SeanceExo[] = [
        {
          date_seance: '2025-05-10',
          // 24 min de rameur sans séries indiquées -> 24 / 8 = 3 séries équivalentes
          exercices: [{ nom: 'Rameur', series: null, duree_min: 24 }],
        },
      ]
      const res = calculerMuscles(seances, biblio)
      expect(res.seriesTotal).toBe(3)
      expect(res.parMuscle.grand_dorsal.total).toBe(1.5) // 3 * 0.5
    })

    it('plafonne la conversion de durée cardio à 5 séries maximum', () => {
      const seances: SeanceExo[] = [
        {
          date_seance: '2025-05-10',
          // 60 minutes -> normalement 8 séries, mais plafonné à 5
          exercices: [{ nom: 'Rameur', series: 1, duree_min: 60 }],
        },
      ]
      const res = calculerMuscles(seances, biblio)
      expect(res.seriesTotal).toBe(5)
    })

    it('calcule correctement les volumes totaux, principaux et les apports', () => {
      const seances: SeanceExo[] = [
        {
          date_seance: '2025-05-10',
          exercices: [
            { nom: 'Développé couché', series: 4 },
            { nom: 'Traction', series: 3 },
          ],
        },
        {
          date_seance: '2025-05-12',
          exercices: [{ nom: 'Développé couché', series: 2 }],
        },
      ]

      const res = calculerMuscles(seances, biblio)
      expect(res.seriesTotal).toBe(9) // 4 + 3 + 2

      // Pectoraux : 6 séries au total, toutes principales (coef = 1)
      expect(res.parMuscle.pectoraux).toEqual({
        total: 6,
        principal: 6,
        apports: [{ exercice: 'Développé couché', series: 6, coefficient: 1 }],
      })

      // Triceps : 6 séries à coef 0.5 -> 3, principal 0
      expect(res.parMuscle.triceps).toEqual({
        total: 3,
        principal: 0,
        apports: [{ exercice: 'Développé couché', series: 6, coefficient: 0.5 }],
      })

      // Biceps : 3 séries à coef 0.5 -> 1.5
      expect(res.parMuscle.biceps).toEqual({
        total: 1.5,
        principal: 0,
        apports: [{ exercice: 'Traction', series: 3, coefficient: 0.5 }],
      })
    })

    it('place les exercices inconnus de la bibliothèque dans nonClasses', () => {
      const seances: SeanceExo[] = [
        {
          date_seance: '2025-05-10',
          exercices: [{ nom: 'Exercice Mystère', series: 3 }],
        },
      ]

      const res = calculerMuscles(seances, biblio)
      expect(res.seriesTotal).toBe(3)
      expect(res.nonClasses).toEqual({
        'Exercice Mystère': 3,
      })
    })
  })

  describe('Évolutions & variations', () => {
    it('evolutionPct arrondit à l’entier', () => {
      expect(evolutionPct(15, 10)).toBe(50)
      expect(evolutionPct(8, 10)).toBe(-20)
      expect(evolutionPct(10, 10)).toBe(0)
    })

    it('libelleEvolution formate avec flèches ou stable', () => {
      expect(libelleEvolution(0)).toBe('stable')
      expect(libelleEvolution(25)).toBe('↑ 25 %')
      expect(libelleEvolution(-15)).toBe('↓ 15 %')
    })

    it('variationMuscle gère nouveau, hausse, baisse et stable', () => {
      const avant: Record<string, Volume> = {
        pectoraux: { total: 10, principal: 10, apports: [] },
        biceps: { total: 8, principal: 8, apports: [] },
        triceps: { total: 6, principal: 6, apports: [] },
      }

      // Nouveau
      expect(variationMuscle(avant, 'dos', 5)).toEqual({
        texte: 'nouveau',
        classe: 'nouveau',
      })

      // Hausse
      expect(variationMuscle(avant, 'pectoraux', 15)).toEqual({
        texte: '↑ 50 %',
        classe: 'hausse',
      })

      // Baisse
      expect(variationMuscle(avant, 'biceps', 4)).toEqual({
        texte: '↓ 50 %',
        classe: 'baisse',
      })

      // Stable
      expect(variationMuscle(avant, 'triceps', 6)).toEqual({
        texte: 'stable',
        classe: 'stable',
      })
    })
  })

  describe('Fonctions Supabase asynchrones', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('chargerBibliothequeMuscles structure les références par clé', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [
            { nom: 'Squat', groupe: 'Cuisses', exercice_muscles: [{ muscle: 'quadriceps', coefficient: 1 }] },
          ],
          error: null,
        }),
      } as any)

      const res = await chargerBibliothequeMuscles()
      expect(res.erreur).toBeUndefined()
      expect(res.biblio).toBeDefined()
      expect(res.biblio?.squat.nom).toBe('Squat')
    })

    it('chargerBibliothequeMuscles renvoie l’erreur si Supabase échoue', async () => {
      const dbErr = new Error('Database down')
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: null,
          error: dbErr,
        }),
      } as any)

      const res = await chargerBibliothequeMuscles()
      expect(res.erreur).toBe(dbErr)
    })

    it('chargerSeancesMuscles gère la requête avec et sans décalage', async () => {
      const lteMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const ltMock = vi.fn().mockResolvedValue({ data: [], error: null })
      const gteMock = vi.fn().mockReturnValue({ lte: lteMock, lt: ltMock })
      const eqMock = vi.fn().mockReturnValue({ gte: gteMock })
      const selectMock = vi.fn().mockReturnValue({ eq: eqMock })

      vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as any)

      // Sans décalage
      await chargerSeancesMuscles('c1', 30, 0)
      expect(lteMock).toHaveBeenCalled()

      // Avec décalage
      await chargerSeancesMuscles('c1', 30, 30)
      expect(ltMock).toHaveBeenCalled()
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  unite,
  libelle,
  valeurActuelle,
  etatObjectif,
  chargerObjectifs,
  type Objectif,
  type DonneesObjectifs,
} from './objectifs-lib'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('objectifs-lib.ts', () => {
  describe('unite & libelle', () => {
    it('renvoie les unités selon la source', () => {
      expect(unite('mesure', 'poids')).toBe('kg')
      expect(unite('mesure', 'tour_taille')).toBe('cm')
      expect(unite('test', 'test_pompes')).toBe('reps')
      expect(unite('test', 'test_gainage')).toBe('s')
      expect(unite('charge', 'Développé couché')).toBe('kg')
      expect(unite('mesure', 'inconnu')).toBe('')
    })

    it('renvoie les libellés selon la source', () => {
      expect(libelle('mesure', 'poids')).toBe('Poids')
      expect(libelle('test', 'test_pompes')).toBe('Pompes max')
      expect(libelle('charge', 'Squat barre')).toBe('Squat barre')
    })
  })

  describe('valeurActuelle', () => {
    const donnees: Pick<DonneesObjectifs, 'derniereMesure' | 'meilleureCharge'> = {
      derniereMesure: {
        poids: 78.5,
        test_pompes: 35,
      },
      meilleureCharge: {
        squat: 120,
        'développé couché': 90,
      },
    }

    it('récupère la charge maximale insensible à la casse et aux espaces', () => {
      expect(valeurActuelle(donnees, 'charge', '  Squat ')).toBe(120)
      expect(valeurActuelle(donnees, 'charge', 'DÉVELOPPÉ COUCHÉ')).toBe(90)
      expect(valeurActuelle(donnees, 'charge', 'Inconnu')).toBeNull()
    })

    it('récupère la dernière mesure ou test', () => {
      expect(valeurActuelle(donnees, 'mesure', 'poids')).toBe(78.5)
      expect(valeurActuelle(donnees, 'test', 'test_pompes')).toBe(35)
      expect(valeurActuelle(donnees, 'mesure', 'tour_hanches')).toBeNull()
    })
  })

  describe('etatObjectif', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-05-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('Objectif croissant (ex. charge ou reps)', () => {
      const obj: Objectif = {
        id: '1',
        source: 'charge',
        reference: 'Squat',
        valeur_depart: 100,
        valeur_cible: 120,
        echeance: '2025-05-25',
      }

      it('calcule la progression proportionnelle et les jours restants', () => {
        const etat = etatObjectif(obj, 110)
        expect(etat.pct).toBe(50)
        expect(etat.atteint).toBe(false)
        expect(etat.reste).toBe(10) // 25 - 15 = 10 jours restants
      })

      it('détecte quand l’objectif est atteint ou dépassé', () => {
        const etat120 = etatObjectif(obj, 120)
        expect(etat120.pct).toBe(100)
        expect(etat120.atteint).toBe(true)

        const etat130 = etatObjectif(obj, 130)
        expect(etat130.pct).toBe(100)
        expect(etat130.atteint).toBe(true)
      })

      it('borne à 0% si la valeur actuelle est inférieure au départ', () => {
        const etat = etatObjectif(obj, 90)
        expect(etat.pct).toBe(0)
        expect(etat.atteint).toBe(false)
      })

      it('gère une valeur actuelle nulle', () => {
        const etat = etatObjectif(obj, null)
        expect(etat.pct).toBe(0)
        expect(etat.atteint).toBe(false)
      })
    })

    describe('Objectif décroissant (ex. perte de poids ou réduction du temps)', () => {
      const obj: Objectif = {
        id: '2',
        source: 'mesure',
        reference: 'poids',
        valeur_depart: 90,
        valeur_cible: 80,
        echeance: null,
      }

      it('progresse au fur et à mesure que la valeur diminue', () => {
        const etat = etatObjectif(obj, 85)
        expect(etat.pct).toBe(50)
        expect(etat.atteint).toBe(false)
        expect(etat.reste).toBeNull()
      })

      it('atteint l’objectif si la valeur est <= à la cible', () => {
        const etat80 = etatObjectif(obj, 80)
        expect(etat80.pct).toBe(100)
        expect(etat80.atteint).toBe(true)

        const etat78 = etatObjectif(obj, 78)
        expect(etat78.pct).toBe(100)
        expect(etat78.atteint).toBe(true)
      })

      it('borne à 0% si le poids augmente au-delà du départ', () => {
        const etat = etatObjectif(obj, 95)
        expect(etat.pct).toBe(0)
        expect(etat.atteint).toBe(false)
      })
    })
  })

  describe('chargerObjectifs (avec Supabase mocké)', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('agrège correctement les objectifs, la dernière mesure et la meilleure charge', async () => {
      const mockObjectifsOrder = vi.fn().mockResolvedValue({
        data: [{ id: 'o1', source: 'charge', reference: 'Squat', valeur_depart: 80, valeur_cible: 100 }],
        error: null,
      })
      const mockObjectifsEq = vi.fn().mockReturnValue({ order: mockObjectifsOrder })
      const mockObjectifsSelect = vi.fn().mockReturnValue({ eq: mockObjectifsEq })

      const mockMesuresOrder2 = vi.fn().mockResolvedValue({
        data: [
          { type: 'poids', valeur: 82.5 },
          { type: 'poids', valeur: 81.0 }, // La dernière doit écraser
          { type: 'tour_taille', valeur: 84 },
        ],
        error: null,
      })
      const mockMesuresOrder1 = vi.fn().mockReturnValue({ order: mockMesuresOrder2 })
      const mockMesuresEq = vi.fn().mockReturnValue({ order: mockMesuresOrder1 })
      const mockMesuresSelect = vi.fn().mockReturnValue({ eq: mockMesuresEq })

      const mockSeancesEq = vi.fn().mockResolvedValue({
        data: [
          {
            exercices: [
              { nom: 'Squat', charge_kg: 85 },
              { nom: 'squat', charge_kg: 95 }, // Max squat = 95
              { nom: 'Traction', charge_kg: null },
            ],
          },
        ],
        error: null,
      })
      const mockSeancesSelect = vi.fn().mockReturnValue({ eq: mockSeancesEq })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'objectifs') return { select: mockObjectifsSelect } as any
        if (table === 'mesures') return { select: mockMesuresSelect } as any
        if (table === 'seances') return { select: mockSeancesSelect } as any
        return {} as any
      })

      const res = await chargerObjectifs('client-123')
      expect(res.erreur).toBeUndefined()
      expect(res.donnees).toBeDefined()
      expect(res.donnees?.objectifs).toHaveLength(1)
      expect(res.donnees?.derniereMesure).toEqual({
        poids: 81.0,
        tour_taille: 84,
      })
      expect(res.donnees?.meilleureCharge).toEqual({
        squat: 95,
      })
      expect(res.donnees?.nomsExercices).toEqual(['Squat', 'squat'])
    })

    it('renvoie une erreur si l’une des tables échoue', async () => {
      const err = new Error('Mesures query failed')
      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'mesures') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: null, error: err }),
                }),
              }),
            }),
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        } as any
      })

      const res = await chargerObjectifs('client-123')
      expect(res.erreur).toBe(err)
    })
  })
})

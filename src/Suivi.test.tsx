import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import Suivi, { estExerciceCardio, minutesCardioExo, e1rm, marquerRecords, arrondi } from './Suivi'
import { ClientCtx } from './ui'
import type { Client } from './Clients'

// Mock supabase
const mockFrom = vi.fn()
vi.mock('./supabase', () => {
  return {
    supabase: {
      from: (...args: any[]) => mockFrom(...args),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    },
  }
})

const clientMock: Client = {
  id: 'client-test-456',
  prenom: 'Camille',
  nom: 'Martin',
  objectifs: null,
  points_attention: null,
  zones_sensibles: [],
  silhouette: null,
  actif: true,
  groupe_facturation: null,
}

function renduSuivi(client = clientMock) {
  return render(
    <ClientCtx.Provider value={{ client, recharger: vi.fn().mockResolvedValue(undefined) }}>
      <Suivi />
    </ClientCtx.Provider>,
  )
}

describe('[P1-03] Détection cardio et exclusion des exercices de gainage / isométrie / mobilité', () => {
  describe('estExerciceCardio', () => {
    it('exclut le gainage et l’isométrie du catalogue même saisis au temps', () => {
      expect(estExerciceCardio({ nom: 'Planche classique (Gainage ventral)' })).toBe(false)
      expect(estExerciceCardio({ nom: 'Gainage inversé' })).toBe(false)
      expect(estExerciceCardio({ nom: 'Gainage oblique (Planche latérale)' })).toBe(false)
      expect(estExerciceCardio({ nom: 'Chaise dos au mur' })).toBe(false)
      expect(estExerciceCardio({ nom: 'Hollow body hold (Gainage cuillère)' })).toBe(false)
      expect(estExerciceCardio({ nom: 'Planche sur Swiss ball' })).toBe(false)
    })

    it('exclut la mobilité et les étirements au temps', () => {
      expect(estExerciceCardio({ nom: 'World’s Greatest Stretch' })).toBe(false)
      expect(estExerciceCardio({ nom: 'Cat-Cow (Chat-Vache)' })).toBe(false)
      expect(estExerciceCardio({ nom: 'Étirement du psoas en fente basse' })).toBe(false)
      expect(estExerciceCardio({ nom: 'Ouverture thoracique au sol (Open Book)' })).toBe(false)
    })

    it('identifie les exercices cardio du catalogue', () => {
      expect(estExerciceCardio({ nom: 'Course à pieds' })).toBe(true)
      expect(estExerciceCardio({ nom: 'Burpees' })).toBe(true)
      expect(estExerciceCardio({ nom: 'Jumping jacks' })).toBe(true)
      expect(estExerciceCardio({ nom: 'Corde à sauter' })).toBe(true)
      expect(estExerciceCardio({ nom: 'Montées de genoux' })).toBe(true)
      expect(estExerciceCardio({ nom: 'Skater jumps (Sauts du patineur)' })).toBe(true)
    })

    it('identifie tout exercice ayant une distance strictement positive comme cardio', () => {
      expect(estExerciceCardio({ nom: 'Activité libre', distance_km: 5.2 })).toBe(true)
    })

    it('prend en compte les groupes personnalisés de la bibliothèque en base', () => {
      const biblio = {
        'shadow boxing': 'Cardio',
        'étirement nuque': 'Mobilité',
        'gainage commando': 'Abdominaux',
      }
      expect(estExerciceCardio({ nom: 'Shadow boxing' }, biblio)).toBe(true)
      expect(estExerciceCardio({ nom: 'Étirement nuque' }, biblio)).toBe(false)
      expect(estExerciceCardio({ nom: 'Gainage commando' }, biblio)).toBe(false)
    })

    it('détecte par schéma moteur les exercices cardio non répertoriés', () => {
      expect(estExerciceCardio({ nom: 'Rameur Concept2' })).toBe(true)
      expect(estExerciceCardio({ nom: 'Vélo de biking' })).toBe(true)
      expect(estExerciceCardio({ nom: 'Footing en forêt' })).toBe(true)
      expect(estExerciceCardio({ nom: 'HIIT Tabata' })).toBe(true)
    })
  })

  describe('minutesCardioExo', () => {
    it('renvoie 0 minute pour les exercices au temps non-cardio', () => {
      // 3 séries de 60s de planche = 0 min cardio
      expect(minutesCardioExo({ nom: 'Planche classique (Gainage ventral)', series: 3, duree_sec: 60, duree_min: null })).toBe(0)
      // 4 séries de 45s de chaise = 0 min cardio
      expect(minutesCardioExo({ nom: 'Chaise dos au mur', series: 4, duree_sec: 45, duree_min: null })).toBe(0)
      // 3 séries de 30s de hollow body = 0 min cardio
      expect(minutesCardioExo({ nom: 'Hollow body hold (Gainage cuillère)', series: 3, duree_sec: 30, duree_min: null })).toBe(0)
    })

    it('calcule correctement les minutes pour les vrais exercices cardio', () => {
      // 4 séries de 30s de burpees = 2 min cardio
      expect(minutesCardioExo({ nom: 'Burpees', series: 4, duree_sec: 30, duree_min: null })).toBe(2)
      // 1 série de 25 min de course = 25 min cardio
      expect(minutesCardioExo({ nom: 'Course à pieds', series: 1, duree_min: 25, duree_sec: null })).toBe(25)
      // 10 min de rameur = 10 min cardio
      expect(minutesCardioExo({ nom: 'Rameur', series: 1, duree_min: 10, duree_sec: null })).toBe(10)
    })
  })

  describe('Composant Suivi - Volume cardio et affichage', () => {
    function chain(data: any = []) {
      const obj: any = {}
      obj.select = vi.fn().mockReturnValue(obj)
      obj.eq = vi.fn().mockReturnValue(obj)
      obj.order = vi.fn().mockReturnValue(obj)
      obj.then = (fn: (res: any) => void) => Promise.resolve(fn({ data, error: null }))
      return obj
    }

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('n’affiche pas de bloc Cardio si la séance ne contient que du gainage / chaise au temps', async () => {
      const aujourdhuiStr = new Date().toLocaleDateString('sv-SE')

      mockFrom.mockImplementation((table: string) => {
        if (table === 'seances') {
          return chain([
            {
              date_seance: aujourdhuiStr,
              exercices: [
                { nom: 'Planche classique (Gainage ventral)', series: 3, duree_sec: 60, duree_min: null, charge_kg: null, repetitions: null, distance_km: null },
                { nom: 'Gainage inversé', series: 3, duree_sec: 45, duree_min: null, charge_kg: null, repetitions: null, distance_km: null },
                { nom: 'Chaise dos au mur', series: 4, duree_sec: 45, duree_min: null, charge_kg: null, repetitions: null, distance_km: null },
                { nom: 'Hollow body hold (Gainage cuillère)', series: 3, duree_sec: 30, duree_min: null, charge_kg: null, repetitions: null, distance_km: null },
              ],
            },
          ])
        }
        return chain([])
      })

      await act(async () => {
        renduSuivi()
      })

      // Le titre Cardio ne doit pas être affiché car aucun exercice cardio réel n'a été fait
      expect(screen.queryByRole('heading', { level: 3, name: 'Cardio' })).toBeNull()
      expect(screen.queryByText(/Sur 30 jours/i)).toBeNull()
    })

    it('ne comptabilise que les minutes de course/cardio quand une séance mélange cardio et gainage', async () => {
      const aujourdhuiStr = new Date().toLocaleDateString('sv-SE')

      mockFrom.mockImplementation((table: string) => {
        if (table === 'seances') {
          return chain([
            {
              date_seance: aujourdhuiStr,
              exercices: [
                // 30 minutes de course (cardio réel)
                { nom: 'Course à pieds', series: 1, duree_min: 30, duree_sec: null, charge_kg: null, repetitions: null, distance_km: 5 },
                // 5 minutes de gainage au total (ne doit pas être compté dans le cardio)
                { nom: 'Planche classique (Gainage ventral)', series: 5, duree_sec: 60, duree_min: null, charge_kg: null, repetitions: null, distance_km: null },
              ],
            },
          ])
        }
        return chain([])
      })

      await act(async () => {
        renduSuivi()
      })

      // Le bloc Cardio apparaît bien
      expect(screen.getByRole('heading', { level: 3, name: 'Cardio' })).toBeInTheDocument()

      // Sur 30 jours, on doit trouver EXACTEMENT 30 min (et non 35 min avec le gainage)
      expect(screen.getByText(/Sur 30 jours : 30 min · 5 km/i)).toBeInTheDocument()
    })
  })

  describe('Fonction pure e1rm (estimation 1RM par formule d’Epley)', () => {
    it('renvoie la charge exacte pour 1 répétition sans appliquer la formule', () => {
      expect(e1rm({ charge_kg: 100, repetitions: 1 })).toBe(100)
      expect(e1rm({ charge_kg: 52.5, repetitions: 1 })).toBe(52.5)
    })

    it('calcule l’e1rm avec la formule charge * (1 + reps / 30) entre 2 et 12 répétitions', () => {
      // 10 reps @ 100 kg -> 100 * (1 + 10/30) = 133.3333...
      const res10 = e1rm({ charge_kg: 100, repetitions: 10 })
      expect(res10).not.toBeNull()
      expect(arrondi(res10!)).toBe(133.3)

      // 5 reps @ 80 kg -> 80 * (1 + 5/30) = 93.3333...
      const res5 = e1rm({ charge_kg: 80, repetitions: 5 })
      expect(res5).not.toBeNull()
      expect(arrondi(res5!)).toBe(93.3)

      // 12 reps @ 60 kg -> 60 * (1 + 12/30) = 60 * 1.4 = 84
      const res12 = e1rm({ charge_kg: 60, repetitions: 12 })
      expect(res12).toBe(84)
    })

    it('renvoie null si les répétitions dépassent le plafond MAX_REPS_1RM (12)', () => {
      expect(e1rm({ charge_kg: 50, repetitions: 13 })).toBeNull()
      expect(e1rm({ charge_kg: 80, repetitions: 20 })).toBeNull()
    })

    it('renvoie null si les répétitions sont null ou inférieures à 1', () => {
      expect(e1rm({ charge_kg: 100, repetitions: null })).toBeNull()
      expect(e1rm({ charge_kg: 100, repetitions: 0 })).toBeNull()
      expect(e1rm({ charge_kg: 100, repetitions: -5 })).toBeNull()
    })

    it('renvoie null si la charge est nulle, négative ou inférieure ou égale à 0', () => {
      expect(e1rm({ charge_kg: null, repetitions: 8 })).toBeNull()
      expect(e1rm({ charge_kg: 0, repetitions: 8 })).toBeNull()
      expect(e1rm({ charge_kg: -10, repetitions: 8 })).toBeNull()
    })
  })

  describe('Fonction pure marquerRecords', () => {
    it('renvoie une liste vide si aucun point n’est fourni', () => {
      expect(marquerRecords([])).toEqual([])
    })

    it('ne marque pas le premier point comme un record', () => {
      const pts = [{ date: '2026-10-01', valeur: 80 }]
      const res = marquerRecords(pts)
      expect(res).toEqual([{ date: '2026-10-01', valeur: 80, record: false }])
    })

    it('marque record: true uniquement pour les points strictement supérieurs au maximum précédent', () => {
      const pts = [
        { date: '2026-10-01', valeur: 80 },
        { date: '2026-10-05', valeur: 85 }, // record !
        { date: '2026-10-10', valeur: 82 }, // pas record
        { date: '2026-10-15', valeur: 85 }, // égalité avec max précédent -> pas record
        { date: '2026-10-20', valeur: 90 }, // record !
        { date: '2026-10-25', valeur: 88 }, // pas record
      ]

      const res = marquerRecords(pts)
      expect(res.map(p => p.record)).toEqual([false, true, false, false, true, false])
    })

    it('gère les séries strictement croissantes ou décroissantes', () => {
      const croissante = [
        { date: '2026-10-01', valeur: 50 },
        { date: '2026-10-02', valeur: 60 },
        { date: '2026-10-03', valeur: 70 },
      ]
      expect(marquerRecords(croissante).map(p => p.record)).toEqual([false, true, true])

      const decroissante = [
        { date: '2026-10-01', valeur: 70 },
        { date: '2026-10-02', valeur: 60 },
        { date: '2026-10-03', valeur: 50 },
      ]
      expect(marquerRecords(decroissante).map(p => p.record)).toEqual([false, false, false])
    })
  })
})

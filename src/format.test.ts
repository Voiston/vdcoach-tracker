import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  aujourdhui,
  dateLocale,
  dateFr,
  courte,
  joursDepuis,
  ilYa,
  nb,
  libelleRepos,
  resumeCardio,
  resumeRessentis,
  analyserSupersets,
  etiquettesSuperset,
  NB_COULEURS_SUPERSET,
} from './format'

describe('format.ts', () => {
  describe('aujourdhui', () => {
    it('renvoie une date au format AAAA-MM-JJ', () => {
      const res = aujourdhui()
      expect(res).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('dateLocale', () => {
    it('ajoute T12:00:00 si la chaîne fait 10 caractères', () => {
      const d = dateLocale('2025-06-15')
      expect(d.getHours()).toBe(12)
      expect(d.getFullYear()).toBe(2025)
      expect(d.getMonth()).toBe(5) // Juin (0-indexé)
      expect(d.getDate()).toBe(15)
    })

    it('conserve la chaîne si elle est déjà complète', () => {
      const d = dateLocale('2025-06-15T08:30:00Z')
      expect(d.toISOString()).toBe('2025-06-15T08:30:00.000Z')
    })
  })

  describe('dateFr & courte', () => {
    it('formate une date en français sans année par défaut', () => {
      const res = dateFr('2025-07-14')
      expect(res).toContain('14')
      expect(res.toLowerCase()).toContain('juil')
    })

    it('ajoute l’année si demandée', () => {
      const res = dateFr('2025-07-14', true)
      expect(res).toContain('2025')
      expect(res).toContain('14')
    })

    it('formate en version courte', () => {
      const res = courte('2025-07-14')
      expect(res).toContain('14')
      expect(res).toContain('25')
    })
  })

  describe('joursDepuis & ilYa', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2025-10-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('calcule correctement les jours écoulés', () => {
      expect(joursDepuis('2025-10-15')).toBe(0)
      expect(joursDepuis('2025-10-14')).toBe(1)
      expect(joursDepuis('2025-10-10')).toBe(5)
      expect(joursDepuis('2025-10-16')).toBe(-1)
    })

    it('ilYa : gère les dates passées et aujourd’hui', () => {
      expect(ilYa(0)).toBe("aujourd'hui")
      expect(ilYa(-3)).toBe("aujourd'hui")
      expect(ilYa(1)).toBe('hier')
      expect(ilYa(4)).toBe('il y a 4 jours')
      expect(ilYa(4, true)).toBe('il y a 4 j')
      expect(ilYa('2025-10-15')).toBe("aujourd'hui")
      expect(ilYa('2025-10-14')).toBe('hier')
      expect(ilYa('2025-10-12')).toBe('il y a 3 jours')
      expect(ilYa('2025-10-12', true)).toBe('il y a 3 j')
    })
  })

  describe('nb', () => {
    it('arrondit à un chiffre après la virgule et remplace le point par une virgule', () => {
      expect(nb(10)).toBe('10')
      expect(nb(10.5)).toBe('10,5')
      expect(nb(10.54)).toBe('10,5')
      expect(nb(10.56)).toBe('10,6')
      expect(nb(0)).toBe('0')
      expect(nb(-3.25)).toBe('-3,2') // -3.3 or -3.2 depending on Math.round(-32.5) -> -32
    })
  })

  describe('libelleRepos', () => {
    it('renvoie une chaîne vide pour les valeurs nulles, négatives ou absentes', () => {
      expect(libelleRepos(null)).toBe('')
      expect(libelleRepos(undefined)).toBe('')
      expect(libelleRepos(0)).toBe('')
      expect(libelleRepos(-10)).toBe('')
    })

    it('formate les secondes inférieures à 60', () => {
      expect(libelleRepos(30)).toBe('30 s')
      expect(libelleRepos(45)).toBe('45 s')
    })

    it('formate les minutes pleines', () => {
      expect(libelleRepos(60)).toBe('1 min')
      expect(libelleRepos(120)).toBe('2 min')
    })

    it('formate les minutes et secondes restantes', () => {
      expect(libelleRepos(90)).toBe('1 min 30')
      expect(libelleRepos(75)).toBe('1 min 15')
    })
  })

  describe('resumeCardio', () => {
    it('formate séries et secondes', () => {
      expect(resumeCardio({ series: 3, duree_sec: 45 })).toBe('3×45 s')
      expect(resumeCardio({ duree_sec: 45 })).toBe('45 s')
    })

    it('formate séries et minutes', () => {
      expect(resumeCardio({ series: 2, duree_min: 15 })).toBe('2×15 min')
      expect(resumeCardio({ duree_min: 20 })).toBe('20 min')
    })

    it('formate durée et distance', () => {
      expect(resumeCardio({ duree_min: 30, distance_km: 5 })).toBe('30 min · 5 km')
    })

    it('formate distance seule avec séries éventuelles', () => {
      expect(resumeCardio({ distance_km: 10 })).toBe('10 km')
      expect(resumeCardio({ series: 4, distance_km: 2 })).toBe('4×2 km')
    })

    it('renvoie vide si rien de valide', () => {
      expect(resumeCardio({})).toBe('')
      expect(resumeCardio({ series: 3 })).toBe('')
    })
  })

  describe('resumeRessentis', () => {
    it('renvoie vide si aucun ressenti', () => {
      expect(resumeRessentis({})).toBe('')
    })

    it('utilise ressenti général si aucune difficulté spécifique', () => {
      expect(resumeRessentis({ ressenti: 7 })).toBe('ressenti 7/10')
    })

    it('combine les critères détaillés', () => {
      expect(
        resumeRessentis({
          diff_muscu: 8,
          diff_cardio: 6,
          fatigue: 4,
          sommeil: 9,
        }),
      ).toBe('Muscu 8/10 · Cardio 6/10 · Fatigue 4/10 · Sommeil 9/10')
    })

    it('ignore ressenti général si au moins un détail est présent', () => {
      expect(
        resumeRessentis({
          ressenti: 5,
          diff_muscu: 7,
        }),
      ).toBe('Muscu 7/10')
    })
  })

  describe('analyserSupersets & etiquettesSuperset', () => {
    it('gère une liste vide', () => {
      expect(analyserSupersets([])).toEqual([])
      expect(etiquettesSuperset([])).toEqual([])
    })

    it('gère des exercices seuls sans superset', () => {
      const lignes = [{ lie_suivant: false }, { lie_suivant: null }]
      expect(analyserSupersets(lignes)).toEqual([
        { etiquette: null, groupe: null },
        { etiquette: null, groupe: null },
      ])
      expect(etiquettesSuperset(lignes)).toEqual([null, null])
    })

    it('détecte un superset de deux exercices', () => {
      const lignes = [{ lie_suivant: true }, { lie_suivant: false }]
      expect(analyserSupersets(lignes)).toEqual([
        { etiquette: 'A1', groupe: 0 },
        { etiquette: 'A2', groupe: 0 },
      ])
      expect(etiquettesSuperset(lignes)).toEqual(['A1', 'A2'])
    })

    it('détecte un triset (3 exercices liés)', () => {
      const lignes = [{ lie_suivant: true }, { lie_suivant: true }, { lie_suivant: false }]
      expect(etiquettesSuperset(lignes)).toEqual(['A1', 'A2', 'A3'])
    })

    it('sépare plusieurs groupes de supersets entrecoupés d’exercices seuls', () => {
      const lignes = [
        { lie_suivant: true }, // A1
        { lie_suivant: false }, // A2
        { lie_suivant: false }, // seul
        { lie_suivant: true }, // B1
        { lie_suivant: true }, // B2
        { lie_suivant: false }, // B3
      ]
      expect(etiquettesSuperset(lignes)).toEqual(['A1', 'A2', null, 'B1', 'B2', 'B3'])
      const res = analyserSupersets(lignes)
      expect(res[0].groupe).toBe(0)
      expect(res[1].groupe).toBe(0)
      expect(res[2].groupe).toBe(null)
      expect(res[3].groupe).toBe(1)
      expect(res[4].groupe).toBe(1)
      expect(res[5].groupe).toBe(1)
    })

    it('applique le modulo de couleurs pour plus de 6 supersets', () => {
      // 7 supersets de 2 exercices
      const lignes: { lie_suivant: boolean }[] = []
      for (let i = 0; i < 7; i++) {
        lignes.push({ lie_suivant: true }, { lie_suivant: false })
      }
      const res = analyserSupersets(lignes)
      expect(res[0].groupe).toBe(0) // Groupe 1 -> indice 0
      expect(res[10].groupe).toBe(5) // Groupe 6 -> indice 5
      expect(res[12].groupe).toBe(0) // Groupe 7 -> boucle à 0
      expect(res[12].etiquette).toBe('G1')
      expect(NB_COULEURS_SUPERSET).toBe(6)
    })

    it('ne démarre pas de superset si lie_suivant est sur le dernier exercice', () => {
      const lignes = [{ lie_suivant: false }, { lie_suivant: true }]
      expect(etiquettesSuperset(lignes)).toEqual([null, null])
    })
  })
})

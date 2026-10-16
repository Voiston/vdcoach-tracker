import { describe, it, expect } from 'vitest'
import {
  calculerBilan,
  construireBilan,
  type SeanceCharges,
  type MesureBilan,
} from './bilan-lib'
import type { DonneesObjectifs } from './objectifs-lib'

describe('bilan-lib.ts', () => {
  const mois = '2025-05'

  describe('calculerBilan', () => {
    it('calcule le nombre de séances du mois uniquement', () => {
      const seances: SeanceCharges[] = [
        { date_seance: '2025-04-30', exercices: [] }, // Hors mois (avant)
        { date_seance: '2025-05-02', exercices: [] }, // Dans le mois
        { date_seance: '2025-05-15', exercices: [] }, // Dans le mois
        { date_seance: '2025-06-01', exercices: [] }, // Hors mois (après)
      ]

      const res = calculerBilan({
        prenom: 'Alex',
        mois,
        seances,
        mesures: [],
      })

      expect(res.nbSeances).toBe(2)
      expect(res.prenom).toBe('Alex')
      expect(res.mois).toBe('2025-05')
    })

    describe('Records', () => {
      it('détecte un record si la charge du mois dépasse la meilleure charge passée', () => {
        const seances: SeanceCharges[] = [
          // Historique avant le mois
          {
            date_seance: '2025-04-10',
            exercices: [{ nom: 'Développé couché', charge_kg: 70 }],
          },
          {
            date_seance: '2025-04-20',
            exercices: [{ nom: 'Développé couché', charge_kg: 75 }],
          },
          // Mois en cours : progression à 80 kg
          {
            date_seance: '2025-05-10',
            exercices: [{ nom: '  développé couché ', charge_kg: 80 }],
          },
        ]

        const res = calculerBilan({ prenom: 'Alex', mois, seances, mesures: [] })
        expect(res.records).toEqual([
          {
            exercice: 'développé couché',
            avant: 75,
            charge: 80,
          },
        ])
      })

      it('n’enregistre pas de record pour un nouvel exercice jamais pratiqué auparavant', () => {
        const seances: SeanceCharges[] = [
          {
            date_seance: '2025-05-10',
            exercices: [{ nom: 'Squat', charge_kg: 100 }],
          },
        ]

        const res = calculerBilan({ prenom: 'Alex', mois, seances, mesures: [] })
        expect(res.records).toHaveLength(0)
      })

      it('n’enregistre pas de record si la charge du mois est inférieure ou égale', () => {
        const seances: SeanceCharges[] = [
          {
            date_seance: '2025-04-10',
            exercices: [{ nom: 'Squat', charge_kg: 100 }],
          },
          {
            date_seance: '2025-05-10',
            exercices: [{ nom: 'Squat', charge_kg: 100 }],
          },
          {
            date_seance: '2025-05-15',
            exercices: [{ nom: 'Squat', charge_kg: 95 }],
          },
        ]

        const res = calculerBilan({ prenom: 'Alex', mois, seances, mesures: [] })
        expect(res.records).toHaveLength(0)
      })

      it('ignore les charges nulles ou négatives', () => {
        const seances: SeanceCharges[] = [
          {
            date_seance: '2025-04-10',
            exercices: [{ nom: 'Squat', charge_kg: 50 }],
          },
          {
            date_seance: '2025-05-10',
            exercices: [
              { nom: 'Squat', charge_kg: null },
              { nom: 'Squat', charge_kg: 0 },
            ],
          },
        ]

        const res = calculerBilan({ prenom: 'Alex', mois, seances, mesures: [] })
        expect(res.records).toHaveLength(0)
      })
    })

    describe('Évolutions des mesures & tests', () => {
      it('calcule l’écart entre avant le mois et la fin du mois', () => {
        const mesures: MesureBilan[] = [
          { type: 'poids', valeur: 82.0, date_mesure: '2025-04-15' },
          { type: 'poids', valeur: 81.2, date_mesure: '2025-05-10' },
          { type: 'poids', valeur: 80.5, date_mesure: '2025-05-28' }, // Arrivée
        ]

        const res = calculerBilan({ prenom: 'Alex', mois, seances: [], mesures })
        const evolPoids = res.evolutions.find(e => e.label === 'Poids')!
        expect(evolPoids).toBeDefined()
        expect(evolPoids.depart).toBe(82.0)
        expect(evolPoids.arrivee).toBe(80.5)
        expect(evolPoids.ecart).toBe(-1.5)
        expect(evolPoids.unite).toBe('kg')
      })

      it('utilise la première mesure du mois si aucune mesure préalable n’existe', () => {
        const mesures: MesureBilan[] = [
          { type: 'tour_taille', valeur: 85, date_mesure: '2025-05-02' },
          { type: 'tour_taille', valeur: 83, date_mesure: '2025-05-25' },
        ]

        const res = calculerBilan({ prenom: 'Alex', mois, seances: [], mesures })
        const evol = res.evolutions.find(e => e.label === 'Tour de taille')!
        expect(evol.depart).toBe(85)
        expect(evol.arrivee).toBe(83)
        expect(evol.ecart).toBe(-2)
      })

      it('laisse depart et ecart à null s’il n’y a qu’une seule mesure sans historique', () => {
        const mesures: MesureBilan[] = [
          { type: 'test_pompes', valeur: 30, date_mesure: '2025-05-15' },
        ]

        const res = calculerBilan({ prenom: 'Alex', mois, seances: [], mesures })
        const evol = res.evolutions.find(e => e.label === 'Pompes max')!
        expect(evol.depart).toBeNull()
        expect(evol.arrivee).toBe(30)
        expect(evol.ecart).toBeNull()
      })
    })

    describe('Objectifs en cours', () => {
      it('n’inclut que les objectifs en cours et calcule leur progression', () => {
        const objectifs: DonneesObjectifs = {
          objectifs: [
            // Objectif atteint (doit être ignoré)
            {
              id: 'obj-1',
              source: 'charge',
              reference: 'Développé couché',
              valeur_depart: 60,
              valeur_cible: 80,
              echeance: '2025-06-30',
            },
            // Objectif en cours
            {
              id: 'obj-2',
              source: 'mesure',
              reference: 'poids',
              valeur_depart: 85,
              valeur_cible: 75,
              echeance: '2025-07-31',
            },
          ],
          derniereMesure: { poids: 80 },
          meilleureCharge: { 'développé couché': 85 },
          nomsExercices: ['Développé couché'],
        }

        const res = calculerBilan({
          prenom: 'Alex',
          mois,
          seances: [],
          mesures: [],
          objectifs,
        })

        expect(res.objectifs).toHaveLength(1)
        expect(res.objectifs[0]).toEqual({
          label: 'Poids',
          depart: 85,
          actuelle: 80,
          cible: 75,
          unite: 'kg',
          pct: 50,
        })
      })
    })
  })

  describe('construireBilan (formatage texte)', () => {
    it('génère le texte complet avec séances, records, mesures et objectifs', () => {
      const seances: SeanceCharges[] = [
        { date_seance: '2025-04-10', exercices: [{ nom: 'Squat', charge_kg: 80 }] },
        { date_seance: '2025-05-10', exercices: [{ nom: 'Squat', charge_kg: 90 }] },
      ]

      const mesures: MesureBilan[] = [
        { type: 'poids', valeur: 82, date_mesure: '2025-04-20' },
        { type: 'poids', valeur: 80.5, date_mesure: '2025-05-25' },
        { type: 'tour_taille', valeur: 84, date_mesure: '2025-04-20' },
        { type: 'tour_taille', valeur: 84, date_mesure: '2025-05-25' },
        { type: 'test_pompes', valeur: 25, date_mesure: '2025-05-15' },
      ]

      const objectifs: DonneesObjectifs = {
        objectifs: [
          {
            id: 'obj-1',
            source: 'charge',
            reference: 'Traction',
            valeur_depart: 0,
            valeur_cible: 10,
            echeance: null,
          },
        ],
        derniereMesure: {},
        meilleureCharge: { traction: 4 },
        nomsExercices: ['Traction'],
      }

      const texte = construireBilan({
        prenom: 'Alex',
        mois,
        seances,
        mesures,
        objectifs,
      })

      // En-tête
      expect(texte).toContain('Bilan de Alex — mai 2025')
      expect(texte).toContain('Séances : 1')

      // Records
      expect(texte).toContain('🏆 Records :')
      expect(texte).toContain('• Squat 90 kg (avant :80 kg)')

      // Mesures
      expect(texte).toContain('Mesures :')
      expect(texte).toContain('• Poids : 82 →80,5 kg (−1,5kg)')
      expect(texte).toContain('• Tour de taille : 84 →84 cm (stable)')
      expect(texte).toContain('• Pompes max : 25reps')

      // Objectifs
      expect(texte).toContain('🎯 Objectifs en cours :')
      expect(texte).toContain('• Traction :0 → 4 → 10 kg (40 %)')
    })

    it('gère un bilan minimal sans records ni mesures ni objectifs', () => {
      const texte = construireBilan({
        prenom: 'Alex',
        mois,
        seances: [{ date_seance: '2025-05-12', exercices: [] }],
        mesures: [],
      })

      expect(texte).toBe('Bilan de Alex — mai 2025\nSéances : 1')
      expect(texte).not.toContain('Records')
      expect(texte).not.toContain('Mesures')
      expect(texte).not.toContain('Objectifs')
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ecrireBrouillon,
  lireBrouillon,
  effacerBrouillon,
  effacerTousBrouillons,
  type Brouillon,
} from './brouillon'

describe('brouillon.ts - Cycle de vie des brouillons', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('écrit et relit un brouillon avec l’horodatage ISO automatique', () => {
    const maintenant = new Date('2026-10-16T12:00:00.000Z')
    vi.setSystemTime(maintenant)

    const donnees: Omit<Brouillon, 'enregistreLe'> = {
      clientId: 'client-alice',
      date: '2026-10-16',
      duree: '60',
      diff_muscu: '7',
      diff_cardio: '5',
      fatigue: '3',
      sommeil: '8',
      notes: 'Séance haut du corps intense',
      invites: ['client-bob'],
      copierCharges: true,
      ressentisInvites: {
        'client-bob': {
          diff_muscu: '8',
          diff_cardio: '6',
          fatigue: '4',
          sommeil: '7',
        },
      },
      lignes: [
        {
          nom: 'Développé couché',
          series: '4',
          repetitions: '8',
          charge_kg: '80',
          repos_sec: '90',
          lie_suivant: false,
          valide: true,
        },
      ],
    }

    ecrireBrouillon(donnees)

    const relu = lireBrouillon('client-alice')
    expect(relu).not.toBeNull()
    expect(relu?.clientId).toBe('client-alice')
    expect(relu?.notes).toBe('Séance haut du corps intense')
    expect(relu?.lignes.length).toBe(1)
    expect(relu?.lignes[0].nom).toBe('Développé couché')
    expect(relu?.enregistreLe).toBe(maintenant.toISOString())
  })

  describe('Expiration à 7 jours', () => {
    it('maintient le brouillon valide à 6 jours et à 7 jours pile', () => {
      const debut = new Date('2026-10-01T10:00:00.000Z')
      vi.setSystemTime(debut)

      ecrireBrouillon({
        clientId: 'client-expiration',
        date: '2026-10-01',
        duree: '45',
        notes: 'Test expiration',
        lignes: [],
      })

      // À 6 jours (6 * 24h = 144h) : brouillon toujours valide
      vi.setSystemTime(new Date(debut.getTime() + 6 * 24 * 3600 * 1000))
      expect(lireBrouillon('client-expiration')).not.toBeNull()

      // À 7 jours pile (7 * 24h = 168h) : toujours valide (condition Date.now() - enregistreLe > DUREE_MAX_MS)
      vi.setSystemTime(new Date(debut.getTime() + 7 * 24 * 3600 * 1000))
      expect(lireBrouillon('client-expiration')).not.toBeNull()
    })

    it('expire et supprime automatiquement du localStorage un brouillon de plus de 7 jours', () => {
      const debut = new Date('2026-10-01T10:00:00.000Z')
      vi.setSystemTime(debut)

      ecrireBrouillon({
        clientId: 'client-expire',
        date: '2026-10-01',
        duree: '45',
        notes: 'Brouillon ancien',
        lignes: [{ nom: 'Squat', series: '3', repetitions: '10', charge_kg: '60' }],
      })

      expect(localStorage.getItem('vdcoach_brouillon_seance:client-expire')).not.toBeNull()

      // Avancer le temps à 7 jours + 1 seconde
      vi.setSystemTime(new Date(debut.getTime() + 7 * 24 * 3600 * 1000 + 1000))

      // lireBrouillon doit renvoyer null et purger le localStorage
      const resultat = lireBrouillon('client-expire')
      expect(resultat).toBeNull()

      // Vérifier que la clé a été effectivement effacée
      expect(localStorage.getItem('vdcoach_brouillon_seance:client-expire')).toBeNull()
    })
  })

  describe('Isolation par client', () => {
    it('isole strictement les brouillons entre deux clients différents', () => {
      ecrireBrouillon({
        clientId: 'client-1',
        date: '2026-10-10',
        duree: '60',
        notes: 'Séance pour Client 1',
        lignes: [{ nom: 'Fentes', series: '3', repetitions: '12', charge_kg: '20' }],
      })

      ecrireBrouillon({
        clientId: 'client-2',
        date: '2026-10-11',
        duree: '50',
        notes: 'Séance pour Client 2',
        lignes: [{ nom: 'Pompes', series: '4', repetitions: '15', charge_kg: '0' }],
      })

      const b1 = lireBrouillon('client-1')
      const b2 = lireBrouillon('client-2')

      expect(b1?.notes).toBe('Séance pour Client 1')
      expect(b1?.lignes[0].nom).toBe('Fentes')

      expect(b2?.notes).toBe('Séance pour Client 2')
      expect(b2?.lignes[0].nom).toBe('Pompes')

      // Effacer client-1 ne touche pas client-2
      effacerBrouillon('client-1')
      expect(lireBrouillon('client-1')).toBeNull()
      expect(lireBrouillon('client-2')).not.toBeNull()
      expect(lireBrouillon('client-2')?.notes).toBe('Séance pour Client 2')
    })
  })

  describe('Écrasement d’un brouillon existant', () => {
    it('écrase les données d’un brouillon existant et met à jour l’horodatage', () => {
      const t1 = new Date('2026-10-10T09:00:00.000Z')
      vi.setSystemTime(t1)

      ecrireBrouillon({
        clientId: 'client-ecraser',
        date: '2026-10-10',
        duree: '30',
        notes: 'Version initiale',
        lignes: [{ nom: 'Course', series: '1', repetitions: '1', charge_kg: '' }],
      })

      expect(lireBrouillon('client-ecraser')?.notes).toBe('Version initiale')

      // Mise à jour 2 heures plus tard
      const t2 = new Date('2026-10-10T11:00:00.000Z')
      vi.setSystemTime(t2)

      ecrireBrouillon({
        clientId: 'client-ecraser',
        date: '2026-10-10',
        duree: '60',
        notes: 'Version finale modifiée',
        lignes: [
          { nom: 'Course', series: '1', repetitions: '1', charge_kg: '' },
          { nom: 'Gainage', series: '3', repetitions: '1', charge_kg: '' },
        ],
      })

      const relu = lireBrouillon('client-ecraser')
      expect(relu?.notes).toBe('Version finale modifiée')
      expect(relu?.duree).toBe('60')
      expect(relu?.lignes.length).toBe(2)
      expect(relu?.enregistreLe).toBe(t2.toISOString())
    })
  })

  describe('effacerTousBrouillons', () => {
    it('supprime tous les brouillons clients et la clé legacy sans affecter les autres entrées localStorage', () => {
      ecrireBrouillon({
        clientId: 'c1',
        date: '2026-10-15',
        duree: '45',
        notes: 'C1',
        lignes: [],
      })
      ecrireBrouillon({
        clientId: 'c2',
        date: '2026-10-15',
        duree: '45',
        notes: 'C2',
        lignes: [],
      })
      ecrireBrouillon({
        clientId: 'c3',
        date: '2026-10-15',
        duree: '45',
        notes: 'C3',
        lignes: [],
      })

      // Clé legacy
      localStorage.setItem('vdcoach_brouillon_seance', JSON.stringify({ old: true }))
      // Clé non liée
      localStorage.setItem('vdcoach_theme_preference', 'sombre')

      effacerTousBrouillons()

      expect(lireBrouillon('c1')).toBeNull()
      expect(lireBrouillon('c2')).toBeNull()
      expect(lireBrouillon('c3')).toBeNull()
      expect(localStorage.getItem('vdcoach_brouillon_seance')).toBeNull()

      // L'entrée non liée est préservée
      expect(localStorage.getItem('vdcoach_theme_preference')).toBe('sombre')
    })
  })

  describe('Résilience aux erreurs', () => {
    it('renvoie null sans planter si le JSON du localStorage est invalide', () => {
      localStorage.setItem('vdcoach_brouillon_seance:client-corrompu', '{ceci n est pas du json')
      expect(lireBrouillon('client-corrompu')).toBeNull()
    })
  })
})

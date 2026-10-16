import { describe, it, expect } from 'vitest'
import { verifier, REGLES } from './validation'

describe('validation.ts', () => {
  describe('verifier', () => {
    it('accepte une chaîne vide ou composée d’espaces', () => {
      expect(verifier('')).toBe('')
      expect(verifier('   ')).toBe('')
      expect(verifier('', { min: 1, max: 10, entier: true })).toBe('')
    })

    it('rejette les valeurs non numériques', () => {
      expect(verifier('abc')).toBe('Saisis un nombre.')
      expect(verifier('12a')).toBe('Saisis un nombre.')
      expect(verifier('..')).toBe('Saisis un nombre.')
    })

    it('gère correctement les virgules et points décimaux', () => {
      expect(verifier('12.5')).toBe('')
      expect(verifier('12,5')).toBe('')
    })

    it('vérifie la contrainte d’entier', () => {
      expect(verifier('12', { entier: true })).toBe('')
      expect(verifier('12.5', { entier: true })).toBe('Nombre entier attendu.')
      expect(verifier('12,5', { entier: true })).toBe('Nombre entier attendu.')
    })

    it('vérifie la borne minimale', () => {
      expect(verifier('5', { min: 5 })).toBe('')
      expect(verifier('6', { min: 5 })).toBe('')
      expect(verifier('4.9', { min: 5 })).toBe('Minimum : 5')
      expect(verifier('-1', { min: 0 })).toBe('Minimum : 0')
    })

    it('vérifie la borne maximale', () => {
      expect(verifier('10', { max: 10 })).toBe('')
      expect(verifier('9.9', { max: 10 })).toBe('')
      expect(verifier('10.1', { max: 10 })).toBe('Maximum : 10')
      expect(verifier('100', { max: 10 })).toBe('Maximum : 10')
    })

    it('combine les contraintes min, max et entier', () => {
      const regle = { min: 1, max: 10, entier: true }
      expect(verifier('5', regle)).toBe('')
      expect(verifier('1', regle)).toBe('')
      expect(verifier('10', regle)).toBe('')
      expect(verifier('0', regle)).toBe('Minimum : 1')
      expect(verifier('11', regle)).toBe('Maximum : 10')
      expect(verifier('5.5', regle)).toBe('Nombre entier attendu.')
    })
  })

  describe('REGLES prédéfinies', () => {
    it('valide la durée en minutes (1 à 600 entier)', () => {
      expect(verifier('0', REGLES.duree)).toBe('Minimum : 1')
      expect(verifier('60', REGLES.duree)).toBe('')
      expect(verifier('601', REGLES.duree)).toBe('Maximum : 600')
      expect(verifier('45.5', REGLES.duree)).toBe('Nombre entier attendu.')
    })

    it('valide la durée en secondes (1 à 36000 entier)', () => {
      expect(verifier('30', REGLES.duree_sec)).toBe('')
      expect(verifier('0', REGLES.duree_sec)).toBe('Minimum : 1')
      expect(verifier('36001', REGLES.duree_sec)).toBe('Maximum : 36000')
    })

    it('valide le ressenti (1 à 10 entier)', () => {
      expect(verifier('1', REGLES.ressenti)).toBe('')
      expect(verifier('10', REGLES.ressenti)).toBe('')
      expect(verifier('0', REGLES.ressenti)).toBe('Minimum : 1')
      expect(verifier('11', REGLES.ressenti)).toBe('Maximum : 10')
      expect(verifier('7.5', REGLES.ressenti)).toBe('Nombre entier attendu.')
    })

    it('valide les séries et répétitions', () => {
      expect(verifier('4', REGLES.series)).toBe('')
      expect(verifier('31', REGLES.series)).toBe('Maximum : 30')
      expect(verifier('12', REGLES.repetitions)).toBe('')
      expect(verifier('301', REGLES.repetitions)).toBe('Maximum : 300')
    })

    it('valide la charge et la distance (nombres décimaux acceptés de 0 à 1000)', () => {
      expect(verifier('82.5', REGLES.charge)).toBe('')
      expect(verifier('82,5', REGLES.charge)).toBe('')
      expect(verifier('-1', REGLES.charge)).toBe('Minimum : 0')
      expect(verifier('1001', REGLES.charge)).toBe('Maximum : 1000')

      expect(verifier('5.25', REGLES.distance)).toBe('')
      expect(verifier('-0.1', REGLES.distance)).toBe('Minimum : 0')
      expect(verifier('1000.5', REGLES.distance)).toBe('Maximum : 1000')
    })

    it('valide la mesure corporelle (0 à 500)', () => {
      expect(verifier('75.4', REGLES.mesure)).toBe('')
      expect(verifier('501', REGLES.mesure)).toBe('Maximum : 500')
      expect(verifier('-2', REGLES.mesure)).toBe('Minimum : 0')
    })
  })
})

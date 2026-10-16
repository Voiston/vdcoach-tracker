import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import {
  supprimerAvecAnnulation,
  viderSuppressionsEnAttente,
  getSuppressionsEnAttente,
  estEnAttenteSuppression,
  onSuppressionTerminee,
  ClientCtx,
} from './ui'
import Apercu from './Apercu'
import type { Client } from './Clients'

import { seDeconnecter } from './deconnexion'
import { ecrireBrouillon, lireBrouillon } from './brouillon'

// Mock Supabase
const mockFrom = vi.fn()
const mockSignOut = vi.fn().mockResolvedValue({ error: null })
vi.mock('./supabase', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    auth: {
      signOut: () => mockSignOut(),
    },
  },
}))

vi.mock('./muscles-lib', () => ({
  calculerMuscles: () => ({ parMuscle: {}, seriesTotal: 0 }),
  chargerBibliothequeMuscles: () => Promise.resolve({ biblio: {} }),
  evolutionPct: () => null,
  libelleEvolution: () => null,
  variationMuscle: () => null,
}))

const clientMock: Client = {
  id: 'c1',
  prenom: 'Jean',
  nom: 'Dupont',
  objectifs: null,
  points_attention: null,
  zones_sensibles: [],
  silhouette: null,
  actif: true,
  groupe_facturation: null,
}

describe('[REG-01] Registre des suppressions en attente (ui.tsx)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('maintient id dans suppressionsEnAttente pendant toute la durée du DELETE réseau', async () => {
    let resolveDelete!: () => void
    const effacerPromise = new Promise(resolve => {
      resolveDelete = () => resolve(null)
    })
    const effacer = vi.fn().mockReturnValue(effacerPromise)
    const masquer = vi.fn()
    const restaurer = vi.fn()
    const notifier = vi.fn()

    supprimerAvecAnnulation({
      id: 'seance-1',
      delai: 5000,
      notifier,
      message: 'Séance supprimée',
      masquer,
      restaurer,
      effacer,
    })

    // Au départ, l'ID est dans les suppressions en attente
    expect(estEnAttenteSuppression('seance-1')).toBe(true)
    expect(getSuppressionsEnAttente().has('seance-1')).toBe(true)

    // On avance le temps jusqu'à l'expiration du minuteur (5s)
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // effacer() a été appelé
    expect(effacer).toHaveBeenCalledTimes(1)

    // IMPORTANT : pendant que effacer() est en cours (DELETE réseau), l'ID DOIT RESTER dans suppressionsEnAttente !
    expect(estEnAttenteSuppression('seance-1')).toBe(true)
    expect(getSuppressionsEnAttente().has('seance-1')).toBe(true)

    // Maintenant, le DELETE réseau se termine
    await act(async () => {
      resolveDelete()
    })

    // L'ID est maintenant retiré
    expect(estEnAttenteSuppression('seance-1')).toBe(false)
    expect(getSuppressionsEnAttente().has('seance-1')).toBe(false)
  })

  it('viderSuppressionsEnAttente maintient les items dans le registre jusqu’à résolution de effacer()', async () => {
    let resolveDelete!: () => void
    const effacerPromise = new Promise(resolve => {
      resolveDelete = () => resolve(null)
    })
    const effacer = vi.fn().mockReturnValue(effacerPromise)

    supprimerAvecAnnulation({
      id: 'item-vider-1',
      delai: 5000,
      notifier: vi.fn(),
      message: 'Supprimé',
      masquer: vi.fn(),
      restaurer: vi.fn(),
      effacer,
    })

    expect(estEnAttenteSuppression('item-vider-1')).toBe(true)

    // On appelle viderSuppressionsEnAttente()
    const promiseVider = viderSuppressionsEnAttente()

    // L'item doit rester dans le registre pendant que effacer() tourne
    expect(estEnAttenteSuppression('item-vider-1')).toBe(true)

    // On résout le delete réseau
    resolveDelete()
    await promiseVider

    // Après résolution, il est retiré
    expect(estEnAttenteSuppression('item-vider-1')).toBe(false)
  })

  it('en cas d’erreur réseau retournée par effacer(), retire id du registre et restaure', async () => {
    let resolveDelete!: (err: any) => void
    const effacerPromise = new Promise(resolve => {
      resolveDelete = resolve
    })
    const effacer = vi.fn().mockReturnValue(effacerPromise)
    const restaurer = vi.fn()
    const notifier = vi.fn()

    supprimerAvecAnnulation({
      id: 'seance-err',
      delai: 5000,
      notifier,
      message: 'Séance supprimée',
      masquer: vi.fn(),
      restaurer,
      effacer,
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(estEnAttenteSuppression('seance-err')).toBe(true)

    await act(async () => {
      resolveDelete({ message: 'Erreur réseau Supabase' })
    })

    expect(estEnAttenteSuppression('seance-err')).toBe(false)
    expect(restaurer).toHaveBeenCalled()
    expect(notifier).toHaveBeenCalledWith(expect.stringContaining('Suppression impossible'))
  })

  it('appelle masquer() immédiatement et de manière synchrone dès l’appel à supprimerAvecAnnulation', () => {
    const masquer = vi.fn()
    const effacer = vi.fn().mockResolvedValue(null)
    const notifier = vi.fn()

    supprimerAvecAnnulation({
      id: 'item-masquer',
      notifier,
      message: 'Suppression en cours',
      masquer,
      restaurer: vi.fn(),
      effacer,
    })

    // masquer doit avoir été exécuté immédiatement
    expect(masquer).toHaveBeenCalledTimes(1)
    expect(estEnAttenteSuppression('item-masquer')).toBe(true)
  })

  it('permet l’annulation avant 5 s : interrompt le minuteur, restaure l’élément et n’appelle jamais effacer()', () => {
    const masquer = vi.fn()
    const restaurer = vi.fn()
    const effacer = vi.fn().mockResolvedValue(null)
    let optionsNotification: { annuler?: () => void; duree?: number } | undefined

    const notifier = vi.fn((_msg: string, opt?: { annuler?: () => void; duree?: number }) => {
      optionsNotification = opt
    })

    supprimerAvecAnnulation({
      id: 'seance-annulable',
      delai: 5000,
      notifier,
      message: 'Séance supprimée',
      masquer,
      restaurer,
      effacer,
    })

    expect(masquer).toHaveBeenCalledTimes(1)
    expect(estEnAttenteSuppression('seance-annulable')).toBe(true)
    expect(optionsNotification?.annuler).toBeDefined()

    // L'utilisateur clique sur « Annuler » au bout de 2 secondes (< 5 s)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(effacer).not.toHaveBeenCalled()

    act(() => {
      optionsNotification!.annuler!()
    })

    // L'élément est restauré et immédiatement retiré du registre
    expect(restaurer).toHaveBeenCalledTimes(1)
    expect(estEnAttenteSuppression('seance-annulable')).toBe(false)

    // On avance le temps au-delà des 5s initiales (ex: 10s)
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // effacer() NE DOIT JAMAIS avoir été appelé
    expect(effacer).not.toHaveBeenCalled()
  })

  it('restaure l’élément et le retire du registre si effacer() lève une exception (throw)', async () => {
    const effacer = vi.fn().mockRejectedValue(new Error('Crash réseau inattendu'))
    const restaurer = vi.fn()
    const notifier = vi.fn()

    supprimerAvecAnnulation({
      id: 'seance-crash',
      delai: 5000,
      notifier,
      message: 'Séance supprimée',
      masquer: vi.fn(),
      restaurer,
      effacer,
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(estEnAttenteSuppression('seance-crash')).toBe(true)

    await act(async () => {
      await Promise.resolve()
    })

    expect(estEnAttenteSuppression('seance-crash')).toBe(false)
    expect(restaurer).toHaveBeenCalledTimes(1)
    expect(notifier).toHaveBeenCalledWith(expect.stringContaining('Suppression impossible'))
  })

  it('appelle surConfirmation() si la suppression réseau réussit', async () => {
    const surConfirmation = vi.fn()
    const effacer = vi.fn().mockResolvedValue(null)

    supprimerAvecAnnulation({
      id: 'seance-succes',
      delai: 5000,
      notifier: vi.fn(),
      message: 'Séance supprimée',
      masquer: vi.fn(),
      restaurer: vi.fn(),
      effacer,
      surConfirmation,
    })

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
    })

    expect(effacer).toHaveBeenCalledTimes(1)
    expect(surConfirmation).toHaveBeenCalledTimes(1)
    expect(estEnAttenteSuppression('seance-succes')).toBe(false)
  })

  it('vidage à la déconnexion : seDeconnecter() flush immédiatement les suppressions en attente', async () => {
    // 1. Enregistrer un brouillon pour vérifier qu'il est bien purgé
    ecrireBrouillon({
      clientId: 'client-deco',
      date: '2026-10-15',
      duree: '60',
      notes: 'Brouillon test',
      lignes: [],
    })
    expect(lireBrouillon('client-deco')).not.toBeNull()

    // 2. Planifier deux suppressions différées avec un délai de 5000ms
    const effacer1 = vi.fn().mockResolvedValue(null)
    const effacer2 = vi.fn().mockResolvedValue(null)

    supprimerAvecAnnulation({
      id: 'seance-deco-1',
      delai: 5000,
      notifier: vi.fn(),
      message: 'Suppression 1',
      masquer: vi.fn(),
      restaurer: vi.fn(),
      effacer: effacer1,
    })

    supprimerAvecAnnulation({
      id: 'seance-deco-2',
      delai: 5000,
      notifier: vi.fn(),
      message: 'Suppression 2',
      masquer: vi.fn(),
      restaurer: vi.fn(),
      effacer: effacer2,
    })

    expect(estEnAttenteSuppression('seance-deco-1')).toBe(true)
    expect(estEnAttenteSuppression('seance-deco-2')).toBe(true)
    expect(effacer1).not.toHaveBeenCalled()
    expect(effacer2).not.toHaveBeenCalled()

    // 3. L'utilisateur clique sur « Se déconnecter » avant l'expiration des 5 s
    await act(async () => {
      await seDeconnecter()
    })

    // effacer1 et effacer2 doivent avoir été exécutés immédiatement
    expect(effacer1).toHaveBeenCalledTimes(1)
    expect(effacer2).toHaveBeenCalledTimes(1)

    // Le registre est complètement vidé
    expect(estEnAttenteSuppression('seance-deco-1')).toBe(false)
    expect(estEnAttenteSuppression('seance-deco-2')).toBe(false)
    expect(getSuppressionsEnAttente().size).toBe(0)

    // Les brouillons sont effacés
    expect(lireBrouillon('client-deco')).toBeNull()

    // Supabase auth.signOut a été appelé
    expect(mockSignOut).toHaveBeenCalledTimes(1)
  })

  it('déclenche le vidage des suppressions lors de l’événement pagehide du navigateur', async () => {
    const effacer = vi.fn().mockResolvedValue(null)

    supprimerAvecAnnulation({
      id: 'item-pagehide',
      delai: 5000,
      notifier: vi.fn(),
      message: 'Suppression pagehide',
      masquer: vi.fn(),
      restaurer: vi.fn(),
      effacer,
    })

    expect(estEnAttenteSuppression('item-pagehide')).toBe(true)
    expect(effacer).not.toHaveBeenCalled()

    // Déclencher pagehide
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await Promise.resolve()
    })

    expect(effacer).toHaveBeenCalledTimes(1)
    expect(estEnAttenteSuppression('item-pagehide')).toBe(false)
  })
})

describe('[REG-01] Apercu.tsx comportement avec suppressions en attente', () => {
  function chainMock(data: any = []) {
    const obj: any = {}
    obj.select = vi.fn().mockReturnValue(obj)
    obj.eq = vi.fn().mockReturnValue(obj)
    obj.order = vi.fn().mockReturnValue(obj)
    obj.then = (fn: (res: any) => void) => Promise.resolve(fn({ data, error: null }))
    return obj
  }

  beforeEach(() => {
    vi.useFakeTimers()
    mockFrom.mockImplementation((table: string) => {
      if (table === 'seances') {
        return chainMock([
          {
            id: 's1',
            date_seance: '2026-10-15',
            duree_min: 60,
            exercices: [{ nom: 'Squat', ordre: 1, series: 4, charge_kg: 100 }],
          },
          {
            id: 's2',
            date_seance: '2026-10-14',
            duree_min: 45,
            exercices: [{ nom: 'Développé couché', ordre: 1, series: 4, charge_kg: 80 }],
          },
        ])
      }
      return chainMock([])
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('filtre immédiatement en mémoire la séance sans recharger le réseau ni réafficher le squelette', async () => {
    let rendu: any
    await act(async () => {
      rendu = render(
        <ClientCtx.Provider value={{ client: clientMock, recharger: vi.fn().mockResolvedValue(undefined) }}>
          <Apercu onRubrique={vi.fn()} />
        </ClientCtx.Provider>,
      )
    })

    // Les deux séances sont visibles
    expect(screen.getByText('Squat')).toBeDefined()
    expect(screen.getByText('Développé couché')).toBeDefined()

    const initialFetchCount = mockFrom.mock.calls.length

    // On lance une suppression avec annulation pour 's1'
    let resolveDelete!: () => void
    const effacer = vi.fn().mockReturnValue(
      new Promise(resolve => {
        resolveDelete = () => resolve(null)
      }),
    )

    act(() => {
      supprimerAvecAnnulation({
        id: 's1',
        delai: 5000,
        notifier: vi.fn(),
        message: 'Séance supprimée',
        masquer: vi.fn(),
        restaurer: vi.fn(),
        effacer,
      })
    })

    // s1 doit être masquée immédiatement en mémoire dans Apercu
    expect(screen.queryByText('Squat')).toBeNull()
    expect(screen.getByText('Développé couché')).toBeDefined()

    // Aucun nouveau chargement réseau n'a été déclenché par l'ajout à suppressions !
    expect(mockFrom.mock.calls.length).toBe(initialFetchCount)

    // Aucun squelette de chargement n'est affiché
    expect(screen.queryByRole('status', { name: 'Chargement en cours' })).toBeNull()

    // On avance le temps à 5s : effacer() démarre
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // effacer() est en cours, s1 n'a TOUJOURS PAS réapparu et aucun rechargement intempestif
    expect(screen.queryByText('Squat')).toBeNull()
    expect(mockFrom.mock.calls.length).toBe(initialFetchCount)

    // Quand effacer() se termine
    await act(async () => {
      resolveDelete()
    })

    // Maintenant que la suppression est terminée, Apercu recharge en tâche de fond via useSuppressionTerminee
    expect(mockFrom.mock.calls.length).toBeGreaterThan(initialFetchCount)
  })
})

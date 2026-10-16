import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import NouvelleSeance from './NouvelleSeance'
import { ClientCtx } from './ui'
import type { Client } from './Clients'
import { ecrireBrouillon } from './brouillon'

// Mock supabase
vi.mock('./supabase', () => {
  const chain = () => {
    const obj: any = {}
    obj.select = vi.fn().mockReturnValue(obj)
    obj.insert = vi.fn().mockReturnValue(obj)
    obj.update = vi.fn().mockReturnValue(obj)
    obj.delete = vi.fn().mockReturnValue(obj)
    obj.eq = vi.fn().mockReturnValue(obj)
    obj.neq = vi.fn().mockReturnValue(obj)
    obj.gt = vi.fn().mockReturnValue(obj)
    obj.lte = vi.fn().mockReturnValue(obj)
    obj.ilike = vi.fn().mockReturnValue(obj)
    obj.order = vi.fn().mockReturnValue(obj)
    obj.limit = vi.fn().mockReturnValue(obj)
    obj.single = vi.fn().mockResolvedValue({ data: null, error: null })
    obj.then = (fn: (res: { data: any; error: any }) => void) => Promise.resolve(fn({ data: [], error: null }))
    return obj
  }

  return {
    supabase: {
      from: vi.fn().mockImplementation(() => chain()),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    },
  }
})

const clientMock: Client = {
  id: 'client-test-123',
  prenom: 'Alex',
  nom: 'Dupont',
  objectifs: null,
  points_attention: null,
  zones_sensibles: [],
  silhouette: null,
  actif: true,
  groupe_facturation: null,
}

function renduNouvelleSeance(clientId = 'client-test-123') {
  const client = { ...clientMock, id: clientId }
  return render(
    <ClientCtx.Provider value={{ client, recharger: vi.fn().mockResolvedValue(undefined) }}>
      <NouvelleSeance seanceId={null} onSaved={vi.fn()} />
    </ClientCtx.Provider>,
  )
}

describe('NouvelleSeance - Sauvegarde du brouillon et Mode Terrain ([P1-02])', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('scénario audit : basculer en Mode Terrain, ajouter un exercice et vérifier la sauvegarde auto après 700ms', async () => {
    const clientId = 'client-test-123'

    // 1. Créer un brouillon dans localStorage
    ecrireBrouillon({
      clientId,
      date: '2026-10-10',
      duree: '60',
      diff_muscu: '7',
      diff_cardio: '',
      fatigue: '',
      sommeil: '',
      notes: 'Ancien brouillon',
      lignes: [
        {
          nom: 'Squat barre',
          series: '4',
          repetitions: '8',
          charge_kg: '100',
        },
      ],
    })

    const initial = localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)
    expect(initial).toContain('Squat barre')

    // 2. Ouvrir NouvelleSeance
    renduNouvelleSeance(clientId)

    // 3. Cliquer sur « ⚡ Mode Terrain plein écran »
    const btnTerrain = screen.getByText('⚡ Mode Terrain plein écran')
    fireEvent.click(btnTerrain)

    // Le bandeau de brouillon est bien visible en haut du Mode Terrain
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/Séance en cours retrouvée/i)).toBeInTheDocument()

    // 4. Ajouter un exercice sans avoir cliqué sur Reprendre ni Abandonner
    // En Mode Terrain, cliquer sur "+ Ajouter" ouvre le sélecteur
    const btnAjouter = screen.getByRole('button', { name: '+ Ajouter' })
    fireEvent.click(btnAjouter)

    // Dans le sélecteur d'exercice, chercher "Développé couché"
    const inputRecherche = screen.getByLabelText('Rechercher un exercice')
    fireEvent.change(inputRecherche, { target: { value: 'Développé couché' } })

    const btnChoix = screen.getByText(/\+ Utiliser « Développé couché »/i)
    fireEvent.click(btnChoix)

    // Le bandeau est maintenant masqué puisque l'utilisateur a démarré une nouvelle saisie
    expect(screen.queryByText(/Séance en cours retrouvée/i)).not.toBeInTheDocument()

    // 5. Attendre 700 ms (dépassant le debounce de 600ms)
    act(() => {
      vi.advanceTimersByTime(700)
    })

    // 6. Vérifier que localStorage.getItem('vdcoach_brouillon_seance:<clientId>') contient le nouvel exercice
    const sauvegarde = localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)
    expect(sauvegarde).not.toBeNull()
    expect(sauvegarde).toContain('Développé couché')
  })

  it('ne détruit pas le brouillon existant au montage tant qu’aucun contenu n’est saisi', () => {
    const clientId = 'client-test-123'
    ecrireBrouillon({
      clientId,
      date: '2026-10-10',
      duree: '60',
      diff_muscu: '7',
      diff_cardio: '',
      fatigue: '',
      sommeil: '',
      notes: 'Ancien brouillon protégé',
      lignes: [{ nom: 'Soulevé de terre', series: '5', repetitions: '5', charge_kg: '120' }],
    })

    renduNouvelleSeance(clientId)

    // Après 1000ms sans action
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    const contenu = localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)
    expect(contenu).toContain('Ancien brouillon protégé')
    expect(contenu).toContain('Soulevé de terre')
  })

  it('permet de reprendre le brouillon directement depuis le Mode Terrain', () => {
    const clientId = 'client-test-123'
    ecrireBrouillon({
      clientId,
      date: '2026-10-10',
      duree: '60',
      diff_muscu: '7',
      diff_cardio: '',
      fatigue: '',
      sommeil: '',
      notes: 'Notes du brouillon',
      lignes: [{ nom: 'Fentes marchées', series: '3', repetitions: '12', charge_kg: '20' }],
    })

    renduNouvelleSeance(clientId)

    // Basculer en Mode Terrain
    fireEvent.click(screen.getByText('⚡ Mode Terrain plein écran'))

    // Cliquer sur "Reprendre" dans le bandeau
    const btnReprendre = screen.getByRole('button', { name: 'Reprendre' })
    fireEvent.click(btnReprendre)

    // L'exercice repris apparaît dans le Mode Terrain
    expect(screen.getAllByText(/Fentes marchées/i).length).toBeGreaterThanOrEqual(1)
    // Le bandeau est retiré
    expect(screen.queryByText(/Séance en cours retrouvée/i)).not.toBeInTheDocument()
  })

  it('permet d’abandonner le brouillon directement depuis le Mode Terrain', () => {
    const clientId = 'client-test-123'
    ecrireBrouillon({
      clientId,
      date: '2026-10-10',
      duree: '60',
      diff_muscu: '7',
      diff_cardio: '',
      fatigue: '',
      sommeil: '',
      notes: 'Brouillon à supprimer',
      lignes: [{ nom: 'Tractions', series: '3', repetitions: '8', charge_kg: '' }],
    })

    renduNouvelleSeance(clientId)

    // Basculer en Mode Terrain
    fireEvent.click(screen.getByText('⚡ Mode Terrain plein écran'))

    // Cliquer sur "Abandonner"
    const btnAbandonner = screen.getByRole('button', { name: 'Abandonner' })
    fireEvent.click(btnAbandonner)

    // Le brouillon est supprimé du localStorage
    expect(localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)).toBeNull()
    expect(screen.queryByText(/Séance en cours retrouvée/i)).not.toBeInTheDocument()
  })

  it('sauvegarde automatiquement en vue classique dès qu’un nouvel exercice est choisi sans action sur le bandeau', () => {
    const clientId = 'client-test-123'
    ecrireBrouillon({
      clientId,
      date: '2026-10-10',
      duree: '60',
      diff_muscu: '5',
      diff_cardio: '',
      fatigue: '',
      sommeil: '',
      notes: 'Ancien brouillon ignoré',
      lignes: [{ nom: 'Presse à cuisses', series: '4', repetitions: '10', charge_kg: '150' }],
    })

    renduNouvelleSeance(clientId)

    // Ajouter un exercice depuis la vue classique
    const btnAjouter = screen.getByText('+ Ajouter des exercices')
    fireEvent.click(btnAjouter)

    const inputRecherche = screen.getByLabelText('Rechercher un exercice')
    fireEvent.change(inputRecherche, { target: { value: 'Rowing barre' } })

    const btnChoix = screen.getByText(/\+ Utiliser « Rowing barre »/i)
    fireEvent.click(btnChoix)

    // Avancer le minuteur
    act(() => {
      vi.advanceTimersByTime(700)
    })

    const sauvegarde = localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)
    expect(sauvegarde).not.toBeNull()
    expect(sauvegarde).toContain('Rowing barre')
  })

  it('sauvegarde automatiquement lorsque des notes sont saisies directement sans interagir avec le bandeau', () => {
    const clientId = 'client-test-123'
    ecrireBrouillon({
      clientId,
      date: '2026-10-10',
      duree: '60',
      diff_muscu: '5',
      diff_cardio: '',
      fatigue: '',
      sommeil: '',
      notes: 'Ancien brouillon',
      lignes: [{ nom: 'Presse à cuisses', series: '4', repetitions: '10', charge_kg: '150' }],
    })

    renduNouvelleSeance(clientId)

    // Saisie directe dans le champ notes
    const champNotes = screen.getByLabelText(/Notes de séance/i)
    fireEvent.change(champNotes, { target: { value: 'Nouvelle séance très productive' } })

    // Avancer le minuteur
    act(() => {
      vi.advanceTimersByTime(700)
    })

    const sauvegarde = localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)
    expect(sauvegarde).not.toBeNull()
    expect(sauvegarde).toContain('Nouvelle séance très productive')
    expect(screen.queryByText(/Séance en cours retrouvée/i)).not.toBeInTheDocument()
  })
})

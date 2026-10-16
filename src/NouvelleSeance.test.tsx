import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import NouvelleSeance from './NouvelleSeance'
import { ClientCtx } from './ui'
import type { Client } from './Clients'
import { ecrireBrouillon } from './brouillon'
import { supabase } from './supabase'

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

  it('sauvegarde automatiquement en Mode Terrain si un réglage est saisi avant même de choisir le nom de l’exercice', () => {
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

    // Basculer en Mode Terrain
    fireEvent.click(screen.getByText('⚡ Mode Terrain plein écran'))

    // Saisie directe d'un réglage sur la ligne courante sans avoir choisi de nom d'exercice
    const champReglage = screen.getByPlaceholderText(/élastique rouge/i)
    fireEvent.change(champReglage, { target: { value: 'Élastique bleu' } })

    act(() => {
      vi.advanceTimersByTime(700)
    })

    const sauvegarde = localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)
    expect(sauvegarde).not.toBeNull()
    expect(sauvegarde).toContain('Élastique bleu')
    expect(screen.queryByText(/Séance en cours retrouvée/i)).not.toBeInTheDocument()
  })

  it('synchronise la date et la durée de toutes les séances liées par session_id lors d’une modification ([P1-04])', async () => {
    const clientId = 'client-test-123'
    const seanceId = 'seance-alice-1'
    const sessionId = 'session-commune-duo-789'

    const updateCalls: Array<{ table: string; payload: any; filters: Record<string, any> }> = []

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      const obj: any = {}
      let currentPayload: any = null
      const currentFilters: Record<string, any> = {}

      obj.select = vi.fn().mockReturnValue(obj)
      obj.insert = vi.fn().mockReturnValue(obj)
      obj.delete = vi.fn().mockReturnValue(obj)
      obj.order = vi.fn().mockReturnValue(obj)
      obj.limit = vi.fn().mockReturnValue(obj)
      obj.single = vi.fn().mockImplementation(() => {
        if (table === 'seances') {
          return Promise.resolve({
            data: {
              client_id: clientId,
              session_id: sessionId,
              date_seance: '2026-10-10',
              duree_min: 60,
              diff_muscu: 6,
              diff_cardio: null,
              fatigue: null,
              sommeil: null,
              notes: 'Séance duo avec Bob',
              exercices: [{ id: 'exo-1', ordre: 0, nom: 'Squat barre', series: 4, repetitions: 8, charge_kg: 80 }],
            },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      })

      obj.update = vi.fn().mockImplementation((payload: any) => {
        currentPayload = payload
        return obj
      })

      obj.eq = vi.fn().mockImplementation((field: string, val: any) => {
        currentFilters[field] = val
        return obj
      })

      obj.neq = vi.fn().mockImplementation((field: string, val: any) => {
        currentFilters[`neq_${field}`] = val
        return obj
      })

      obj.in = vi.fn().mockReturnValue(obj)
      obj.lte = vi.fn().mockReturnValue(obj)
      obj.gte = vi.fn().mockReturnValue(obj)
      obj.gt = vi.fn().mockReturnValue(obj)
      obj.ilike = vi.fn().mockReturnValue(obj)

      obj.then = (fn: (res: any) => void) => {
        if (currentPayload) {
          updateCalls.push({ table, payload: currentPayload, filters: { ...currentFilters } })
        }
        return Promise.resolve(fn({ data: [], error: null }))
      }

      return obj
    })

    const client = { ...clientMock, id: clientId }
    await act(async () => {
      render(
        <ClientCtx.Provider value={{ client, recharger: vi.fn().mockResolvedValue(undefined) }}>
          <NouvelleSeance seanceId={seanceId} onSaved={vi.fn()} />
        </ClientCtx.Provider>,
      )
    })

    // Modifier la date et la durée
    const inputDate = screen.getByLabelText(/Date/i)
    fireEvent.change(inputDate, { target: { value: '2026-10-18' } })

    const inputDuree = screen.getByLabelText(/Durée personnalisée en minutes/i)
    fireEvent.change(inputDuree, { target: { value: '75' } })

    // Soumettre le formulaire
    const btnEnregistrer = screen.getByRole('button', { name: /^Enregistrer$/i })
    await act(async () => {
      fireEvent.click(btnEnregistrer)
    })

    // Vérifier les appels d'update
    // 1) Mise à jour de la séance courante
    const updateLigneCourante = updateCalls.find(
      c => c.table === 'seances' && c.filters.id === seanceId && c.payload.date_seance === '2026-10-18' && c.payload.duree_min === 75,
    )
    expect(updateLigneCourante).toBeDefined()

    // 2) Mise à jour des séances partagées avec le même session_id
    const updatePartagees = updateCalls.find(
      c =>
        c.table === 'seances' &&
        c.filters.session_id === sessionId &&
        c.filters.neq_id === seanceId &&
        c.payload.date_seance === '2026-10-18' &&
        c.payload.duree_min === 75,
    )
    expect(updatePartagees).toBeDefined()
  })

  it('n’affiche pas le bandeau de brouillon si le brouillon a expiré (> 7 jours)', () => {
    const clientId = 'client-test-123'
    const ilYa8Jours = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()

    localStorage.setItem(
      `vdcoach_brouillon_seance:${clientId}`,
      JSON.stringify({
        clientId,
        date: '2026-10-01',
        duree: '60',
        notes: 'Brouillon expiré depuis 8 jours',
        lignes: [{ nom: 'Squat', series: '3', repetitions: '10', charge_kg: '60' }],
        enregistreLe: ilYa8Jours,
      }),
    )

    renduNouvelleSeance(clientId)

    // Aucun bandeau de reprise de brouillon
    expect(screen.queryByText(/Séance en cours retrouvée/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    // Le brouillon périmé a été automatiquement nettoyé du stockage
    expect(localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)).toBeNull()
  })

  it('isolation par client : un brouillon enregistré pour un autre client n’apparaît pas', () => {
    const clientIdCourant = 'client-test-123'
    const autreClientId = 'client-autre-999'

    ecrireBrouillon({
      clientId: autreClientId,
      date: '2026-10-15',
      duree: '60',
      notes: 'Brouillon privé d’un autre client',
      lignes: [{ nom: 'Fentes', series: '3', repetitions: '10', charge_kg: '20' }],
    })

    renduNouvelleSeance(clientIdCourant)

    expect(screen.queryByText(/Séance en cours retrouvée/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('permet de reprendre un brouillon existant en vue classique et restaure les valeurs', () => {
    const clientId = 'client-test-123'
    ecrireBrouillon({
      clientId,
      date: '2026-10-14',
      duree: '45',
      diff_muscu: '8',
      diff_cardio: '',
      fatigue: '',
      sommeil: '',
      notes: 'Notes restaurées du brouillon classique',
      lignes: [{ nom: 'Squat barre', series: '3', repetitions: '10', charge_kg: '90' }],
    })

    renduNouvelleSeance(clientId)

    // Bandeau visible en vue classique
    expect(screen.getByRole('status')).toBeInTheDocument()
    const btnReprendre = screen.getByRole('button', { name: 'Reprendre' })
    fireEvent.click(btnReprendre)

    // Le bandeau disparaît
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    // Les données sont injectées dans les champs de la vue classique
    const inputDate = screen.getByLabelText(/Date/i) as HTMLInputElement
    expect(inputDate.value).toBe('2026-10-14')

    const inputNotes = screen.getByLabelText(/Notes de séance/i) as HTMLTextAreaElement
    expect(inputNotes.value).toBe('Notes restaurées du brouillon classique')

    // L'exercice est affiché
    expect(screen.getByText('Squat barre')).toBeInTheDocument()
  })

  it('permet d’abandonner un brouillon existant en vue classique et le purge du stockage', () => {
    const clientId = 'client-test-123'
    ecrireBrouillon({
      clientId,
      date: '2026-10-14',
      duree: '45',
      notes: 'Brouillon à jeter',
      lignes: [],
    })

    expect(localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)).not.toBeNull()

    renduNouvelleSeance(clientId)

    expect(screen.getByRole('status')).toBeInTheDocument()
    const btnAbandonner = screen.getByRole('button', { name: 'Abandonner' })
    fireEvent.click(btnAbandonner)

    // Le bandeau disparaît et le localStorage est purgé
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(localStorage.getItem(`vdcoach_brouillon_seance:${clientId}`)).toBeNull()
  })
})




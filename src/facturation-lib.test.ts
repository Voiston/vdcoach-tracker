import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  libelleFormat,
  moisCourant,
  decalerMois,
  bornesMois,
  libelleMois,
  regrouperSeances,
  nomEntite,
  calculerFacturation,
  formats,
  detailFormats,
  resumeMois,
  type ClientFact,
  type LigneSeance,
  type Entite,
} from './facturation-lib'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('facturation-lib.ts', () => {
  describe('libelleFormat', () => {
    it('renvoie solo, duo, trio ou groupe de N', () => {
      expect(libelleFormat(1)).toBe('solo')
      expect(libelleFormat(2)).toBe('duo')
      expect(libelleFormat(3)).toBe('trio')
      expect(libelleFormat(4)).toBe('groupe de 4')
      expect(libelleFormat(8)).toBe('groupe de 8')
    })
  })

  describe('Gestion des mois', () => {
    it('moisCourant renvoie une chaîne au format AAAA-MM', () => {
      expect(moisCourant()).toMatch(/^\d{4}-\d{2}$/)
    })

    it('decalerMois ajoute ou retire des mois avec passage d’année', () => {
      expect(decalerMois('2025-01', 1)).toBe('2025-02')
      expect(decalerMois('2025-01', -1)).toBe('2024-12')
      expect(decalerMois('2025-12', 1)).toBe('2026-01')
      expect(decalerMois('2025-06', 0)).toBe('2025-06')
      expect(decalerMois('2025-06', 12)).toBe('2026-06')
    })

    it('bornesMois calcule le premier jour du mois et le premier jour du mois suivant', () => {
      expect(bornesMois('2025-03')).toEqual({
        debut: '2025-03-01',
        fin: '2025-04-01',
      })
      expect(bornesMois('2025-12')).toEqual({
        debut: '2025-12-01',
        fin: '2026-01-01',
      })
    })

    it('libelleMois renvoie le nom complet du mois en français', () => {
      const lib = libelleMois('2025-05')
      expect(lib.toLowerCase()).toContain('mai')
      expect(lib).toContain('2025')
    })
  })

  describe('regrouperSeances', () => {
    it('fusionne les lignes ayant le même session_id', () => {
      const lignes: LigneSeance[] = [
        { id: '1', client_id: 'c1', date_seance: '2025-05-10', session_id: 'sess-A', duree_min: 60 },
        { id: '2', client_id: 'c2', date_seance: '2025-05-10', session_id: 'sess-A', duree_min: 60 },
        { id: '3', client_id: 'c1', date_seance: '2025-05-02', session_id: null, duree_min: 45 },
      ]

      const seances = regrouperSeances(lignes)
      expect(seances).toHaveLength(2)

      // Tri par date croissante
      expect(seances[0].cle).toBe('3')
      expect(seances[0].date).toBe('2025-05-02')
      expect(seances[0].participants).toEqual(['c1'])

      expect(seances[1].cle).toBe('sess-A')
      expect(seances[1].date).toBe('2025-05-10')
      expect(seances[1].participants).toEqual(['c1', 'c2'])
    })

    it('évite les doublons de participants sur un même session_id', () => {
      const lignes: LigneSeance[] = [
        { id: '1', client_id: 'c1', date_seance: '2025-05-10', session_id: 'sess-A' },
        { id: '2', client_id: 'c1', date_seance: '2025-05-10', session_id: 'sess-A' },
      ]
      const seances = regrouperSeances(lignes)
      expect(seances[0].participants).toEqual(['c1'])
    })
  })

  describe('nomEntite', () => {
    it('formate le nom pour un client seul', () => {
      expect(nomEntite([{ id: '1', prenom: 'Alice', nom: 'Dupont', actif: true, groupe_facturation: null }])).toBe(
        'Alice Dupont',
      )
      expect(nomEntite([{ id: '2', prenom: 'Bob', nom: null, actif: true, groupe_facturation: null }])).toBe('Bob')
    })

    it('formate les prénoms pour un groupe', () => {
      expect(
        nomEntite([
          { id: '1', prenom: 'Alice', nom: 'Dupont', actif: true, groupe_facturation: 'grp1' },
          { id: '2', prenom: 'Bob', nom: 'Martin', actif: true, groupe_facturation: 'grp1' },
        ]),
      ).toBe('Alice & Bob')
    })
  })

  describe('calculerFacturation', () => {
    const clients: ClientFact[] = [
      { id: 'c1', prenom: 'Alice', nom: 'A', actif: true, groupe_facturation: 'couple-1' },
      { id: 'c2', prenom: 'Bob', nom: 'B', actif: true, groupe_facturation: 'couple-1' },
      { id: 'c3', prenom: 'Charlie', nom: 'C', actif: true, groupe_facturation: null },
    ]

    it('regroupe les séances par entité de facturation', () => {
      const lignes: LigneSeance[] = [
        // Séance en duo pour le couple
        { id: '1', client_id: 'c1', date_seance: '2025-05-02', session_id: 's1' },
        { id: '2', client_id: 'c2', date_seance: '2025-05-02', session_id: 's1' },
        // Séance solo pour Alice
        { id: '3', client_id: 'c1', date_seance: '2025-05-05', session_id: 's2' },
        // Séance solo pour Charlie
        { id: '4', client_id: 'c3', date_seance: '2025-05-06', session_id: null },
      ]

      const entites = calculerFacturation(clients, lignes)
      expect(entites).toHaveLength(2)

      const couple = entites.find(e => e.cle === 'couple-1')!
      expect(couple).toBeDefined()
      expect(couple.nom).toBe('Alice & Bob')
      expect(couple.seances).toHaveLength(2)

      const charlie = entites.find(e => e.cle === 'c3')!
      expect(charlie).toBeDefined()
      expect(charlie.nom).toBe('Charlie C')
      expect(charlie.seances).toHaveLength(1)
    })

    it('trie les entités par nom en ordre alphabétique', () => {
      const entites = calculerFacturation(clients, [
        { id: '1', client_id: 'c3', date_seance: '2025-05-01', session_id: null },
        { id: '2', client_id: 'c1', date_seance: '2025-05-02', session_id: null },
      ])
      expect(entites[0].nom).toBe('Alice & Bob')
      expect(entites[1].nom).toBe('Charlie C')
    })
  })

  describe('formats & detailFormats', () => {
    it('détaille les formats pour un client solo', () => {
      const entite: Entite = {
        cle: 'c1',
        nom: 'Charlie',
        membres: [{ id: 'c1', prenom: 'Charlie', nom: null, actif: true, groupe_facturation: null }],
        seances: [
          { cle: 's1', date: '2025-05-01', participants: ['c1'] },
          { cle: 's2', date: '2025-05-03', participants: ['c1'] },
          { cle: 's3', date: '2025-05-05', participants: ['c1', 'autre'] },
        ],
      }

      const f = formats(entite)
      expect(f).toEqual([
        { texte: 'solo', compte: 2 },
        { texte: 'duo', compte: 1 },
      ])
      expect(detailFormats(entite)).toBe('2 solo · 1 duo')
    })

    it('précise qui a participé lors d’un solo au sein d’un groupe', () => {
      const entite: Entite = {
        cle: 'grp',
        nom: 'Alice & Bob',
        membres: [
          { id: 'c1', prenom: 'Alice', nom: null, actif: true, groupe_facturation: 'grp' },
          { id: 'c2', prenom: 'Bob', nom: null, actif: true, groupe_facturation: 'grp' },
        ],
        seances: [
          { cle: 's1', date: '2025-05-01', participants: ['c1', 'c2'] },
          { cle: 's2', date: '2025-05-02', participants: ['c1', 'c2'] },
          { cle: 's3', date: '2025-05-03', participants: ['c1'] }, // solo Alice
        ],
      }

      const f = formats(entite)
      expect(f).toEqual([
        { texte: 'duo', compte: 2 },
        { texte: 'solo (Alice)', compte: 1 },
      ])
      expect(detailFormats(entite)).toBe('2 duo · 1 solo (Alice)')
    })
  })

  describe('resumeMois (avec Supabase mocké)', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('calcule le résumé du mois pour un client solo', async () => {
      const mockSeancesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({
              data: [
                { id: 's1', session_id: null },
                { id: 's2', session_id: 'partage-1' },
              ],
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'seances') return { select: mockSeancesSelect } as any
        return {} as any
      })

      const res = await resumeMois(
        { id: 'c1', prenom: 'David', groupe_facturation: null },
        '2025-05',
      )

      expect(mockSeancesSelect().eq).toHaveBeenCalledWith('client_id', 'c1')
      expect(res).toEqual({
        n: 2,
        avec: [],
        mois: '2025-05',
      })
    })

    it('prend en compte les membres du groupe de facturation et ne compte que les séances du client', async () => {
      const mockClientsSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: 'c1', prenom: 'David' },
            { id: 'c2', prenom: 'Sarah' },
          ],
          error: null,
        }),
      })

      const mockSeancesSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({
              data: [
                // Séance du client David (partagée avec Sarah)
                { id: 's1', session_id: 'commune-1' },
                // Autre séance de David à exclure
                { id: 's2', session_id: null },
              ],
              error: null,
            }),
          }),
        }),
      })

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === 'clients') return { select: mockClientsSelect } as any
        if (table === 'seances') return { select: mockSeancesSelect } as any
        return {} as any
      })

      const res = await resumeMois(
        { id: 'c1', prenom: 'David', groupe_facturation: 'grp-1' },
        '2025-05',
        new Set(['s2']), // s2 exclu
      )

      expect(mockSeancesSelect().eq).toHaveBeenCalledWith('client_id', 'c1')
      expect(res).toEqual({
        n: 1, // commune-1 compte pour 1 seule séance
        avec: ['Sarah'],
        mois: '2025-05',
      })
    })

    it('renvoie null en cas d’erreur Supabase', async () => {
      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lt: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
            }),
          }),
        }),
      } as any)

      const res = await resumeMois({ id: 'c1', prenom: 'David', groupe_facturation: null }, '2025-05')
      expect(res).toBeNull()
    })
  })
})

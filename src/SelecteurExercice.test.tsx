import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SelecteurExercice, {
  normaliser,
  lireExosFavoris,
  basculerExoFavori,
  detecterSchemaMoteur,
  articulationsSollicitees,
  zonesSensiblesSollicitees,
  type ExoChoix,
} from './SelecteurExercice'

describe('SelecteurExercice.tsx', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe('Fonctions pures métier', () => {
    describe('normaliser', () => {
      it('supprime les accents, met en minuscules et supprime les espaces superflus', () => {
        expect(normaliser('  Élévation Latérale ')).toBe('elevation laterale')
        expect(normaliser('Développé Couché')).toBe('developpe couche')
        expect(normaliser('Arrière d’Épaule')).toBe('arriere d’epaule')
      })
    })

    describe('Gestion des favoris (localStorage)', () => {
      it('renvoie un ensemble vide si rien n’est stocké ou si données invalides', () => {
        expect(lireExosFavoris()).toEqual(new Set())
        localStorage.setItem('vdcoach_exos_favoris', 'invalid json{')
        expect(lireExosFavoris()).toEqual(new Set())
      })

      it('ajoute un favori puis le retire par bascule', () => {
        const favs1 = basculerExoFavori('Développé couché')
        expect(favs1.has('developpe couche')).toBe(true)
        expect(lireExosFavoris().has('developpe couche')).toBe(true)

        const favs2 = basculerExoFavori('Développé couché')
        expect(favs2.has('developpe couche')).toBe(false)
        expect(lireExosFavoris().has('developpe couche')).toBe(false)
      })
    })

    describe('detecterSchemaMoteur', () => {
      it('détecte la mobilité', () => {
        expect(detecterSchemaMoteur('Étirement ischios', 'Mobilité')).toBe('mobilite')
        expect(detecterSchemaMoteur('Cat-cow')).toBe('mobilite')
        expect(detecterSchemaMoteur('Open book')).toBe('mobilite')
      })

      it('détecte le cardio', () => {
        expect(detecterSchemaMoteur('Course sur tapis', 'Cardio')).toBe('cardio')
        expect(detecterSchemaMoteur('Rameur')).toBe('cardio')
        expect(detecterSchemaMoteur('Burpees')).toBe('cardio')
      })

      it('détecte les fentes et unilatéral jambes', () => {
        expect(detecterSchemaMoteur('Fente avant')).toBe('fente')
        expect(detecterSchemaMoteur('Fente bulgare')).toBe('fente')
        expect(detecterSchemaMoteur('Step up')).toBe('fente')
        expect(detecterSchemaMoteur('Pistol squat')).toBe('fente')
      })

      it('détecte le squat et dominante genou', () => {
        expect(detecterSchemaMoteur('Squat arrière')).toBe('squat')
        expect(detecterSchemaMoteur('Presse à cuisses')).toBe('squat')
        expect(detecterSchemaMoteur('Goblet squat')).toBe('squat')
        expect(detecterSchemaMoteur('Leg extension')).toBe('squat')
      })

      it('détecte la charnière de hanche (soulevé / pont)', () => {
        expect(detecterSchemaMoteur('Soulevé de terre')).toBe('charniere')
        expect(detecterSchemaMoteur('RDL haltères')).toBe('charniere')
        expect(detecterSchemaMoteur('Hip thrust barre')).toBe('charniere')
        expect(detecterSchemaMoteur('Leg curl')).toBe('charniere')
      })

      it('détecte la poussée horizontale', () => {
        expect(detecterSchemaMoteur('Développé couché')).toBe('poussee_h')
        expect(detecterSchemaMoteur('Pompes au sol')).toBe('poussee_h')
        expect(detecterSchemaMoteur('Dips')).toBe('poussee_h')
      })

      it('détecte la poussée verticale', () => {
        expect(detecterSchemaMoteur('Développé militaire')).toBe('poussee_v')
        expect(detecterSchemaMoteur('Shoulder press')).toBe('poussee_v')
      })

      it('détecte le tirage horizontal', () => {
        expect(detecterSchemaMoteur('Rowing barre')).toBe('tirage_h')
        expect(detecterSchemaMoteur('Tirage horizontal poulie')).toBe('tirage_h')
        expect(detecterSchemaMoteur('Face pull')).toBe('tirage_h')
      })

      it('détecte le tirage vertical', () => {
        expect(detecterSchemaMoteur('Traction supination')).toBe('tirage_v')
        expect(detecterSchemaMoteur('Lat pulldown')).toBe('tirage_v')
      })

      it('détecte le gainage', () => {
        expect(detecterSchemaMoteur('Gainage planche')).toBe('gainage')
        expect(detecterSchemaMoteur('Crunch abdos')).toBe('gainage')
        expect(detecterSchemaMoteur('Dead bug')).toBe('gainage')
      })

      it('détecte l’isolation', () => {
        expect(detecterSchemaMoteur('Curl biceps')).toBe('isolation')
        expect(detecterSchemaMoteur('Élévation latérale')).toBe('isolation')
        expect(detecterSchemaMoteur('Extension triceps')).toBe('isolation')
      })

      it('renvoie autre pour les mouvements non classés', () => {
        expect(detecterSchemaMoteur('Marche du fermier')).toBe('autre')
      })
    })

    describe('articulationsSollicitees', () => {
      it('détecte genou et hanche pour les squats et fentes', () => {
        const artSquat = articulationsSollicitees('Squat barre')
        expect(artSquat).toContain('genou')
        expect(artSquat).toContain('hanche')

        const artFente = articulationsSollicitees('Fente avant')
        expect(artFente).toContain('genou')
        expect(artFente).toContain('hanche')
      })

      it('détecte hanche et rachis lombaire pour soulevé de terre', () => {
        const artRDL = articulationsSollicitees('Soulevé de terre')
        expect(artRDL).toContain('hanche')
        expect(artRDL).toContain('rachis_lombaire')
      })

      it('détecte épaule et coude pour développé couché', () => {
        const artPec = articulationsSollicitees('Développé couché')
        expect(artPec).toContain('epaule')
        expect(artPec).toContain('coude')
      })
    })

    describe('zonesSensiblesSollicitees', () => {
      const exoPec: ExoChoix = {
        nom: 'Développé couché',
        groupe: 'Pectoraux',
        muscles: [
          { muscle: 'pectoraux', coefficient: 1 },
          { muscle: 'triceps', coefficient: 0.5 },
        ],
      }

      it('renvoie vide si aucune zone sensible chez le client', () => {
        expect(zonesSensiblesSollicitees(exoPec, [])).toEqual([])
      })

      it('détecte les muscles et les articulations sensibles avec leurs libellés', () => {
        // Le client a des douleurs à l'épaule (articulation) et aux pectoraux (muscle)
        const alerte = zonesSensiblesSollicitees(exoPec, ['epaule', 'pectoraux', 'genou'])
        expect(alerte).toContain('Pectoraux')
        expect(alerte).toContain('Épaule')
        expect(alerte).not.toContain('Genou')
      })
    })
  })

  describe('Composant SelecteurExercice (UI & Interactions)', () => {
    const fakeExercices: ExoChoix[] = [
      {
        nom: 'Développé couché',
        groupe: 'Pectoraux',
        materiel: 'Barre',
        muscles: [{ muscle: 'pectoraux', coefficient: 1 }, { muscle: 'triceps', coefficient: 0.5 }],
      },
      {
        nom: 'Pompes',
        groupe: 'Pectoraux',
        materiel: 'Poids du corps',
        muscles: [{ muscle: 'pectoraux', coefficient: 1 }, { muscle: 'triceps', coefficient: 0.5 }],
      },
      {
        nom: 'Squat barre',
        groupe: 'Cuisses',
        materiel: 'Barre',
        muscles: [{ muscle: 'quadriceps', coefficient: 1 }],
      },
    ]

    it('affiche la liste des exercices et déclenche onChoisir au clic en mode simple', () => {
      const onChoisir = vi.fn()
      const onFermer = vi.fn()

      render(
        <SelecteurExercice
          exercices={fakeExercices}
          faits={new Set()}
          onChoisir={onChoisir}
          onFermer={onFermer}
        />,
      )

      expect(screen.getByText('Choisir un exercice')).toBeInTheDocument()
      expect(screen.getByText('Développé couché')).toBeInTheDocument()
      expect(screen.getByText('Squat barre')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Développé couché'))
      expect(onChoisir).toHaveBeenCalledWith('Développé couché')
    })

    it('ferme la modale avec le bouton fermer ou la touche Échap', () => {
      const onFermer = vi.fn()

      render(
        <SelecteurExercice
          exercices={fakeExercices}
          faits={new Set()}
          onChoisir={vi.fn()}
          onFermer={onFermer}
        />,
      )

      fireEvent.click(screen.getByLabelText('Fermer'))
      expect(onFermer).toHaveBeenCalledTimes(1)

      fireEvent.keyDown(window, { key: 'Escape' })
      expect(onFermer).toHaveBeenCalledTimes(2)
    })

    it('filtre les exercices via la recherche texte', () => {
      render(
        <SelecteurExercice
          exercices={fakeExercices}
          faits={new Set()}
          onChoisir={vi.fn()}
          onFermer={vi.fn()}
        />,
      )

      const input = screen.getByPlaceholderText(/Rechercher un exercice/i)
      fireEvent.change(input, { target: { value: 'squat' } })

      expect(screen.getByText('Squat barre')).toBeInTheDocument()
      expect(screen.queryByText('Développé couché')).not.toBeInTheDocument()
    })

    it('propose un exercice hors bibliothèque si non trouvé', () => {
      const onChoisir = vi.fn()
      render(
        <SelecteurExercice
          exercices={fakeExercices}
          faits={new Set()}
          onChoisir={onChoisir}
          onFermer={vi.fn()}
        />,
      )

      const input = screen.getByPlaceholderText(/Rechercher un exercice/i)
      fireEvent.change(input, { target: { value: 'Mouvement Inconnu' } })

      expect(screen.getByText('+ Utiliser « Mouvement Inconnu »')).toBeInTheDocument()
      fireEvent.click(screen.getByText('+ Utiliser « Mouvement Inconnu »'))
      expect(onChoisir).toHaveBeenCalledWith('Mouvement Inconnu')
    })

    it('gère la sélection multiple et appelle onChoisirMultiple', () => {
      const onChoisirMultiple = vi.fn()

      render(
        <SelecteurExercice
          exercices={fakeExercices}
          faits={new Set()}
          multiple
          onChoisir={vi.fn()}
          onChoisirMultiple={onChoisirMultiple}
          onFermer={vi.fn()}
        />,
      )

      expect(screen.getByText('Ajouter un ou plusieurs exercices')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Développé couché'))
      fireEvent.click(screen.getByText('Pompes'))

      const btnAjouter = screen.getByText('Ajouter 2 exercices')
      expect(btnAjouter).toBeInTheDocument()

      fireEvent.click(btnAjouter)
      expect(onChoisirMultiple).toHaveBeenCalledWith(['Développé couché', 'Pompes'])
    })

    it('gère le mode remplacement et propose des équivalents', () => {
      render(
        <SelecteurExercice
          exercices={fakeExercices}
          faits={new Set()}
          remplacementDe="Développé couché"
          onChoisir={vi.fn()}
          onFermer={vi.fn()}
        />,
      )

      expect(screen.getByText('⇄ Remplacer « Développé couché »')).toBeInTheDocument()
      // Pompes partage le même schéma moteur (poussee_h) et les pectoraux -> suggéré en équivalent
      expect(screen.getByText('Pompes')).toBeInTheDocument()
    })

    it('permet de marquer et démarquer un exercice favori au clic sur l’étoile', () => {
      render(
        <SelecteurExercice
          exercices={fakeExercices}
          faits={new Set()}
          onChoisir={vi.fn()}
          onFermer={vi.fn()}
        />,
      )

      const btnEtoile = screen.getByLabelText('Ajouter Développé couché aux favoris')
      fireEvent.click(btnEtoile)

      expect(lireExosFavoris().has('developpe couche')).toBe(true)
      expect(screen.getByLabelText('Retirer Développé couché des favoris')).toBeInTheDocument()

      // Démarquer
      fireEvent.click(screen.getByLabelText('Retirer Développé couché des favoris'))
      expect(lireExosFavoris().has('developpe couche')).toBe(false)
    })

    it('[REG-03] inclut les muscles réellement sollicités par les exercices du groupe sélectionné', () => {
      const exercicesDos: ExoChoix[] = [
        {
          nom: 'Tirage horizontal',
          groupe: 'Dos',
          muscles: [{ muscle: 'grand_dorsal', coefficient: 1 }],
        },
        {
          nom: 'Face pull',
          groupe: 'Dos',
          muscles: [
            { muscle: 'delto_post', coefficient: 1 },
            { muscle: 'haut_dos', coefficient: 0.5 },
          ],
        },
        {
          nom: 'Squat',
          groupe: 'Jambes',
          muscles: [{ muscle: 'quadriceps', coefficient: 1 }, { muscle: 'fessiers', coefficient: 1 }],
        },
      ]

      render(
        <SelecteurExercice
          exercices={exercicesDos}
          faits={new Set()}
          onChoisir={vi.fn()}
          onFermer={vi.fn()}
        />,
      )

      // Aller sur l'onglet "Tous"
      fireEvent.click(screen.getByRole('tab', { name: /Tous/ }))

      // Choisir le groupe "Dos"
      const selectGroupe = screen.getByLabelText('Filtrer par groupe')
      fireEvent.change(selectGroupe, { target: { value: 'Dos' } })

      // Le selecteur de muscle doit contenir "Deltoïdes postérieurs" (car présent sur Face pull)
      const selectMuscle = screen.getByLabelText('Filtrer par muscle')
      const optionsMuscle = Array.from(selectMuscle.querySelectorAll('option')).map(o => o.textContent)

      expect(optionsMuscle).toContain('Deltoïdes postérieurs')
      expect(optionsMuscle).toContain('Grand dorsal')
      expect(optionsMuscle).toContain('Haut du dos')

      // Filtrer par Deltoïdes postérieurs
      fireEvent.change(selectMuscle, { target: { value: 'delto_post' } })

      // Seul Face pull doit être affiché
      expect(screen.getByText('Face pull')).toBeInTheDocument()
      expect(screen.queryByText('Tirage horizontal')).not.toBeInTheDocument()
      expect(screen.queryByText('Squat')).not.toBeInTheDocument()
    })
  })
})

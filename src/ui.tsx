import { useRef, useState } from 'react'

/** Silhouettes grises animées, affichées pendant le chargement d'une liste. */
export function Squelette({ lignes = 3 }: { lignes?: number }) {
  return (
    <div className="squelette" role="status" aria-label="Chargement en cours">
      {Array.from({ length: lignes }, (_, i) => (
        <div className="squelette-ligne" key={i}>
          <span />
          <span />
        </div>
      ))}
    </div>
  )
}

/** Écran affiché pendant la vérification de la connexion au démarrage. */
export function EcranChargement() {
  return (
    <div className="chargement" role="status" aria-label="Chargement en cours">
      <h1>VDCoach</h1>
      <span className="point" />
    </div>
  )
}

/**
 * Empêche le double envoi d'un formulaire : tant qu'une action est en cours,
 * les suivantes sont ignorées, et « occupe » permet de désactiver le bouton.
 */
export function useOccupe() {
  const enCours = useRef(false)
  const [occupe, setOccupe] = useState(false)

  async function lancer(action: () => Promise<unknown>) {
    if (enCours.current) return
    enCours.current = true
    setOccupe(true)
    try {
      await action()
    } finally {
      enCours.current = false
      setOccupe(false)
    }
  }
  return [occupe, lancer] as const
}

import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Propose de recharger l'app quand une nouvelle version est disponible (sans la recharger de force).
export default function MiseAJour() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const { needRefresh: [nouvelleVersion], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000) // vérifie chaque heure
      }
    },
  })

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])
  if (!nouvelleVersion) return null
  return (
    <div className="mise-a-jour" role="status">
      <span>Une nouvelle version est disponible.</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>Mettre à jour</button>
    </div>
  )
}

import { useRegisterSW } from 'virtual:pwa-register/react'

// Propose de recharger l'app quand une nouvelle version est disponible (sans la recharger de force).
export default function MiseAJour() {
  const { needRefresh: [nouvelleVersion], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000) // vérifie chaque heure
    },
  })
  if (!nouvelleVersion) return null
  return (
    <div className="mise-a-jour" role="status">
      <span>Une nouvelle version est disponible.</span>
      <button type="button" onClick={() => updateServiceWorker(true)}>Mettre à jour</button>
    </div>
  )
}

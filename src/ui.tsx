import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

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

/* ---------- États vides ---------- */
export function EtatVide({ titre, texte, action }: { titre: string; texte: string; action?: { libelle: string; onClick: () => void } }) {
  return (
    <div className="etat-vide">
      <strong>{titre}</strong>
      <p>{texte}</p>
      {action && <button type="button" className="secondaire" onClick={action.onClick}>{action.libelle}</button>}
    </div>
  )
}

/* ---------- Navigation entre onglets (fournie par App) ---------- */
export const NavigationCtx = createContext<(onglet: string) => void>(() => {})
export const useAller = () => useContext(NavigationCtx)

/* ---------- Notifications ---------- */
type Options = { annuler?: () => void; duree?: number }
type Notification = { id: number; message: string; annuler?: () => void }
type Notifier = (message: string, options?: Options) => void

const NotificationsCtx = createContext<Notifier>(() => {})
export const useNotifier = () => useContext(NotificationsCtx)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [liste, setListe] = useState<Notification[]>([])
  const compteur = useRef(0)
  const fermer = useCallback((id: number) => setListe(l => l.filter(n => n.id !== id)), [])

  const notifier = useCallback<Notifier>((message, options) => {
    const id = ++compteur.current
    setListe(l => [...l.slice(-2), { id, message, annuler: options?.annuler }])
    setTimeout(() => fermer(id), options?.duree ?? (options?.annuler ? 6000 : 3500))
  }, [fermer])

  return (
    <NotificationsCtx.Provider value={notifier}>
      {children}
      <div className="notifications" role="status" aria-live="polite">
        {liste.map(n => (
          <div className="notification" key={n.id}>
            <span>{n.message}</span>
            {n.annuler && (
              <button type="button" className="lien" onClick={() => { n.annuler?.(); fermer(n.id) }}>Annuler</button>
            )}
          </div>
        ))}
      </div>
    </NotificationsCtx.Provider>
  )
}

/**
 * Suppression avec possibilité d'annuler : l'élément disparaît tout de suite de l'écran,
 * mais n'est réellement supprimé qu'au bout de quelques secondes, sauf si on annule.
 * « effacer » renvoie un message d'erreur, ou rien si tout s'est bien passé.
 */
export function supprimerAvecAnnulation(o: {
  notifier: Notifier
  message: string
  masquer: () => void
  restaurer: () => void
  effacer: () => Promise<string | undefined>
  delai?: number
}) {
  const delai = o.delai ?? 5000
  o.masquer()
  const minuteur = setTimeout(async () => {
    const erreur = await o.effacer()
    if (erreur) {
      o.restaurer()
      o.notifier(`Suppression impossible : ${erreur}`)
    }
  }, delai)
  o.notifier(o.message, { duree: delai, annuler: () => { clearTimeout(minuteur); o.restaurer() } })
}

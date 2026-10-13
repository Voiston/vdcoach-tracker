import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { MSG_RESEAU, MSG_SERVEUR, messageErreur } from './erreurs'
import type { Client } from './Clients'
import Icone from './icones'

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

export function supprimerAvecAnnulation(o: {
  notifier: Notifier
  message: string
  masquer: () => void
  restaurer: () => void
  effacer: () => Promise<unknown>
  delai?: number
}) {
  const delai = o.delai ?? 5000
  o.masquer()
  const minuteur = setTimeout(async () => {
    const erreur = await o.effacer()
    if (erreur) {
      o.restaurer()
      o.notifier(`Suppression impossible : ${messageErreur(erreur)}`)
    }
  }, delai)
  o.notifier(o.message, { duree: delai, annuler: () => { clearTimeout(minuteur); o.restaurer() } })
}

/* ---------- Erreurs ---------- */
export function MessageErreur({ message, reessayer }: { message: string; reessayer?: () => void }) {
  if (!message) return null
  const passager = message === MSG_RESEAU || message === MSG_SERVEUR
  return (
    <div className="erreur-bloc" role="alert">
      <p className="erreur">{message}</p>
      {passager && reessayer && <button type="button" className="secondaire" onClick={reessayer}>Réessayer</button>}
    </div>
  )
}

export function ErreurChargement({ message }: { message: string }) {
  return (
    <div className="etat-vide" role="alert">
      <strong>Chargement impossible</strong>
      <p>{message}</p>
      <button type="button" className="secondaire" onClick={() => window.location.reload()}>Réessayer</button>
    </div>
  )
}

/* ---------- Réseau ---------- */
export function BandeauReseau() {
  const [enLigne, setEnLigne] = useState(navigator.onLine)
  const notifier = useNotifier()
  const dejaCoupe = useRef(false)

  useEffect(() => {
    const hors = () => { dejaCoupe.current = true; setEnLigne(false) }
    const retour = () => { setEnLigne(true); if (dejaCoupe.current) notifier('Connexion rétablie') }
    window.addEventListener('offline', hors)
    window.addEventListener('online', retour)
    return () => {
      window.removeEventListener('offline', hors)
      window.removeEventListener('online', retour)
    }
  }, [notifier])

  if (enLigne) return null
  return <p className="hors-ligne" role="status">Tu es hors connexion : rien ne sera enregistré tant que le réseau n'est pas revenu.</p>
}

/* ---------- Champ de formulaire avec libellé visible ---------- */
export function Champ({ libelle, aide, erreur, children }: { libelle: string; aide?: string; erreur?: string; children: ReactNode }) {
  return (
    <label className={`champ${erreur ? ' invalide' : ''}`}>
      <span className="champ-libelle">{libelle}</span>
      {children}
      {erreur ? <span className="champ-erreur" role="alert">{erreur}</span> : aide ? <span className="champ-aide">{aide}</span> : null}
    </label>
  )
}

export function FeuilleSaisie(props: {
  titre: string
  libelle: string
  valeur: string
  multiligne?: boolean
  obligatoire?: boolean
  validerLibelle?: string
  onValider: (texte: string) => Promise<string | void>
  onFermer: () => void
}) {
  const { titre, libelle, valeur, multiligne, obligatoire, validerLibelle = 'Enregistrer', onValider, onFermer } = props
  const [texte, setTexte] = useState(valeur)
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()
  const vide = Boolean(obligatoire) && !texte.trim()

  useEffect(() => {
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [onFermer])

  function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (vide) return
    lancer(async () => setErreur((await onValider(texte.trim())) ?? ''))
  }

  return (
    <div className="voile" onClick={onFermer}>
      <form className="feuille" role="dialog" aria-modal="true" aria-labelledby="feuille-titre" onClick={e => e.stopPropagation()} onSubmit={envoyer}>
        <h3 id="feuille-titre">{titre}</h3>
        <Champ libelle={libelle}>
          {multiligne
            ? <textarea autoFocus value={texte} onChange={e => setTexte(e.target.value)} />
            : <input autoFocus value={texte} onChange={e => setTexte(e.target.value)} />}
        </Champ>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
        <div className="ligne">
          <button type="button" className="secondaire" onClick={onFermer}>Annuler</button>
          <button type="submit" disabled={occupe || vide}>{occupe ? 'Enregistrement…' : validerLibelle}</button>
        </div>
      </form>
    </div>
  )
}

/* ---------- Client courant (fourni par le profil client) ---------- */
export const ClientCtx = createContext<{ client: Client; recharger: () => Promise<void> } | null>(null)

export function useClientComplet() {
  const c = useContext(ClientCtx)
  if (!c) throw new Error('Cet écran doit être affiché dans le profil d’un client.')
  return c
}
export const useClient = () => useClientComplet().client

/* ---------- Taille d'écran ---------- */
export function useEcranLarge(requete = '(min-width: 960px)') {
  const [large, setLarge] = useState(() => window.matchMedia(requete).matches)
  useEffect(() => {
    const media = window.matchMedia(requete)
    const maj = () => setLarge(media.matches)
    maj()
    media.addEventListener('change', maj)
    return () => media.removeEventListener('change', maj)
  }, [requete])
  return large
}

/* ---------- Compteur : champ numérique avec boutons − et + (appui long + choix du pas) ---------- */
export function Compteur({
  libelle,
  valeur,
  onChange,
  pas,
  choixPas,
  min = 0,
  max,
  depart,
  decimal,
  erreur,
}: {
  libelle: string
  valeur: string
  onChange: (valeur: string) => void
  pas: number
  choixPas?: number[]
  min?: number
  max?: number
  depart?: number
  decimal?: boolean
  erreur?: string
}) {
  const id = useId()
  const [pasActif, setPasActif] = useState(pas)
  const refValeur = useRef(valeur)
  refValeur.current = valeur
  const refOnChange = useRef(onChange)
  refOnChange.current = onChange
  const timer = useRef<{ delai?: ReturnType<typeof setTimeout>; intervalle?: ReturnType<typeof setInterval> }>({})

  function arreter() {
    if (timer.current.delai) clearTimeout(timer.current.delai)
    if (timer.current.intervalle) clearInterval(timer.current.intervalle)
    timer.current = {}
  }

  useEffect(() => arreter, [])

  function bouger(delta: number) {
    const v = refValeur.current
    const actuel = v.trim() === '' ? null : Number(v.replace(',', '.'))
    let suivant: number
    if (actuel === null || Number.isNaN(actuel)) {
      if (delta < 0) return
      suivant = depart ?? Math.abs(delta)
    } else {
      suivant = actuel + delta
    }
    suivant = Math.round(suivant * 100) / 100
    if (suivant < min) suivant = min
    if (max !== undefined && suivant > max) suivant = max
    const texte = String(suivant).replace('.', ',')
    refValeur.current = texte
    refOnChange.current(texte)
  }

  function demarrerAppui(delta: number) {
    arreter()
    bouger(delta)
    timer.current.delai = setTimeout(() => {
      timer.current.intervalle = setInterval(() => bouger(delta), 95)
    }, 350)
  }

  return (
    <div className={`champ compteur${erreur ? ' invalide' : ''}`} role="group" aria-labelledby={id}>
      <div className="compteur-entete">
        <span className="champ-libelle" id={id}>{libelle}</span>
        {choixPas && choixPas.length > 1 && (
          <span className="compteur-pas" role="group" aria-label="Pas d'incrémentation">
            {choixPas.map(p => (
              <button
                key={p}
                type="button"
                className={`pas-puce${p === pasActif ? ' actif' : ''}`}
                onClick={() => setPasActif(p)}
              >
                ±{String(p).replace('.', ',')}
              </button>
            ))}
          </span>
        )}
      </div>
      <div className="compteur-ligne">
        <button
          type="button"
          aria-label={`Diminuer : ${libelle}`}
          onPointerDown={e => { e.preventDefault(); demarrerAppui(-pasActif) }}
          onPointerUp={arreter}
          onPointerLeave={arreter}
          onPointerCancel={arreter}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bouger(-pasActif) } }}
        >
          −
        </button>
        <input inputMode={decimal ? 'decimal' : 'numeric'} value={valeur} onChange={e => onChange(e.target.value)} aria-labelledby={id} />
        <button
          type="button"
          aria-label={`Augmenter : ${libelle}`}
          onPointerDown={e => { e.preventDefault(); demarrerAppui(pasActif) }}
          onPointerUp={arreter}
          onPointerLeave={arreter}
          onPointerCancel={arreter}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); bouger(pasActif) } }}
        >
          +
        </button>
      </div>
      {erreur && <span className="champ-erreur" role="alert">{erreur}</span>}
    </div>
  )
}

/* ---------- Note tactile de 1 à 10 (zéro clavier) ---------- */
export function NoteSur10({
  libelle,
  valeur,
  onChange,
  inverse = false,
}: {
  libelle: string
  valeur: string
  onChange: (v: string) => void
  inverse?: boolean // false : 10 = intense/élevé ; true (ex. Sommeil) : 10 = excellent
}) {
  const actuel = valeur ? Number(valeur) : null
  return (
    <div className="note-10" role="group" aria-label={libelle}>
      <div className="note-10-entete">
        <span className="champ-libelle">{libelle}</span>
        {actuel !== null && <strong>{actuel}/10</strong>}
      </div>
      <div className="note-10-grille">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => {
          const actif = actuel === n
          const niveau = inverse
            ? n >= 7 ? 'bon' : n >= 4 ? 'moyen' : 'haut'
            : n <= 4 ? 'bon' : n <= 7 ? 'moyen' : 'haut'
          return (
            <button
              key={n}
              type="button"
              className={`note-puce ${niveau}${actif ? ' actif' : ''}`}
              aria-pressed={actif}
              onClick={() => onChange(actif ? '' : String(n))}
            >
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Pastille d'initiales ---------- */
export function Avatar({ client, grand }: { client: { id: string; prenom: string; nom: string | null }; grand?: boolean }) {
  const initiales = `${client.prenom.trim()[0] ?? ''}${client.nom?.trim()[0] ?? ''}`.toUpperCase()
  let h = 0
  for (const c of client.id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const teinte = [150, 185, 215, 255, 325, 25][h % 6]
  return (
    <span className={`avatar${grand ? ' grand' : ''}`} style={{ '--h': teinte } as React.CSSProperties} aria-hidden="true">
      {initiales || '?'}
    </span>
  )
}

/* ---------- Titre de section avec petite icône ---------- */
export function TitreSection({ icone, children }: { icone: string; children: ReactNode }) {
  return (
    <h3 className="titre-icone">
      <Icone nom={icone} />
      {children}
    </h3>
  )
}
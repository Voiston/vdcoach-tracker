import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { deconnexionVolontaire } from './deconnexion'
import { MSG_SESSION, messageErreur } from './erreurs'
import Accueil from './Accueil'
import Profil, { type Rubrique } from './Profil'
import Bibliotheque from './Bibliotheque'
import Modeles from './Modeles'
import Reglages from './Reglages'
import Icone from './icones'
import { BandeauReseau, Champ, EcranChargement, NavigationCtx, useEcranLarge } from './ui'
import TableauDeBord from './TableauDeBord'
import { Verification2FA } from './Auth2FA'

type Route =
  | { page: 'clients' }
  | { page: 'exercices' }
  | { page: 'reglages' }
  | { page: 'client'; clientId: string; rubrique: Rubrique; seanceId?: string | null }

const ONGLETS = [
  { page: 'clients', libelle: 'Clients' },
  { page: 'exercices', libelle: 'Exercices' },
  { page: 'reglages', libelle: 'Réglages' },
] as const

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [route, setRoute] = useState<Route>({ page: 'clients' })
  const [sessionExpiree, setSessionExpiree] = useState(false)
  const large = useEcranLarge()
  const [bandeau, setBandeau] = useState('') // message affiché après l'enregistrement (ex. nouveau record)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((evenement, s) => {
      setSession(s)
      if (evenement === 'SIGNED_OUT' && !deconnexionVolontaire()) setSessionExpiree(true)
      if (evenement === 'SIGNED_IN') setSessionExpiree(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // Double authentification : undefined = vérification en cours
  const [exige2fa, setExige2fa] = useState<boolean | undefined>(undefined)

  async function verifierNiveau() {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setExige2fa(data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2')
  }

  useEffect(() => {
    if (!session) setExige2fa(undefined)
    else verifierNiveau()
  }, [session])

  // Chaque changement d'écran est inscrit dans l'historique : le bouton « retour » du téléphone remonte d'un écran
  useEffect(() => {
    const depart: Route = { page: 'clients' }
    history.replaceState(depart, '')
    const retour = (e: PopStateEvent) => {
      setRoute((e.state as Route | null) ?? depart)
      setBandeau('')
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('popstate', retour)
    return () => window.removeEventListener('popstate', retour)
  }, [])

  // Après un changement d'écran, le focus passe au contenu (utile aux lecteurs d'écran et au clavier)
  const premierAffichage = useRef(true)
  useEffect(() => {
    if (premierAffichage.current) {
      premierAffichage.current = false
      return
    }
    document.querySelector('main')?.focus({ preventScroll: true })
  }, [JSON.stringify(route)])

  function naviguer(r: Route) {
    if (JSON.stringify(r) === JSON.stringify(route)) return window.scrollTo({ top: 0, behavior: 'smooth' })
    setRoute(r)
    setBandeau('')
    window.scrollTo({ top: 0 })
    history.pushState(r, '')
  }

  if (session === undefined) return <EcranChargement />
  if (!session) return <Connexion message={sessionExpiree ? MSG_SESSION : ''} />
  if (exige2fa === undefined) return <EcranChargement />
  if (exige2fa) return <Verification2FA onOk={verifierNiveau} />

  const onglet = route.page === 'client' ? 'clients' : route.page
  const enSaisie = route.page === 'client' && route.rubrique === 'seance'

  return (
    <NavigationCtx.Provider value={o => naviguer({ page: o as 'clients' | 'exercices' | 'reglages' })}>
      <div className={enSaisie ? 'app en-saisie' : 'app'}>
        <header>
          <h1>VDCoach</h1>
        </header>
        <div className="contenu">
          <BandeauReseau />
          <main tabIndex={-1}>
            {bandeau && <p className="bandeau" onClick={() => setBandeau('')}>{bandeau}</p>}
            {(route.page === 'clients' || route.page === 'client') && (
              // Sur grand écran : la liste des clients reste affichée à gauche, le profil s'ouvre à droite
              <div className={large ? 'maitre-detail' : undefined}>
                {(large || route.page === 'clients') && (
                  <Accueil
                    actifId={route.page === 'client' ? route.clientId : undefined}
                    rechargerQuand={JSON.stringify(route)}
                    onOuvrir={id => naviguer({ page: 'client', clientId: id, rubrique: 'apercu' })}
                    onNouvelleSeance={id => naviguer({ page: 'client', clientId: id, rubrique: 'seance' })}
                  />
                )}
                {route.page === 'client' && (
                  <Profil
                    key={route.clientId}
                    clientId={route.clientId}
                    rubrique={route.rubrique}
                    seanceId={route.seanceId ?? null}
                    onRubrique={(rubrique, seanceId = null) => naviguer({ page: 'client', clientId: route.clientId, rubrique, seanceId })}
                    onRetour={() => naviguer({ page: 'clients' })}
                    onSaved={m => {
                      naviguer({ page: 'client', clientId: route.clientId, rubrique: 'seances' })
                      setBandeau(m ?? '')
                    }}
                  />
                )}
                {large && route.page === 'clients' && (
                  <TableauDeBord
                    onOuvrir={id => naviguer({ page: 'client', clientId: id, rubrique: 'apercu' })}
                    onNouvelleSeance={id => naviguer({ page: 'client', clientId: id, rubrique: 'seance' })}
                  />
                )}
              </div>
            )}
            {route.page === 'exercices' && (
              <div className="page-exercices">
                <Bibliotheque />
                <Modeles />
              </div>
            )}
            {route.page === 'reglages' && <Reglages />}
          </main>
        </div>
        <nav aria-label="Navigation principale">
          {ONGLETS.map(o => (
            <button key={o.page} className={o.page === onglet ? 'actif' : ''} aria-current={o.page === onglet ? 'page' : undefined} onClick={() => naviguer({ page: o.page })}>
              <Icone nom={o.page} />
              <span>{o.libelle}</span>
            </button>
          ))}
        </nav>
      </div>
    </NavigationCtx.Provider>
  )
}

function Connexion({ message }: { message?: string }) {
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')

  async function connecter(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp })
    if (error) setErreur(error.code === 'invalid_credentials' ? 'Identifiants incorrects.' : messageErreur(error))
  }

  return (
    <form className="connexion" onSubmit={connecter}>
      <h1>VDCoach Tracker</h1>
      {message && <p className="erreur">{message}</p>}
      <Champ libelle="Email"><input autoComplete="username" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></Champ>
      <Champ libelle="Mot de passe"><input autoComplete="current-password" type="password" value={mdp} onChange={e => setMdp(e.target.value)} required /></Champ>
      {erreur && <p className="erreur">{erreur}</p>}
      <button type="submit">Se connecter</button>
    </form>
  )
}

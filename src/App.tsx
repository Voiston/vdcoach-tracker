import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { deconnexionVolontaire } from './deconnexion'
import { MSG_SESSION, messageErreur } from './erreurs'
import Accueil from './Accueil'
import type { Rubrique } from './Profil'
import Icone from './icones'
import { BandeauReseau, Champ, EcranChargement, Logo, NavigationCtx, Squelette, useEcranLarge } from './ui'
import { Verification2FA } from './Auth2FA'

const Profil = lazy(() => import('./Profil'))
const Bibliotheque = lazy(() => import('./Bibliotheque'))
const Modeles = lazy(() => import('./Modeles'))
const Reglages = lazy(() => import('./Reglages'))
const TableauDeBord = lazy(() => import('./TableauDeBord'))
const Facturation = lazy(() => import('./Facturation'))
const Palette = lazy(() => import('./Palette'))

type Route =
  | { page: 'clients' }
  | { page: 'exercices'; recherche?: string }
  | { page: 'facturation' }
  | { page: 'reglages' }
  | { page: 'client'; clientId: string; rubrique: Rubrique; seanceId?: string | null }

const ONGLETS = [
  { page: 'clients', libelle: 'Clients' },
  { page: 'exercices', libelle: 'Exercices' },
  { page: 'facturation', libelle: 'Facturation' },
  { page: 'reglages', libelle: 'Réglages' },
] as const

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [route, setRoute] = useState<Route>({ page: 'clients' })
  const [versionListe, setVersionListe] = useState(0)
  const [sessionExpiree, setSessionExpiree] = useState(false)
  const large = useEcranLarge()
  const [bandeau, setBandeau] = useState('')
  // Sous-vues sur téléphone pour éviter les longs défilements
  const [vueAccueilMobile, setVueAccueilMobile] = useState<'liste' | 'tableau'>('liste')
  const [vueExosMobile, setVueExosMobile] = useState<'biblio' | 'modeles'>('biblio')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((evenement, s) => {
      setSession(s)
      if (evenement === 'SIGNED_OUT' && !deconnexionVolontaire()) setSessionExpiree(true)
      if (evenement === 'SIGNED_IN') setSessionExpiree(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const [exige2fa, setExige2fa] = useState<boolean | undefined>(undefined)

  async function verifierNiveau() {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setExige2fa(data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2')
  }

  useEffect(() => {
    if (!session) setExige2fa(undefined)
    else verifierNiveau()
  }, [session])

  const [palette, setPalette] = useState(false)
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPalette(p => !p)
      }
    }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [])

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

  const premierAffichage = useRef(true)
  useEffect(() => {
    if (premierAffichage.current) {
      premierAffichage.current = false
      return
    }
    document.querySelector('main')?.focus({ preventScroll: true })
  }, [JSON.stringify(route)])

  function naviguer(r: Route) {
    if (r.page === 'exercices' && r.recherche) setVueExosMobile('biblio')
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
    <NavigationCtx.Provider value={o => naviguer({ page: o as 'clients' | 'exercices' | 'facturation' | 'reglages' })}>
      <div className={enSaisie ? 'app en-saisie' : 'app'}>
        <header>
          <button
            type="button"
            className="logo-accueil"
            onClick={() => {
              setVueAccueilMobile('liste')
              naviguer({ page: 'clients' })
            }}
            aria-label="Retour à l'accueil VDCoach"
          >
            <Logo />
          </button>
          <button type="button" className="recherche-rapide" onClick={() => setPalette(true)} aria-label="Recherche rapide (Ctrl + K)">
            <Icone nom="recherche" />
            <span className="libelle">Rechercher…</span>
            <kbd>Ctrl K</kbd>
          </button>
        </header>
        <div className="contenu">
          <BandeauReseau />
          <main tabIndex={-1}>
            {bandeau && <p className="bandeau" onClick={() => setBandeau('')}>{bandeau}</p>}
            <Suspense fallback={<Squelette lignes={4} />}>
              {(route.page === 'clients' || route.page === 'client') && (
                <div className={large ? 'maitre-detail' : undefined}>
                  {!large && route.page === 'clients' && (
                    <div className="segments segments-mobile" role="group" aria-label="Vue clients">
                      <button type="button" className={vueAccueilMobile === 'liste' ? 'actif' : ''} onClick={() => setVueAccueilMobile('liste')}>
                        Clients
                      </button>
                      <button type="button" className={vueAccueilMobile === 'tableau' ? 'actif' : ''} onClick={() => setVueAccueilMobile('tableau')}>
                        À suivre & activité
                      </button>
                    </div>
                  )}

                  {(large || (route.page === 'clients' && vueAccueilMobile === 'liste')) && (
                    <Accueil
                      actifId={route.page === 'client' ? route.clientId : undefined}
                      rechargerQuand={`${route.page}-${versionListe}`}
                      onOuvrir={id => naviguer({ page: 'client', clientId: id, rubrique: 'apercu' })}
                      onNouvelleSeance={id => naviguer({ page: 'client', clientId: id, rubrique: 'seance' })}
                      onVueEnsemble={large && route.page === 'client' ? () => naviguer({ page: 'clients' }) : undefined}
                    />
                  )}
                  {route.page === 'client' && (
                    <Profil
                      key={route.clientId}
                      clientId={route.clientId}
                      rubrique={route.rubrique}
                      seanceId={route.seanceId ?? null}
                      onRubrique={(rubrique, seanceId = null) => naviguer({ page: 'client', clientId: route.clientId, rubrique, seanceId })}
                      onRetour={() => {
                        setVersionListe(v => v + 1)
                        naviguer({ page: 'clients' })
                      }}
                      onSaved={m => {
                        setVersionListe(v => v + 1)
                        naviguer({ page: 'client', clientId: route.clientId, rubrique: 'seances' })
                        setBandeau(m ?? '')
                      }}
                    />
                  )}
                  {route.page === 'clients' && (large || vueAccueilMobile === 'tableau') && (
                    <TableauDeBord
                      onOuvrir={id => naviguer({ page: 'client', clientId: id, rubrique: 'apercu' })}
                      onNouvelleSeance={id => naviguer({ page: 'client', clientId: id, rubrique: 'seance' })}
                    />
                  )}
                </div>
              )}

              {route.page === 'exercices' && (
                <>
                  {!large && (
                    <div className="segments segments-mobile" role="group" aria-label="Exercices ou modèles">
                      <button type="button" className={vueExosMobile === 'biblio' ? 'actif' : ''} onClick={() => setVueExosMobile('biblio')}>
                        Bibliothèque
                      </button>
                      <button type="button" className={vueExosMobile === 'modeles' ? 'actif' : ''} onClick={() => setVueExosMobile('modeles')}>
                        Modèles de séance
                      </button>
                    </div>
                  )}
                  <div className="page-exercices">
                    {(large || vueExosMobile === 'biblio') && (
                      <Bibliotheque key={route.recherche ?? ''} rechercheInitiale={route.recherche} />
                    )}
                    {(large || vueExosMobile === 'modeles') && <Modeles />}
                  </div>
                </>
              )}
              {route.page === 'facturation' && <Facturation onOuvrir={id => naviguer({ page: 'client', clientId: id, rubrique: 'apercu' })} />}
              {route.page === 'reglages' && <Reglages />}
            </Suspense>
          </main>
        </div>
        <nav aria-label="Navigation principale">
          {ONGLETS.map(o => (
            <button
              key={o.page}
              className={o.page === onglet ? 'actif' : ''}
              aria-current={o.page === onglet ? 'page' : undefined}
              onClick={() => {
                if (o.page === 'clients') setVueAccueilMobile('liste')
                naviguer({ page: o.page })
              }}
            >
              <Icone nom={o.page} />
              <span>{o.libelle}</span>
            </button>
          ))}
        </nav>
        {palette && (
          <Suspense fallback={null}>
            <Palette
              ouvert={palette}
              onFermer={() => setPalette(false)}
              onClient={id => naviguer({ page: 'client', clientId: id, rubrique: 'apercu' })}
              onSeance={id => naviguer({ page: 'client', clientId: id, rubrique: 'seance' })}
              onExercice={nom => naviguer({ page: 'exercices', recherche: nom })}
              onPage={page => naviguer({ page: page as 'clients' | 'exercices' | 'facturation' | 'reglages' })}
            />
          </Suspense>
        )}
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
      <h1><Logo alt="VDCoach Tracker" /></h1>
      {message && <p className="erreur">{message}</p>}
      <Champ libelle="Email"><input autoComplete="username" type="email" value={email} onChange={e => setEmail(e.target.value)} required /></Champ>
      <Champ libelle="Mot de passe"><input autoComplete="current-password" type="password" value={mdp} onChange={e => setMdp(e.target.value)} required /></Champ>
      {erreur && <p className="erreur">{erreur}</p>}
      <button type="submit">Se connecter</button>
    </form>
  )
}

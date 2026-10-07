import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { seDeconnecter, deconnexionVolontaire } from './deconnexion'
import { MSG_SESSION, messageErreur } from './erreurs'
import Clients from './Clients'
import NouvelleSeance from './NouvelleSeance'
import Historique from './Historique'
import SuiviHub from './SuiviHub'
import Icone from './icones'
import { BandeauReseau, Champ, EcranChargement, NavigationCtx } from './ui'
import Bibliotheque from './Bibliotheque'
import Sauvegarde from './Sauvegarde'
import Modeles from './Modeles'
import { Verification2FA, Securite } from './Auth2FA'

type Onglet = 'seance' | 'historique' | 'suivi' | 'exercices' | 'clients'
const LIBELLES: Record<Onglet, string> = { seance: 'Séance', historique: 'Historique', suivi: 'Suivi', exercices: 'Exercices', clients: 'Clients' }

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [onglet, setOnglet] = useState<Onglet>('seance')
  const [sessionExpiree, setSessionExpiree] = useState(false)
  const [edition, setEdition] = useState<string | null>(null) // id de la séance en cours de modification
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
    history.replaceState({ onglet: 'seance', edition: null }, '')
    const retour = (e: PopStateEvent) => {
      setOnglet((e.state?.onglet as Onglet) ?? 'seance')
      setEdition(e.state?.edition ?? null)
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
  }, [onglet, edition])

  function afficher(o: Onglet, id: string | null = null) {
    setEdition(id)
    setBandeau('')
    setOnglet(o)
    window.scrollTo({ top: 0 })
    history.pushState({ onglet: o, edition: id }, '')
  }

  function aller(o: Onglet) {
    if (o === onglet && !edition) return window.scrollTo({ top: 0, behavior: 'smooth' })
    afficher(o)
  }

  if (session === undefined) return <EcranChargement />
  if (!session) return <Connexion message={sessionExpiree ? MSG_SESSION : ''} />
  if (exige2fa === undefined) return <EcranChargement />
  if (exige2fa) return <Verification2FA onOk={verifierNiveau} />

  return (
    <NavigationCtx.Provider value={o => aller(o as Onglet)}>
    <div className="app">
      <header>
        <h1>VDCoach</h1>
        <button className="lien" onClick={() => seDeconnecter()}>Déconnexion</button>
      </header>
      <BandeauReseau />
      <main tabIndex={-1}>
        {bandeau && <p className="bandeau" onClick={() => setBandeau('')}>{bandeau}</p>}
        {onglet === 'seance' && (
          <NouvelleSeance key={edition ?? 'nouvelle'} seanceId={edition} onSaved={m => { aller('historique'); setBandeau(m ?? '') }} />
        )}
        {onglet === 'historique' && (
          <Historique onEdit={id => afficher('seance', id)} />
        )}
        {onglet === 'suivi' && <SuiviHub />}
        {onglet === 'exercices' && <Bibliotheque />}
        {onglet === 'clients' && (
          <>
            <Clients />
            <Modeles />
            <Sauvegarde />
            <Securite />
          </>
        )}
      </main>
      <nav>
        {(Object.keys(LIBELLES) as Onglet[]).map(o => (
          <button key={o} className={o === onglet ? 'actif' : ''} aria-current={o === onglet ? 'page' : undefined} onClick={() => aller(o)}>
            <Icone nom={o} />
            <span>{LIBELLES[o]}</span>
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

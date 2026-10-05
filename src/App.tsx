import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Clients from './Clients'
import NouvelleSeance from './NouvelleSeance'
import Historique from './Historique'
import Suivi from './Suivi'
import Bibliotheque from './Bibliotheque'
import Sauvegarde from './Sauvegarde'
import Modeles from './Modeles'
import { Verification2FA, Securite } from './Auth2FA'

type Onglet = 'seance' | 'historique' | 'suivi' | 'exercices' | 'clients'
const LIBELLES: Record<Onglet, string> = { seance: 'Séance', historique: 'Historique', suivi: 'Suivi', exercices: 'Exercices', clients: 'Clients' }

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [onglet, setOnglet] = useState<Onglet>('seance')
  const [edition, setEdition] = useState<string | null>(null) // id de la séance en cours de modification
  const [bandeau, setBandeau] = useState('') // message affiché après l'enregistrement (ex. nouveau record)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) => setSession(s))
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

  function aller(o: Onglet) {
    setEdition(null)
    setBandeau('')
    setOnglet(o)
  }

  if (session === undefined) return <p className="centre">Chargement…</p>
  if (!session) return <Connexion />
  if (exige2fa === undefined) return <p className="centre">Chargement…</p>
  if (exige2fa) return <Verification2FA onOk={verifierNiveau} />

  return (
    <div className="app">
      <header>
        <h1>VDCoach</h1>
        <button className="lien" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
      </header>
      <main>
        {bandeau && <p className="bandeau" onClick={() => setBandeau('')}>{bandeau}</p>}
        {onglet === 'seance' && (
          <NouvelleSeance key={edition ?? 'nouvelle'} seanceId={edition} onSaved={m => { aller('historique'); setBandeau(m ?? '') }} />
        )}
        {onglet === 'historique' && (
          <Historique onEdit={id => { setEdition(id); setOnglet('seance') }} />
        )}
        {onglet === 'suivi' && <Suivi />}
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
          <button key={o} className={o === onglet ? 'actif' : ''} onClick={() => aller(o)}>
            {LIBELLES[o]}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Connexion() {
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [erreur, setErreur] = useState('')

  async function connecter(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password: mdp })
    if (error) setErreur(error.code === 'invalid_credentials' ? 'Identifiants incorrects.' : error.message)
  }

  return (
    <form className="connexion" onSubmit={connecter}>
      <h1>VDCoach Tracker</h1>
      <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Mot de passe" value={mdp} onChange={e => setMdp(e.target.value)} required />
      {erreur && <p className="erreur">{erreur}</p>}
      <button type="submit">Se connecter</button>
    </form>
  )
}

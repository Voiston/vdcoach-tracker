import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import Clients from './Clients'
import NouvelleSeance from './NouvelleSeance'
import Historique from './Historique'

type Onglet = 'seance' | 'historique' | 'clients'
const LIBELLES: Record<Onglet, string> = { seance: 'Séance', historique: 'Historique', clients: 'Clients' }

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [onglet, setOnglet] = useState<Onglet>('seance')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_evenement, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p className="centre">Chargement…</p>
  if (!session) return <Connexion />

  return (
    <div className="app">
      <header>
        <h1>VDCoach</h1>
        <button className="lien" onClick={() => supabase.auth.signOut()}>Déconnexion</button>
      </header>
      <main>
        {onglet === 'seance' && <NouvelleSeance onSaved={() => setOnglet('historique')} />}
        {onglet === 'historique' && <Historique />}
        {onglet === 'clients' && <Clients />}
      </main>
      <nav>
        {(Object.keys(LIBELLES) as Onglet[]).map(o => (
          <button key={o} className={o === onglet ? 'actif' : ''} onClick={() => setOnglet(o)}>
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
    if (error) setErreur('Identifiants incorrects.')
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

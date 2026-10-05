import { useEffect, useState } from 'react'
import { supabase } from './supabase'

// Écran affiché à la connexion quand la double authentification est activée.
export function Verification2FA({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState('')
  const [erreur, setErreur] = useState('')

  async function valider(e: React.FormEvent) {
    e.preventDefault()
    const { data, error } = await supabase.auth.mfa.listFactors()
    const facteur = data?.totp[0]
    if (error || !facteur) return setErreur(error?.message ?? 'Aucun facteur trouvé.')
    const { error: erreurCode } = await supabase.auth.mfa.challengeAndVerify({ factorId: facteur.id, code: code.trim() })
    if (erreurCode) return setErreur('Code incorrect ou expiré.')
    onOk()
  }

  return (
    <form className="connexion" onSubmit={valider}>
      <h1>Vérification en deux étapes</h1>
      <p className="meta">Saisis le code à 6 chiffres de ton application d'authentification.</p>
      <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value)} required />
      {erreur && <p className="erreur">{erreur}</p>}
      <button type="submit">Valider</button>
      <button type="button" className="lien" onClick={() => supabase.auth.signOut()}>Annuler</button>
    </form>
  )
}

// Section d'activation / désactivation de la double authentification.
export function Securite() {
  const [facteur, setFacteur] = useState<{ id: string } | null | undefined>(undefined)
  const [enrol, setEnrol] = useState<{ id: string; qr: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  async function charger() {
    const { data } = await supabase.auth.mfa.listFactors()
    setFacteur(data?.totp[0] ?? null)
  }

  useEffect(() => {
    charger()
  }, [])

  async function activer() {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `VDCoach ${Date.now()}` })
    if (error) return setMessage(error.message)
    setMessage('')
    setEnrol({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
  }

  async function confirmer(e: React.FormEvent) {
    e.preventDefault()
    if (!enrol) return
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrol.id, code: code.trim() })
    if (error) return setMessage('Code incorrect ou expiré.')
    setEnrol(null)
    setCode('')
    setMessage('Double authentification activée.')
    charger()
  }

  async function desactiver() {
    if (!facteur || !window.confirm('Désactiver la double authentification ?')) return
    const { error } = await supabase.auth.mfa.unenroll({ factorId: facteur.id })
    if (error) return setMessage(error.message)
    setMessage('Double authentification désactivée.')
    charger()
  }

  return (
    <section>
      <h3>Sécurité</h3>
      {facteur && (
        <>
          <p className="meta">Double authentification : activée.</p>
          <button type="button" className="secondaire" onClick={desactiver}>Désactiver</button>
        </>
      )}
      {facteur === null && !enrol && (
        <button type="button" onClick={activer}>Activer la double authentification</button>
      )}
      {facteur === null && enrol && (
        <form onSubmit={confirmer}>
          <img src={enrol.qr} alt="QR code à scanner" width={200} height={200} />
          <p className="meta">
            Scanne ce QR code avec une application d'authentification (Google Authenticator, Aegis, 2FAS…).
            Note aussi cette clé dans un endroit sûr, elle te permettra de retrouver l'accès si tu perds ton téléphone : <code>{enrol.secret}</code>
          </p>
          <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Code à 6 chiffres" value={code} onChange={e => setCode(e.target.value)} required />
          <button type="submit">Confirmer et activer</button>
        </form>
      )}
      {message && <p className="meta">{message}</p>}
    </section>
  )
}

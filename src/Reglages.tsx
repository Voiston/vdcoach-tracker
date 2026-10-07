import Sauvegarde from './Sauvegarde'
import { Securite } from './Auth2FA'
import { seDeconnecter } from './deconnexion'

export default function Reglages() {
  return (
    <section>
      <h2>Réglages</h2>
      <Sauvegarde />
      <Securite />
      <h3>Session</h3>
      <button type="button" className="secondaire" onClick={() => seDeconnecter()}>Se déconnecter</button>
    </section>
  )
}

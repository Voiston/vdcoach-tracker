import { supabase } from './supabase'
import { effacerTousBrouillons } from './brouillon'
import { viderSuppressionsEnAttente } from './ui'

// Permet de distinguer une déconnexion voulue d'une session expirée.
const CLE = 'vdcoach_deconnexion_volontaire'

export async function seDeconnecter() {
  sessionStorage.setItem(CLE, '1')
  effacerTousBrouillons()
  await viderSuppressionsEnAttente()
  return supabase.auth.signOut()
}

export function deconnexionVolontaire() {
  const v = sessionStorage.getItem(CLE) === '1'
  sessionStorage.removeItem(CLE)
  return v
}

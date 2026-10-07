import { supabase } from './supabase'
import { effacerBrouillon } from './brouillon'

// Permet de distinguer une déconnexion voulue d'une session expirée.
const CLE = 'vdcoach_deconnexion_volontaire'

export function seDeconnecter() {
  sessionStorage.setItem(CLE, '1')
  effacerBrouillon()
  return supabase.auth.signOut()
}

export function deconnexionVolontaire() {
  const v = sessionStorage.getItem(CLE) === '1'
  sessionStorage.removeItem(CLE)
  return v
}

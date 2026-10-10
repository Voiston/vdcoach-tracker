import { supabase } from './supabase'

export type ClientFact = { id: string; prenom: string; nom: string | null; actif: boolean; groupe_facturation: string | null }
export type LigneSeance = { id: string; client_id: string; date_seance: string; session_id: string | null }
export type SeanceReelle = { cle: string; date: string; participants: string[] } // participants : identifiants de clients
export type Entite = { cle: string; nom: string; membres: ClientFact[]; seances: SeanceReelle[] }

export const libelleFormat = (n: number) => (n === 1 ? 'solo' : n === 2 ? 'duo' : n === 3 ? 'trio' : `groupe de ${n}`)

/* ---------- Mois ('AAAA-MM') ---------- */
export const moisCourant = () => new Date().toLocaleDateString('sv-SE').slice(0, 7)

export function decalerMois(mois: string, delta: number) {
  const [a, m] = mois.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const bornesMois = (mois: string) => ({ debut: `${mois}-01`, fin: `${decalerMois(mois, 1)}-01` })
export const libelleMois = (mois: string) => new Date(`${mois}-01T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

/* ---------- Calculs ---------- */

// Une séance partagée existe en plusieurs lignes (une par participant, même session_id) : elle ne compte qu'une fois.
export function regrouperSeances(lignes: LigneSeance[]): SeanceReelle[] {
  const par = new Map<string, SeanceReelle>()
  for (const l of lignes) {
    const cle = l.session_id ?? l.id
    const s = par.get(cle) ?? { cle, date: l.date_seance, participants: [] }
    if (!s.participants.includes(l.client_id)) s.participants.push(l.client_id)
    par.set(cle, s)
  }
  return [...par.values()].sort((a, b) => a.date.localeCompare(b.date))
}

export const nomEntite = (membres: ClientFact[]) =>
  membres.length === 1 ? `${membres[0].prenom} ${membres[0].nom ?? ''}`.trim() : membres.map(m => m.prenom).join(' & ')

// Une « entité » est ce qui reçoit une facture : un client seul, ou un groupe (couple, trio).
export function calculerFacturation(clients: ClientFact[], lignes: LigneSeance[]): Entite[] {
  const par = new Map(clients.map(c => [c.id, c]))
  const cleEntite = (c: ClientFact) => c.groupe_facturation ?? c.id
  const entites = new Map<string, Entite>()
  for (const s of regrouperSeances(lignes)) {
    const cles = new Set<string>()
    for (const id of s.participants) {
      const c = par.get(id)
      if (c) cles.add(cleEntite(c))
    }
    for (const cle of cles) {
      let e = entites.get(cle)
      if (!e) {
        const membres = clients.filter(c => cleEntite(c) === cle)
        e = { cle, membres, nom: nomEntite(membres), seances: [] }
        entites.set(cle, e)
      }
      e.seances.push(s)
    }
  }
  return [...entites.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

// Répartition par format : « 5 duo · 2 solo (Marc) · 1 trio ». Dans un groupe, un solo précise qui était présent.
export function formats(e: Entite) {
  const prenom = new Map(e.membres.map(m => [m.id, m.prenom]))
  const comptes = new Map<string, number>()
  for (const s of e.seances) {
    const n = s.participants.length
    const lib = n === 1 && e.membres.length > 1 ? `solo (${prenom.get(s.participants[0]) ?? '?'})` : libelleFormat(n)
    comptes.set(lib, (comptes.get(lib) ?? 0) + 1)
  }
  return [...comptes.entries()].map(([texte, compte]) => ({ texte, compte })).sort((a, b) => b.compte - a.compte || a.texte.localeCompare(b.texte, 'fr'))
}

export const detailFormats = (e: Entite) => formats(e).map(f => `${f.compte} ${f.texte}`).join(' · ')

/* ---------- Compteur affiché dans le profil et après l'enregistrement d'une séance ---------- */
// Nombre de séances du mois pour ce client ; s'il est facturé en groupe, on compte celles du groupe (une séance partagée = 1).
export async function resumeMois(
  client: { id: string; prenom: string; groupe_facturation: string | null },
  mois = moisCourant(),
): Promise<{ n: number; avec: string[]; mois: string } | null> {
  let membres: { id: string; prenom: string }[] = [{ id: client.id, prenom: client.prenom }]
  if (client.groupe_facturation) {
    const { data, error } = await supabase.from('clients').select('id, prenom').eq('groupe_facturation', client.groupe_facturation)
    if (error) return null
    if (data?.length) membres = data
  }
  const { debut, fin } = bornesMois(mois)
  const { data, error } = await supabase
    .from('seances')
    .select('id, session_id')
    .in('client_id', membres.map(m => m.id))
    .gte('date_seance', debut)
    .lt('date_seance', fin)
  if (error) return null
  return { n: new Set((data ?? []).map(s => s.session_id ?? s.id)).size, avec: membres.filter(m => m.id !== client.id).map(m => m.prenom), mois }
}

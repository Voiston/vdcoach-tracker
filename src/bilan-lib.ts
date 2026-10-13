import { TESTS, TYPES } from './definitions'
import { bornesMois, libelleMois } from './facturation-lib'
import { etatObjectif, libelle, unite, valeurActuelle, type DonneesObjectifs } from './objectifs-lib'

export type SeanceCharges = { date_seance: string; exercices: { nom: string; charge_kg: number | null }[] }
export type MesureBilan = { type: string; valeur: number; date_mesure: string }

const nb = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',')
const puces = (lignes: string[]) => lignes.map(l => `• ${l}`).join('\n')

// Récapitulatif d'un mois pour un client, en texte brut prêt à coller dans un message.
// Les rubriques vides sont omises ; seul le nombre de séances est toujours indiqué.
export function construireBilan(e: { prenom: string; mois: string; seances: SeanceCharges[]; mesures: MesureBilan[]; objectifs?: DonneesObjectifs }): string {
  const { debut, fin } = bornesMois(e.mois)
  const dansMois = (date: string) => date >= debut && date < fin

  // Records : meilleure charge du mois supérieure à tout ce qui précède (un premier passage n'est pas un record)
  const avant = new Map<string, number>()
  const duMois = new Map<string, { nom: string; charge: number }>()
  for (const s of e.seances)
    for (const x of s.exercices) {
      if (x.charge_kg === null) continue
      const cle = x.nom.trim().toLowerCase()
      const charge = Number(x.charge_kg)
      if (s.date_seance < debut) avant.set(cle, Math.max(avant.get(cle) ?? 0, charge))
      else if (dansMois(s.date_seance) && charge > (duMois.get(cle)?.charge ?? -1)) duMois.set(cle, { nom: x.nom.trim(), charge })
    }
  const records = [...duMois.entries()].flatMap(([cle, m]) => {
    const precedent = avant.get(cle)
    return precedent !== undefined && m.charge > precedent ? [`${m.nom} ${nb(m.charge)} kg (avant : ${nb(precedent)} kg)`] : []
  })

  // Mesures et tests : dernière valeur du mois comparée à la dernière valeur d'avant le mois
  // (à défaut, à la première valeur du mois s'il y en a plusieurs)
  const evolutions = Object.entries({ ...TYPES, ...TESTS }).flatMap(([type, def]) => {
    const valeurs = e.mesures.filter(m => m.type === type)
    const ceMois = valeurs.filter(m => dansMois(m.date_mesure))
    if (!ceMois.length) return []
    const arrivee = Number(ceMois[ceMois.length - 1].valeur)
    const precedente = valeurs.filter(m => m.date_mesure < debut).at(-1)
    const depart = precedente ? Number(precedente.valeur) : ceMois.length > 1 ? Number(ceMois[0].valeur) : null
    if (depart === null) return [`${def.label} : ${nb(arrivee)} ${def.unite}`]
    const ecart = Math.round((arrivee - depart) * 10) / 10
    const texteEcart = ecart === 0 ? 'stable' : `${ecart > 0 ? '+' : '−'}${nb(Math.abs(ecart))} ${def.unite}`
    return [`${def.label} : ${nb(depart)} → ${nb(arrivee)} ${def.unite} (${texteEcart})`]
  })

  // Objectifs chiffrés encore en cours (état actuel, pas celui de la fin du mois)
  const objectifs = (e.objectifs?.objectifs ?? []).flatMap(o => {
    const actuelle = valeurActuelle(e.objectifs!, o.source, o.reference)
    const { pct, atteint } = etatObjectif(o, actuelle)
    if (atteint) return []
    return [`${libelle(o.source, o.reference)} : ${nb(Number(o.valeur_depart))} → ${actuelle === null ? '?' : nb(actuelle)} → ${nb(Number(o.valeur_cible))} ${unite(o.source, o.reference)} (${Math.round(pct)} %)`]
  })

  const nbSeances = e.seances.filter(s => dansMois(s.date_seance)).length
  const blocs = [`Bilan de ${e.prenom} — ${libelleMois(e.mois)}\nSéances : ${nbSeances}`]
  if (records.length) blocs.push(`🏆 Records :\n${puces(records)}`)
  if (evolutions.length) blocs.push(`Mesures :\n${puces(evolutions)}`)
  if (objectifs.length) blocs.push(`🎯 Objectifs en cours :\n${puces(objectifs)}`)
  return blocs.join('\n\n')
}

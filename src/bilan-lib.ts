import { TESTS, TYPES } from './definitions'
import { nb } from './format'
import { bornesMois, libelleMois } from './facturation-lib'
import { etatObjectif, libelle, unite, valeurActuelle, type DonneesObjectifs } from './objectifs-lib'

export type SeanceCharges = { date_seance: string; exercices: { nom: string; series?: number | null; charge_kg: number | null }[] }
export type MesureBilan = { type: string; valeur: number; date_mesure: string }

export type Bilan = {
  prenom: string
  mois: string
  nbSeances: number
  records: { exercice: string; avant: number; charge: number }[]
  evolutions: { label: string; depart: number | null; arrivee: number; ecart: number | null; unite: string }[]
  objectifs: { label: string; depart: number; actuelle: number | null; cible: number; unite: string; pct: number }[]
}

const puces = (lignes: string[]) => lignes.map(l => `• ${l}`).join('\n')

// Calcule les données structurées du bilan mensuel (utilisées à la fois pour le PDF et pour le message texte).
export function calculerBilan(e: { prenom: string; mois: string; seances: SeanceCharges[]; mesures: MesureBilan[]; objectifs?: DonneesObjectifs }): Bilan {
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
    return precedent !== undefined && m.charge > precedent ? [{ exercice: m.nom, avant: precedent, charge: m.charge }] : []
  })

  // Mesures et tests : dernière valeur du mois comparée à la dernière valeur d'avant le mois
  const evolutions = Object.entries({ ...TYPES, ...TESTS }).flatMap(([type, def]) => {
    const valeurs = e.mesures.filter(m => m.type === type)
    const ceMois = valeurs.filter(m => dansMois(m.date_mesure))
    if (!ceMois.length) return []
    const arrivee = Number(ceMois[ceMois.length - 1].valeur)
    const precedente = valeurs.filter(m => m.date_mesure < debut).at(-1)
    const depart = precedente ? Number(precedente.valeur) : ceMois.length > 1 ? Number(ceMois[0].valeur) : null
    const ecart = depart === null ? null : Math.round((arrivee - depart) * 10) / 10
    return [{ label: def.label, depart, arrivee, ecart, unite: def.unite }]
  })

  // Objectifs chiffrés encore en cours
  const objectifs = (e.objectifs?.objectifs ?? []).flatMap(o => {
    const actuelle = valeurActuelle(e.objectifs!, o.source, o.reference)
    const { pct, atteint } = etatObjectif(o, actuelle)
    if (atteint) return []
    return [{
      label: libelle(o.source, o.reference),
      depart: Number(o.valeur_depart),
      actuelle,
      cible: Number(o.valeur_cible),
      unite: unite(o.source, o.reference),
      pct: Math.round(pct),
    }]
  })

  const nbSeances = e.seances.filter(s => dansMois(s.date_seance)).length
  return { prenom: e.prenom, mois: e.mois, nbSeances, records, evolutions, objectifs }
}

// Récapitulatif d'un mois pour un client, en texte brut prêt à coller dans un message.
export function construireBilan(e: { prenom: string; mois: string; seances: SeanceCharges[]; mesures: MesureBilan[]; objectifs?: DonneesObjectifs }): string {
  const b = calculerBilan(e)
  const blocs = [`Bilan de ${b.prenom} — ${libelleMois(b.mois)}\nSéances : ${b.nbSeances}`]

  if (b.records.length) {
    blocs.push(`🏆 Records :\n${puces(b.records.map(r => `${r.exercice} ${nb(r.charge)} kg (avant :${nb(r.avant)} kg)`))}`)
  }
  if (b.evolutions.length) {
    blocs.push(
      `Mesures :\n${puces(
        b.evolutions.map(m => {
          if (m.depart === null || m.ecart === null) return `${m.label} : ${nb(m.arrivee)}${m.unite}`
          const texteEcart = m.ecart === 0 ? 'stable' : `${m.ecart > 0 ? '+' : '−'}${nb(Math.abs(m.ecart))}${m.unite}`
          return `${m.label} : ${nb(m.depart)} →${nb(m.arrivee)} ${m.unite} (${texteEcart})`
        }),
      )}`,
    )
  }
  if (b.objectifs.length) {
    blocs.push(
      `🎯 Objectifs en cours :\n${puces(
        b.objectifs.map(o => `${o.label} :${nb(o.depart)} → ${o.actuelle === null ? '?' : nb(o.actuelle)} → ${nb(o.cible)} ${o.unite} (${o.pct} %)`),
      )}`,
    )
  }
  return blocs.join('\n\n')
}
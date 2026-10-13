import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { REGLES, verifier } from './validation'
import { messageErreur } from './erreurs'
import { aujourdhui, dateLocale, resumeCardio } from './format'
import { libelleMois, resumeMois } from './facturation-lib'
import { ecrireBrouillon, effacerBrouillon, lireBrouillon } from './brouillon'
import { Champ, Compteur, FeuilleSaisie, MessageErreur, useClient, useNotifier } from './ui'
import SelecteurExercice, { normaliser, type ExoChoix } from './SelecteurExercice'

type Ligne = { nom: string; series: string; repetitions: string; charge_kg: string; duree_min: string; distance_km: string }
type Exo = { id: string; ordre: number; nom: string; series: number | null; repetitions: number | null; charge_kg: number | null; duree_min: number | null; distance_km: number | null }

const vide = (): Ligne => ({ nom: '', series: '', repetitions: '', charge_kg: '', duree_min: '', distance_km: '' })
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))
const txt = (n: number | null) => (n === null ? '' : String(n))
const versLignes = (exos: Exo[]): Ligne[] =>
  exos.length
    ? [...exos]
        .sort((a, b) => a.ordre - b.ordre)
        .map(x => ({ nom: x.nom, series: txt(x.series), repetitions: txt(x.repetitions), charge_kg: txt(x.charge_kg), duree_min: txt(x.duree_min), distance_km: txt(x.distance_km) }))
    : [vide()]

const EXOS = 'exercices(id, ordre, nom, series, repetitions, charge_kg, duree_min, distance_km)'
const PLAFOND_REPS = 12
const PAS_KG = 2.5

type Dernier = { date: string; series: number | null; repetitions: number | null; charge_kg: number | null; duree_min: number | null; distance_km: number | null }
const cle = (nom: string) => nom.trim().toLowerCase()
const echapper = (nom: string) => nom.replace(/[\\%_]/g, '\\$&')

function suggestion(d: Dernier): string {
  if (d.repetitions === null) return ''
  if (d.charge_kg !== null && d.repetitions >= PLAFOND_REPS) return `essaie ${+(Number(d.charge_kg) + PAS_KG).toFixed(2)} kg`
  return `vise ${d.repetitions + 1} répétitions${d.charge_kg !== null ? ` à ${d.charge_kg} kg` : ''}`
}

function proposition(d: Dernier) {
  if (d.repetitions === null) return null
  if (d.charge_kg !== null && d.repetitions >= PLAFOND_REPS) return { repetitions: d.repetitions, charge_kg: Number(d.charge_kg) + PAS_KG }
  return { repetitions: d.repetitions + 1, charge_kg: d.charge_kg }
}

function DerniereFois({ d, cardio }: { d: Dernier; cardio: boolean }) {
  const date = dateLocale(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  if (cardio) return <p className="meta">Dernière fois ({date}) : {resumeCardio(d) || '?'}</p>
  const conseil = suggestion(d)
  return (
    <p className="meta">
      Dernière fois ({date}) : {d.series ?? '?'}×{d.repetitions ?? '?'}
      {d.charge_kg !== null ? ` à ${d.charge_kg} kg` : ''}
      {conseil ? ` · ${conseil}` : ''}
    </p>
  )
}

type Fiche = { nom: string; notes: string | null; video_url: string | null; groupe?: string; materiel?: string; exercice_muscles?: { muscle: string; coefficient: number }[] }

function FicheExercice({ b }: { b: Fiche }) {
  const lien = b.video_url && /^https?:\/\//i.test(b.video_url) ? b.video_url : null
  if (!b.notes && !lien) return null
  return (
    <p className="meta">
      {b.notes}
      {b.notes && lien ? ' · ' : ''}
      {lien && <a href={lien} target="_blank" rel="noopener noreferrer">Vidéo</a>}
    </p>
  )
}

export default function NouvelleSeance({ seanceId, onSaved }: { seanceId: string | null; onSaved: (message?: string) => void }) {
  const client = useClient()
  const clientId = client.id
  const notifier = useNotifier()
  const [feuilleModele, setFeuilleModele] = useState(false)
  const [choix, setChoix] = useState<number | null>(null)
  const [brouillon, setBrouillon] = useState(() => (seanceId ? null : lireBrouillon(clientId)))
  const [date, setDate] = useState(aujourdhui())
  const [duree, setDuree] = useState('')
  const [ressenti, setRessenti] = useState('')
  const [notes, setNotes] = useState('')
  const [lignes, setLignes] = useState<Ligne[]>([vide()])
  const [anciens, setAnciens] = useState<string[]>([])
  const [noms, setNoms] = useState<string[]>([])
  const [modeles, setModeles] = useState<{ id: string; nom: string }[]>([])
  const [derniers, setDerniers] = useState<Record<string, Dernier>>({})
  const [biblio, setBiblio] = useState<Record<string, Fiche>>({})
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [autres, setAutres] = useState<{ id: string; prenom: string; nom: string | null; groupe_facturation: string | null }[]>([])
  const [invites, setInvites] = useState<string[]>([])
  const [copierCharges, setCopierCharges] = useState(false)

  const estCardio = (nom: string) => biblio[cle(nom)]?.groupe === 'Cardio'
  const valeurs = (l: Ligne) =>
    estCardio(l.nom)
      ? { series: null, repetitions: null, charge_kg: null, duree_min: num(l.duree_min), distance_km: num(l.distance_km) }
      : { series: num(l.series), repetitions: num(l.repetitions), charge_kg: num(l.charge_kg), duree_min: null, distance_km: null }

  useEffect(() => {
    if (seanceId) return
    supabase.from('clients').select('id, prenom, nom, groupe_facturation').eq('actif', true).neq('id', clientId).order('prenom').then(({ data }) => setAutres(data ?? []))
  }, [seanceId, clientId])

  useEffect(() => {
    supabase
      .from('exercices')
      .select('nom')
      .limit(1000)
      .then(({ data }) => setNoms([...new Set((data ?? []).map(x => x.nom as string))].sort()))

    if (seanceId) {
      supabase
        .from('seances')
        .select(`client_id, date_seance, duree_min, ressenti, notes, ${EXOS}`)
        .eq('id', seanceId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) return setErreur(error ? messageErreur(error) : 'Séance introuvable.')
          setDate(data.date_seance)
          setDuree(txt(data.duree_min))
          setRessenti(txt(data.ressenti))
          setNotes(data.notes ?? '')
          setLignes(versLignes(data.exercices as Exo[]))
          setAnciens((data.exercices as Exo[]).map(x => x.id))
        })
    }
  }, [seanceId])

  useEffect(() => {
    supabase.from('modeles').select('id, nom').order('nom').then(({ data }) => setModeles(data ?? []))
  }, [])

  async function appliquerModele(id: string) {
    if (!id) return
    const { data, error } = await supabase
      .from('modeles')
      .select('duree_min, modele_exercices(id, ordre, nom, series, repetitions, charge_kg, duree_min, distance_km)')
      .eq('id', id)
      .single()
    if (error || !data) return setErreur(error ? messageErreur(error) : 'Modèle introuvable.')
    setLignes(versLignes(data.modele_exercices as Exo[]))
    if (data.duree_min) setDuree(txt(data.duree_min))
    setErreur('')
  }

  async function enregistrerModele(nom: string): Promise<string | undefined> {
    const exos = lignes.filter(l => l.nom.trim())
    if (!exos.length) return 'Ajoute au moins un exercice pour créer un modèle.'
    const { data, error } = await supabase.from('modeles').insert({ nom, duree_min: num(duree) }).select('id, nom').single()
    if (error) return messageErreur(error)
    const { error: erreurExos } = await supabase.from('modele_exercices').insert(
      exos.map((l, i) => ({
        modele_id: data.id,
        ordre: i,
        nom: l.nom.trim(),
        ...valeurs(l),
      })),
    )
    if (erreurExos) {
      await supabase.from('modeles').delete().eq('id', data.id)
      return messageErreur(erreurExos)
    }
    setModeles(m => [...m, data].sort((a, b) => a.nom.localeCompare(b.nom)))
    notifier(`Modèle « ${nom} » enregistré`)
  }

  useEffect(() => {
    supabase
      .from('bibliotheque_exercices')
      .select('nom, notes, video_url, groupe, materiel, exercice_muscles(muscle, coefficient)')
      .then(({ data }) => setBiblio(Object.fromEntries((data ?? []).map(x => [cle(x.nom), x as Fiche]))))
  }, [])

  useEffect(() => {
    if (!clientId) return
    supabase
      .from('seances')
      .select('id, date_seance, exercices(nom, series, repetitions, charge_kg, duree_min, distance_km)')
      .eq('client_id', clientId)
      .lte('date_seance', date)
      .order('date_seance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const m: Record<string, Dernier> = {}
        for (const s of data ?? []) {
          if (s.id === seanceId) continue
          for (const x of s.exercices as any[]) {
            const k = cle(x.nom)
            if (!m[k]) m[k] = { date: s.date_seance, series: x.series, repetitions: x.repetitions, charge_kg: x.charge_kg, duree_min: x.duree_min, distance_km: x.distance_km }
          }
        }
        setDerniers(m)
      })
  }, [clientId, seanceId, date])

  // Parallélise la vérification des records sur tous les exercices de la séance
  async function detecterRecords(): Promise<string[]> {
    const vus = new Set<string>()
    const candidats = lignes.flatMap(l => {
      const charge = valeurs(l).charge_kg
      const k = cle(l.nom)
      if (!k || charge === null || vus.has(k)) return []
      vus.add(k)
      return [{ nom: l.nom.trim(), charge }]
    })

    const resultats = await Promise.all(
      candidats.map(async ({ nom, charge }) => {
        let q = supabase
          .from('exercices')
          .select('charge_kg, seances!inner(client_id)')
          .eq('seances.client_id', clientId)
          .ilike('nom', echapper(nom))
          .not('charge_kg', 'is', null)
        if (seanceId) q = q.neq('seance_id', seanceId)
        const { data } = await q.order('charge_kg', { ascending: false }).limit(1)
        const precedent = data?.[0]?.charge_kg
        return precedent != null && charge > Number(precedent) ? `${nom} ${charge} kg (avant : ${precedent} kg)` : null
      }),
    )
    return resultats.filter((r): r is string => r !== null)
  }

  useEffect(() => {
    if (seanceId || brouillon || !clientId) return
    const contenu = duree.trim() || ressenti.trim() || notes.trim() || lignes.some(l => l.nom.trim())
    if (!contenu) return
    const minuteur = setTimeout(() => ecrireBrouillon({ clientId, date, duree, ressenti, notes, lignes }), 600)
    return () => clearTimeout(minuteur)
  }, [seanceId, brouillon, clientId, date, duree, ressenti, notes, lignes])

  function reprendreBrouillon() {
    if (!brouillon) return
    setDate(brouillon.date)
    setDuree(brouillon.duree)
    setRessenti(brouillon.ressenti)
    setNotes(brouillon.notes)
    setLignes(brouillon.lignes.length ? brouillon.lignes.map(l => ({ ...vide(), ...l })) : [vide()])
    setBrouillon(null)
  }

  function abandonnerBrouillon() {
    effacerBrouillon(clientId)
    setBrouillon(null)
  }

  function ouvrirNouveau() {
    const derniere = lignes.length - 1
    const reutilise = derniere >= 0 && !lignes[derniere].nom.trim()
    if (!reutilise) setLignes(l => [...l, vide()])
    setChoix(reutilise ? derniere : lignes.length)
  }

  function choisirExercice(nom: string) {
    const i = choix
    if (i === null) return
    setLignes(l => l.map((x, j) => (j === i ? { ...x, nom } : x)))
    setChoix(null)
  }

  function fermerSelecteur() {
    if (choix !== null && !lignes[choix]?.nom.trim() && lignes.length > 1) setLignes(l => l.filter((_, j) => j !== choix))
    setChoix(null)
  }

  function retirer(i: number) {
    setLignes(l => (l.length > 1 ? l.filter((_, j) => j !== i) : [vide()]))
  }

  function copierDerniere(i: number) {
    const d = derniers[cle(lignes[i].nom)]
    if (!d) return
    setLignes(l => l.map((x, j) => (j === i ? { ...x, series: txt(d.series), repetitions: txt(d.repetitions), charge_kg: txt(d.charge_kg), duree_min: txt(d.duree_min), distance_km: txt(d.distance_km) } : x)))
  }

  function progresser(i: number) {
    const d = derniers[cle(lignes[i].nom)]
    const p = d && proposition(d)
    if (!d || !p) return
    setLignes(l => l.map((x, j) => (j === i ? { ...x, series: txt(d.series), repetitions: txt(p.repetitions), charge_kg: txt(p.charge_kg) } : x)))
  }

  function maj(i: number, champ: keyof Ligne, valeur: string) {
    setLignes(l => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))
  }

  async function reprendre() {
    const { data, error } = await supabase
      .from('seances')
      .select(`duree_min, ${EXOS}`)
      .eq('client_id', clientId)
      .order('date_seance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
    if (error) return setErreur(messageErreur(error))
    if (!data?.length) return setErreur('Aucune séance précédente pour ce client.')
    setLignes(versLignes(data[0].exercices as Exo[]))
    setDuree(txt(data[0].duree_min))
    setErreur('')
  }

  function echec(message: string) {
    setErreur(message)
    setEnvoi(false)
  }

  const prenomDe = (id: string) => autres.find(c => c.id === id)?.prenom ?? 'client'

  async function creerSeancesPartagees(sessionId: string, exos: { ordre: number; nom: string; series: number | null; repetitions: number | null; charge_kg: number | null; duree_min: number | null; distance_km: number | null }[]): Promise<string[]> {
    const echecNoms = invites.map(prenomDe)
    const { data, error } = await supabase
      .from('seances')
      .insert(invites.map(cid => ({ client_id: cid, date_seance: date, duree_min: num(duree), session_id: sessionId })))
      .select('id, client_id')
    if (error || !data) return echecNoms
    const lignesExos = data.flatMap(s => exos.map(x => ({ seance_id: s.id, ordre: x.ordre, nom: x.nom, series: x.series, repetitions: x.repetitions, charge_kg: copierCharges ? x.charge_kg : null, duree_min: x.duree_min, distance_km: x.distance_km })))
    if (lignesExos.length) {
      const { error: erreurExos } = await supabase.from('exercices').insert(lignesExos)
      if (erreurExos) {
        await supabase.from('seances').delete().in('id', data.map(s => s.id))
        return echecNoms
      }
    }
    return []
  }

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur('')
    const records = await detecterRecords()

    const sessionId = !seanceId && invites.length ? crypto.randomUUID() : null
    const champs = { client_id: clientId, date_seance: date, duree_min: num(duree), ressenti: num(ressenti), notes: notes.trim() || null, ...(sessionId ? { session_id: sessionId } : {}) }
    let id = seanceId
    if (id) {
      const { error } = await supabase.from('seances').update(champs).eq('id', id)
      if (error) return echec(messageErreur(error))
    } else {
      const { data, error } = await supabase.from('seances').insert(champs).select('id').single()
      if (error) return echec(messageErreur(error))
      id = data.id as string
    }

    const exercices = lignes
      .filter(l => l.nom.trim())
      .map((l, i) => ({
        seance_id: id,
        ordre: i,
        nom: l.nom.trim(),
        ...valeurs(l),
      }))

    let nouveauxIds: string[] = []
    if (exercices.length) {
      const { data: crees, error } = await supabase.from('exercices').insert(exercices).select('id')
      if (error) {
        if (!seanceId) await supabase.from('seances').delete().eq('id', id)
        return echec(messageErreur(error))
      }
      nouveauxIds = (crees ?? []).map(x => x.id as string)
    }
    if (anciens.length) {
      const { error } = await supabase.from('exercices').delete().in('id', anciens)
      if (error) {
        if (nouveauxIds.length) await supabase.from('exercices').delete().in('id', nouveauxIds)
        return echec(messageErreur(error))
      }
    }

    const absents = sessionId ? await creerSeancesPartagees(sessionId, exercices) : []
    setEnvoi(false)
    if (!seanceId) effacerBrouillon(clientId)
    if (seanceId) {
      notifier('Séance modifiée')
    } else {
      const r = await resumeMois(client)
      const base = invites.length ? `Séance enregistrée pour ${[client.prenom, ...invites.map(prenomDe)].join(' & ')}` : 'Séance enregistrée'
      notifier(r ? `${base} · ${r.n} séance${r.n > 1 ? 's' : ''} en ${libelleMois(r.mois)}` : base)
      if (absents.length) notifier(`Pas enregistrée pour : ${absents.join(', ')}. Ajoute-la depuis leur profil.`)
    }
    onSaved(records.length ? `🏆 ${records.length > 1 ? 'Nouveaux records' : 'Nouveau record'} : ${records.join(' · ')}` : undefined)
  }

  const choixExercices: ExoChoix[] = [
    ...Object.values(biblio).map(b => ({ nom: b.nom, groupe: b.groupe, materiel: b.materiel, muscles: b.exercice_muscles ?? [] })),
    ...[...new Map(noms.filter(n => !biblio[cle(n)]).map(n => [cle(n), n])).values()].map(n => ({ nom: n, muscles: [] })),
  ]
  const faits = new Set(Object.keys(derniers).map(normaliser))
  const saisis = lignes.filter(l => l.nom.trim())
  const nbSeries = saisis.reduce((total, l) => {
    const n = valeurs(l).series
    return total + (n && !Number.isNaN(n) ? n : 0)
  }, 0)
  const partenaires = autres.filter(c => client.groupe_facturation && c.groupe_facturation === client.groupe_facturation)
  const puces = [...partenaires, ...(invites.filter(id => !partenaires.some(p => p.id === id)).map(id => autres.find(c => c.id === id)).filter(Boolean) as typeof autres)]
  const basculerInvite = (id: string) => setInvites(l => (l.includes(id) ? l.filter(x => x !== id) : [...l, id]))
  const invalide =
    verifier(duree, REGLES.duree) ||
    verifier(ressenti, REGLES.ressenti) ||
    lignes.some(l =>
      estCardio(l.nom)
        ? verifier(l.duree_min, REGLES.duree) || verifier(l.distance_km, REGLES.distance)
        : verifier(l.series, REGLES.series) || verifier(l.repetitions, REGLES.repetitions) || verifier(l.charge_kg, REGLES.charge),
    )

  return (
    <>
      <form onSubmit={enregistrer}>
        <h3 className="titre-seance">{seanceId ? 'Modifier la séance' : 'Nouvelle séance'}</h3>
        {brouillon && (
          <div className="brouillon" role="status">
            <p>
              <strong>Séance en cours retrouvée</strong>
              {' '}(enregistrée le {new Date(brouillon.enregistreLe).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}).
            </p>
            <div className="ligne">
              <button type="button" onClick={reprendreBrouillon}>Reprendre</button>
              <button type="button" className="secondaire" onClick={abandonnerBrouillon}>Abandonner</button>
            </div>
          </div>
        )}
        <div className="entete-seance">
          <Champ libelle="Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} required /></Champ>
          <Champ libelle="Durée (min)" erreur={verifier(duree, REGLES.duree)}><input inputMode="numeric" value={duree} onChange={e => setDuree(e.target.value)} /></Champ>
          <Champ libelle="Ressenti (1 à 10)" erreur={verifier(ressenti, REGLES.ressenti)}><input inputMode="numeric" value={ressenti} onChange={e => setRessenti(e.target.value)} /></Champ>
        </div>

        {!seanceId && autres.length > 0 && (
          <div className="participants">
            <span className="champ-libelle">Séance partagée avec</span>
            {puces.length > 0 && (
              <div className="puces">
                {puces.map(c => (
                  <button key={c.id} type="button" className={`puce-choix${invites.includes(c.id) ? ' actif' : ''}`} aria-pressed={invites.includes(c.id)} onClick={() => basculerInvite(c.id)}>
                    {invites.includes(c.id) ? '✓ ' : '+ '}{c.prenom}
                  </button>
                ))}
              </div>
            )}
            <select aria-label="Ajouter un autre client à la séance" value="" onChange={e => e.target.value && setInvites(l => [...l, e.target.value])}>
              <option value="">Ajouter un autre client…</option>
              {autres.filter(c => !puces.some(p => p.id === c.id)).map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
            </select>
            {invites.length > 0 && (
              <>
                <p className="meta">La séance sera enregistrée pour chaque participant, avec les mêmes exercices, et ne comptera que pour une séance en facturation.</p>
                <label className="case">
                  <input type="checkbox" checked={copierCharges} onChange={e => setCopierCharges(e.target.checked)} />
                  Copier aussi les charges (sinon à compléter dans leur profil)
                </label>
              </>
            )}
          </div>
        )}

        <h3>Exercices</h3>
        {!seanceId && (
          <>
            <button type="button" className="secondaire" onClick={reprendre}>Reprendre la dernière séance</button>
            {modeles.length > 0 && (
              <select value="" onChange={e => appliquerModele(e.target.value)}>
                <option value="">Charger un modèle…</option>
                {modeles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            )}
          </>
        )}
        {lignes.map((l, i) => {
          const dernier = derniers[cle(l.nom)]
          const cardio = estCardio(l.nom)
          const prop = dernier ? proposition(dernier) : null
          return (
            <div className="exercice" key={i}>
              <div className="exercice-entete">
                <button
                  type="button"
                  className={`exercice-nom${l.nom.trim() ? '' : ' vide'}`}
                  onClick={() => setChoix(i)}
                  aria-label={l.nom.trim() ? `Changer l'exercice : ${l.nom}` : 'Choisir un exercice'}
                >
                  {l.nom.trim() || 'Choisir un exercice…'}
                </button>
                <button type="button" className="lien danger" aria-label="Retirer cet exercice" onClick={() => retirer(i)}>✕</button>
              </div>
              {dernier && (
                <>
                  <DerniereFois d={dernier} cardio={cardio} />
                  <div className="exercice-actions">
                    <button type="button" className="secondaire" onClick={() => copierDerniere(i)}>↺ Comme la dernière fois</button>
                    {prop && !cardio && <button type="button" className="secondaire" onClick={() => progresser(i)}>↑ Progresser</button>}
                  </div>
                </>
              )}
              {cardio ? (
                <div className="compteurs deux">
                  <Compteur libelle="Durée (min)" valeur={l.duree_min} onChange={v => maj(i, 'duree_min', v)} pas={5} depart={dernier?.duree_min ?? 20} erreur={verifier(l.duree_min, REGLES.duree)} />
                  <Compteur libelle="Distance (km)" valeur={l.distance_km} onChange={v => maj(i, 'distance_km', v)} pas={0.5} depart={dernier?.distance_km ?? 1} decimal erreur={verifier(l.distance_km, REGLES.distance)} />
                </div>
              ) : (
                <div className="compteurs">
                  <Compteur libelle="Séries" valeur={l.series} onChange={v => maj(i, 'series', v)} pas={1} depart={3} erreur={verifier(l.series, REGLES.series)} />
                  <Compteur libelle="Répétitions" valeur={l.repetitions} onChange={v => maj(i, 'repetitions', v)} pas={1} depart={dernier?.repetitions ?? 10} erreur={verifier(l.repetitions, REGLES.repetitions)} />
                  <Compteur libelle="Charge (kg)" valeur={l.charge_kg} onChange={v => maj(i, 'charge_kg', v)} pas={PAS_KG} depart={dernier?.charge_kg ?? PAS_KG} decimal erreur={verifier(l.charge_kg, REGLES.charge)} />
                </div>
              )}
              {biblio[cle(l.nom)] && <FicheExercice b={biblio[cle(l.nom)]} />}
            </div>
          )
        })}
        <button type="button" className="secondaire" onClick={ouvrirNouveau}>+ Ajouter un exercice</button>
        <button type="button" className="secondaire" onClick={() => setFeuilleModele(true)}>Enregistrer comme modèle</button>

        <Champ libelle="Notes"><textarea value={notes} onChange={e => setNotes(e.target.value)} /></Champ>
        <MessageErreur message={erreur} />
        <div className="barre-enregistrement">
          <span className="resume">
            {saisis.length} exercice{saisis.length > 1 ? 's' : ''}
            <small>{nbSeries} série{nbSeries > 1 ? 's' : ''}</small>
          </span>
          <button type="submit" disabled={envoi || Boolean(invalide)}>{envoi ? 'Enregistrement…' : seanceId ? 'Enregistrer les modifications' : 'Enregistrer la séance'}</button>
        </div>
      </form>
      {choix !== null && <SelecteurExercice exercices={choixExercices} faits={faits} onChoisir={choisirExercice} onFermer={fermerSelecteur} />}
      {feuilleModele && (
        <FeuilleSaisie
          titre="Nouveau modèle"
          libelle="Nom du modèle (ex. Full body A)"
          valeur=""
          obligatoire
          onFermer={() => setFeuilleModele(false)}
          onValider={async nom => {
            const e = await enregistrerModele(nom)
            if (!e) setFeuilleModele(false)
            return e
          }}
        />
      )}
    </>
  )
}
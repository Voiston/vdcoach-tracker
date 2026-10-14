import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { REGLES, verifier } from './validation'
import { messageErreur } from './erreurs'
import { MUSCLES } from './definitions'
import { analyserSupersets, aujourdhui, courte, dateLocale, resumeCardio, type InfoSuperset } from './format'
import { libelleMois, resumeMois } from './facturation-lib'
import { ecrireBrouillon, effacerBrouillon, lireBrouillon } from './brouillon'
import { Champ, Compteur, FeuilleSaisie, MessageErreur, NoteSur10, useClient, useNotifier } from './ui'
import SelecteurExercice, { normaliser, type ExoChoix } from './SelecteurExercice'
import Chronometre from './Chronometre'

// Mesure de l'effort d'un exercice : en répétitions, ou en temps (secondes)
type Mode = 'reps' | 'temps'

type Ligne = {
  nom: string
  mode: Mode
  series: string
  repetitions: string
  charge_kg: string
  duree_sec: string
  distance_km: string
  reglage: string
  lie_suivant: boolean
  valide: boolean
}
type Exo = {
  id: string
  ordre: number
  nom: string
  series: number | null
  repetitions: number | null
  charge_kg: number | null
  duree_sec?: number | null
  duree_min?: number | null
  distance_km: number | null
  reglage?: string | null
  lie_suivant?: boolean | null
}
type SeanceRecente = { id: string; date_seance: string; duree_min: number | null; exercices: Exo[] }

type ValeursExo = {
  series: number | null
  repetitions: number | null
  charge_kg: number | null
  duree_sec: number | null
  duree_min: number | null
  distance_km: number | null
  reglage: string | null
  lie_suivant: boolean
}

const DUREES_RAPIDES = ['30', '45', '60', '75', '90']
const PAS_CHARGE = [1, 2.5, 5, 10]
const PAS_SECONDES = [5, 10, 15, 30, 60]

const vide = (): Ligne => ({
  nom: '',
  mode: 'reps',
  series: '',
  repetitions: '',
  charge_kg: '',
  duree_sec: '',
  distance_km: '',
  reglage: '',
  lie_suivant: false,
  valide: false,
})
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))
const txt = (n: number | null | undefined) => (n == null ? '' : String(n))
const secDe = (x: { duree_sec?: number | null; duree_min?: number | null }) =>
  x.duree_sec ?? (x.duree_min != null ? x.duree_min * 60 : null)

const versLignes = (exos: Exo[]): Ligne[] =>
  exos.length
    ? [...exos]
        .sort((a, b) => a.ordre - b.ordre)
        .map(x => ({
          nom: x.nom,
          // Pas de répétitions mais une durée enregistrée : l'exercice se fait au temps
          mode: (x.repetitions == null && secDe(x) != null ? 'temps' : 'reps') as Mode,
          series: txt(x.series),
          repetitions: txt(x.repetitions),
          charge_kg: txt(x.charge_kg),
          duree_sec: txt(secDe(x)),
          distance_km: txt(x.distance_km),
          reglage: x.reglage ?? '',
          lie_suivant: Boolean(x.lie_suivant),
          valide: false,
        }))
    : [vide()]

const EXOS = 'exercices(id, ordre, nom, series, repetitions, charge_kg, duree_sec, duree_min, distance_km, reglage, lie_suivant)'

// Règle de progression simple (double progression) : à modifier selon ta façon de coacher.
const PLAFOND_REPS = 12
const PAS_KG = 2.5

type Dernier = {
  date: string
  series: number | null
  repetitions: number | null
  charge_kg: number | null
  duree_sec: number | null
  distance_km: number | null
  reglage: string | null
}
type Proposition = {
  series: number | null
  repetitions: number | null
  charge_kg: number | null
  duree_sec: number | null
}

const cle = (nom: string) => nom.trim().toLowerCase()
const echapper = (nom: string) => nom.replace(/[\\%_]/g, '\\$&')

function suggestion(d: Dernier, temps: boolean): string {
  if (temps) return d.duree_sec !== null ? `vise ${d.duree_sec + 5} s` : ''
  if (d.repetitions === null) return ''
  if (d.charge_kg !== null && d.repetitions >= PLAFOND_REPS) return `essaie ${+(Number(d.charge_kg) + PAS_KG).toFixed(2)} kg`
  return `vise ${d.repetitions + 1} reps${d.charge_kg !== null ? ` à ${d.charge_kg} kg` : ''}`
}

function proposition(d: Dernier, temps: boolean): Proposition | null {
  if (temps) {
    if (d.duree_sec === null) return null
    return { series: d.series, repetitions: null, charge_kg: d.charge_kg, duree_sec: d.duree_sec + 5 }
  }
  if (d.repetitions === null) return null
  if (d.charge_kg !== null && d.repetitions >= PLAFOND_REPS) {
    return { series: d.series, repetitions: d.repetitions, charge_kg: Number(d.charge_kg) + PAS_KG, duree_sec: null }
  }
  return { series: d.series, repetitions: d.repetitions + 1, charge_kg: d.charge_kg, duree_sec: null }
}

function DerniereFois({ d, temps }: { d: Dernier; temps: boolean }) {
  const date = dateLocale(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const conseil = suggestion(d, temps)
  const reglage = d.reglage ? ` · ⚙ ${d.reglage}` : ''
  if (temps) {
    return (
      <p className="meta">
        Dernière fois ({date}) : {resumeCardio(d) || '?'}
        {d.charge_kg !== null ? ` · ${d.charge_kg} kg` : ''}
        {conseil ? ` · ${conseil}` : ''}
        {reglage}
      </p>
    )
  }
  return (
    <p className="meta">
      Dernière fois ({date}) : {d.series ?? '?'}×{d.repetitions ?? '?'}
      {d.charge_kg !== null ? ` à ${d.charge_kg} kg` : ''}
      {conseil ? ` · ${conseil}` : ''}
      {reglage}
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
  const zonesSensibles = client.zones_sensibles ?? []
  const notifier = useNotifier()
  const [feuilleModele, setFeuilleModele] = useState(false)
  const [choix, setChoix] = useState<number | 'ajout' | null>(null)
  const [reglagesOuverts, setReglagesOuverts] = useState<Record<number, boolean>>({})
  const [brouillon, setBrouillon] = useState(() => (seanceId ? null : lireBrouillon(clientId)))
  const [date, setDate] = useState(aujourdhui())
  const [duree, setDuree] = useState('60')
  const [diffMuscu, setDiffMuscu] = useState('')
  const [diffCardio, setDiffCardio] = useState('')
  const [fatigue, setFatigue] = useState('')
  const [sommeil, setSommeil] = useState('')
  const [notes, setNotes] = useState('')
  const [lignes, setLignes] = useState<Ligne[]>([vide()])
  const [anciens, setAnciens] = useState<string[]>([])
  const [noms, setNoms] = useState<string[]>([])
  const [modeles, setModeles] = useState<{ id: string; nom: string }[]>([])
  const [recentes, setRecentes] = useState<SeanceRecente[]>([])
  const [derniers, setDerniers] = useState<Record<string, Dernier>>({})
  const [biblio, setBiblio] = useState<Record<string, Fiche>>({})
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [autres, setAutres] = useState<{ id: string; prenom: string; nom: string | null; groupe_facturation: string | null }[]>([])
  const [invites, setInvites] = useState<string[]>([])
  const [copierCharges, setCopierCharges] = useState(false)

  // Seuls les exercices du groupe « Cardio » ont une distance
  const estCardio = (nom: string) => biblio[cle(nom)]?.groupe === 'Cardio'
  // Temps = exercice cardio, ou exercice basculé en mode « Temps »
  const estTemps = (l: Ligne) => estCardio(l.nom) || l.mode === 'temps'

  const valeurs = (l: Ligne): ValeursExo => {
    const cardio = estCardio(l.nom)
    const temps = estTemps(l)
    return {
      series: num(l.series),
      repetitions: temps ? null : num(l.repetitions),
      charge_kg: cardio ? null : num(l.charge_kg),
      duree_sec: temps ? num(l.duree_sec) : null,
      duree_min: null,
      distance_km: cardio ? num(l.distance_km) : null,
      reglage: l.reglage.trim() || null,
      lie_suivant: l.lie_suivant,
    }
  }

  function creerLignePreRemplie(nom: string): Ligne {
    const d = derniers[cle(nom)]
    const cardio = estCardio(nom)
    const mode: Mode = cardio || (d && d.repetitions === null && d.duree_sec !== null) ? 'temps' : 'reps'
    return {
      nom,
      mode,
      series: txt(d?.series ?? 3),
      repetitions: txt(d?.repetitions ?? (cardio ? null : 10)),
      charge_kg: cardio ? '' : txt(d?.charge_kg),
      duree_sec: txt(d?.duree_sec ?? 30),
      distance_km: cardio ? txt(d?.distance_km) : '',
      reglage: d?.reglage ?? '',
      lie_suivant: false,
      valide: false,
    }
  }

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
        .select(`client_id, date_seance, duree_min, ressenti, diff_muscu, diff_cardio, fatigue, sommeil, notes, ${EXOS}`)
        .eq('id', seanceId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) return setErreur(error ? messageErreur(error) : 'Séance introuvable.')
          setDate(data.date_seance)
          setDuree(txt(data.duree_min))
          setDiffMuscu(txt(data.diff_muscu ?? data.ressenti))
          setDiffCardio(txt(data.diff_cardio))
          setFatigue(txt(data.fatigue))
          setSommeil(txt(data.sommeil))
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
      .select('duree_min, modele_exercices(id, ordre, nom, series, repetitions, charge_kg, duree_sec, duree_min, distance_km, reglage, lie_suivant)')
      .eq('id', id)
      .single()
    if (error || !data) return setErreur(error ? messageErreur(error) : 'Modèle introuvable.')
    const nouvelles = versLignes(data.modele_exercices as Exo[]).map(l => {
      const d = derniers[cle(l.nom)]
      const cardio = estCardio(l.nom)
      const temps = estTemps(l)
      return {
        ...l,
        series: l.series || txt(d?.series ?? 3),
        repetitions: l.repetitions || (temps ? '' : txt(d?.repetitions ?? 10)),
        duree_sec: l.duree_sec || (temps ? txt(d?.duree_sec ?? 30) : ''),
        charge_kg: cardio ? '' : l.charge_kg || txt(d?.charge_kg),
        reglage: l.reglage || d?.reglage || '',
      }
    })
    setLignes(nouvelles)
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
        lie_suivant: i < exos.length - 1 ? l.lie_suivant : false,
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
      .select(`id, date_seance, duree_min, ${EXOS}`)
      .eq('client_id', clientId)
      .lte('date_seance', date)
      .order('date_seance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60)
      .then(({ data }) => {
        const m: Record<string, Dernier> = {}
        const histo: SeanceRecente[] = []
        for (const s of (data ?? []) as unknown as SeanceRecente[]) {
          if (s.id === seanceId) continue
          if (histo.length < 3 && s.exercices.length > 0) histo.push(s)
          for (const x of s.exercices) {
            const k = cle(x.nom)
            if (!m[k]) {
              m[k] = {
                date: s.date_seance,
                series: x.series,
                repetitions: x.repetitions,
                charge_kg: x.charge_kg,
                duree_sec: secDe(x),
                distance_km: x.distance_km,
                reglage: x.reglage ?? null,
              }
            } else if (!m[k].reglage && x.reglage) {
              m[k].reglage = x.reglage
            }
          }
        }
        setDerniers(m)
        setRecentes(histo)
      })
  }, [clientId, seanceId, date])

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
    const contenu = diffMuscu || diffCardio || fatigue || sommeil || notes.trim() || lignes.some(l => l.nom.trim())
    if (!contenu) return
    const minuteur = setTimeout(
      () =>
        ecrireBrouillon({
          clientId,
          date,
          duree,
          diff_muscu: diffMuscu,
          diff_cardio: diffCardio,
          fatigue,
          sommeil,
          notes,
          lignes,
        }),
      600,
    )
    return () => clearTimeout(minuteur)
  }, [seanceId, brouillon, clientId, date, duree, diffMuscu, diffCardio, fatigue, sommeil, notes, lignes])

  function reprendreBrouillon() {
    if (!brouillon) return
    setDate(brouillon.date)
    setDuree(brouillon.duree || '60')
    setDiffMuscu(brouillon.diff_muscu ?? brouillon.ressenti ?? '')
    setDiffCardio(brouillon.diff_cardio ?? '')
    setFatigue(brouillon.fatigue ?? '')
    setSommeil(brouillon.sommeil ?? '')
    setNotes(brouillon.notes)
    setLignes(
      brouillon.lignes.length
        ? brouillon.lignes.map(l => {
            // Les brouillons plus anciens n'ont pas de mode : on le déduit des valeurs saisies
            const ancien = l as typeof l & { mode?: Mode }
            const reps = l.repetitions.trim()
            const duree = (l.duree_sec ?? '').trim()
            return {
              ...vide(),
              ...l,
              mode: ancien.mode ?? (!reps && duree ? 'temps' : 'reps'),
              duree_sec: l.duree_sec ?? (l.duree_min ? String(Number(l.duree_min) * 60) : ''),
            }
          })
        : [vide()],
    )
    setBrouillon(null)
  }

  function abandonnerBrouillon() {
    effacerBrouillon(clientId)
    setBrouillon(null)
  }

  function choisirUnExercice(nom: string) {
    const nouvelle = creerLignePreRemplie(nom)
    if (choix === 'ajout') {
      setLignes(l => {
        const sansVide = l.filter(x => x.nom.trim() !== '')
        return [...sansVide, nouvelle]
      })
    } else if (typeof choix === 'number') {
      setLignes(l => l.map((x, j) => (j === choix ? { ...nouvelle, lie_suivant: x.lie_suivant } : x)))
    }
    setChoix(null)
  }

  function choisirPlusieursExercices(nomsChoisis: string[]) {
    const nouvelles = nomsChoisis.map(creerLignePreRemplie)
    setLignes(l => {
      const sansVide = l.filter(x => x.nom.trim() !== '')
      return [...sansVide, ...nouvelles]
    })
    setChoix(null)
  }

  function retirer(i: number) {
    setLignes(l => (l.length > 1 ? l.filter((_, j) => j !== i) : [vide()]))
  }

  function deplacer(i: number, delta: -1 | 1) {
    const cible = i + delta
    if (cible < 0 || cible >= lignes.length) return
    setLignes(l => {
      const copie = [...l]
      const [elem] = copie.splice(i, 1)
      copie.splice(cible, 0, elem)
      return copie
    })
  }

  function dupliquer(i: number) {
    setLignes(l => {
      const copie = [...l]
      copie.splice(i + 1, 0, { ...l[i], valide: false })
      return copie
    })
  }

  // Bascule un exercice entre répétitions et temps, sans effacer ce qui a été saisi dans l'autre mode
  function changerMode(i: number, cible: Mode) {
    setLignes(l =>
      l.map((x, j) => {
        if (j !== i || x.mode === cible) return x
        const d = derniers[cle(x.nom)]
        return {
          ...x,
          mode: cible,
          duree_sec: cible === 'temps' && !x.duree_sec.trim() ? txt(d?.duree_sec ?? 30) : x.duree_sec,
          repetitions: cible === 'reps' && !x.repetitions.trim() ? txt(d?.repetitions ?? 10) : x.repetitions,
        }
      }),
    )
  }

  function copierDerniere(i: number) {
    const x = lignes[i]
    const d = derniers[cle(x.nom)]
    if (!d) return
    const temps = estTemps(x)
    const cardio = estCardio(x.nom)
    setLignes(l =>
      l.map((y, j) =>
        j !== i
          ? y
          : {
              ...y,
              series: txt(d.series) || y.series,
              repetitions: temps ? y.repetitions : txt(d.repetitions) || y.repetitions,
              duree_sec: temps ? txt(d.duree_sec) || y.duree_sec : y.duree_sec,
              charge_kg: cardio ? y.charge_kg : txt(d.charge_kg),
              distance_km: cardio ? txt(d.distance_km) || y.distance_km : y.distance_km,
              reglage: y.reglage.trim() || d.reglage || '',
            },
      ),
    )
  }

  function progresser(i: number) {
    const x = lignes[i]
    const d = derniers[cle(x.nom)]
    if (!d) return
    const temps = estTemps(x)
    const cardio = estCardio(x.nom)
    const p = proposition(d, temps)
    if (!p) return
    setLignes(l =>
      l.map((y, j) =>
        j !== i
          ? y
          : {
              ...y,
              series: p.series != null ? txt(p.series) : y.series,
              repetitions: temps || p.repetitions == null ? y.repetitions : txt(p.repetitions),
              duree_sec: temps && p.duree_sec != null ? txt(p.duree_sec) : y.duree_sec,
              charge_kg: cardio ? y.charge_kg : txt(p.charge_kg),
              reglage: y.reglage.trim() || d.reglage || '',
            },
      ),
    )
  }

  function maj<K extends keyof Ligne>(i: number, champ: K, valeur: Ligne[K]) {
    setLignes(l => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))
  }

  function reprendreSeance(s: SeanceRecente) {
    setLignes(versLignes(s.exercices))
    if (s.duree_min) setDuree(txt(s.duree_min))
    setErreur('')
  }

  function echec(message: string) {
    setErreur(message)
    setEnvoi(false)
  }

  const prenomDe = (id: string) => autres.find(c => c.id === id)?.prenom ?? 'client'

  async function creerSeancesPartagees(sessionId: string, exos: (ValeursExo & { ordre: number; nom: string })[]): Promise<string[]> {
    const echecNoms = invites.map(prenomDe)
    const { data, error } = await supabase
      .from('seances')
      .insert(invites.map(cid => ({ client_id: cid, date_seance: date, duree_min: num(duree), session_id: sessionId })))
      .select('id, client_id')
    if (error || !data) return echecNoms
    const lignesExos = data.flatMap(s =>
      exos.map(x => ({
        seance_id: s.id,
        ordre: x.ordre,
        nom: x.nom,
        series: x.series,
        repetitions: x.repetitions,
        charge_kg: copierCharges ? x.charge_kg : null,
        duree_sec: x.duree_sec,
        duree_min: x.duree_min,
        distance_km: x.distance_km,
        reglage: copierCharges ? x.reglage : null,
        lie_suivant: x.lie_suivant,
      })),
    )
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
    const champs = {
      client_id: clientId,
      date_seance: date,
      duree_min: num(duree),
      diff_muscu: num(diffMuscu),
      diff_cardio: num(diffCardio),
      fatigue: num(fatigue),
      sommeil: num(sommeil),
      notes: notes.trim() || null,
      ...(sessionId ? { session_id: sessionId } : {}),
    }
    let id = seanceId
    if (id) {
      const { error } = await supabase.from('seances').update(champs).eq('id', id)
      if (error) return echec(messageErreur(error))
    } else {
      const { data, error } = await supabase.from('seances').insert(champs).select('id').single()
      if (error) return echec(messageErreur(error))
      id = data.id as string
    }

    const renseignes = lignes.filter(l => l.nom.trim())
    const exercices = renseignes.map((l, i) => ({
      seance_id: id,
      ordre: i,
      nom: l.nom.trim(),
      ...valeurs(l),
      lie_suivant: i < renseignes.length - 1 ? l.lie_suivant : false,
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
  const supersets: InfoSuperset[] = analyserSupersets(lignes)
  const partenaires = autres.filter(c => client.groupe_facturation && c.groupe_facturation === client.groupe_facturation)
  const puces = [...partenaires, ...(invites.filter(id => !partenaires.some(p => p.id === id)).map(id => autres.find(c => c.id === id)).filter(Boolean) as typeof autres)]
  const basculerInvite = (id: string) => setInvites(l => (l.includes(id) ? l.filter(x => x !== id) : [...l, id]))
  const invalide =
    verifier(duree, REGLES.duree) ||
    lignes.some(
      l =>
        verifier(l.series, REGLES.series) ||
        verifier(l.charge_kg, REGLES.charge) ||
        verifier(l.distance_km, REGLES.distance) ||
        (estTemps(l) ? verifier(l.duree_sec, REGLES.duree_sec) : verifier(l.repetitions, REGLES.repetitions)),
    )

  return (
    <>
      <Chronometre />
      <form onSubmit={enregistrer}>
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

        <div className="entete-seance-rapide">
          <Champ libelle="Date">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
          </Champ>
          <div className="champ">
            <span className="champ-libelle">Durée (min)</span>
            <div className="durees-rapides">
              {DUREES_RAPIDES.map(d => (
                <button
                  key={d}
                  type="button"
                  className={`puce-choix${duree === d ? ' actif' : ''}`}
                  aria-pressed={duree === d}
                  onClick={() => setDuree(duree === d ? '' : d)}
                >
                  {d}
                </button>
              ))}
              <input
                className="duree-input"
                inputMode="numeric"
                placeholder="Autre"
                aria-label="Durée personnalisée en minutes"
                value={duree}
                onChange={e => setDuree(e.target.value)}
              />
            </div>
            {verifier(duree, REGLES.duree) && <span className="champ-erreur" role="alert">{verifier(duree, REGLES.duree)}</span>}
          </div>
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
                  Copier aussi les charges et réglages (sinon à compléter dans leur profil)
                </label>
              </>
            )}
          </div>
        )}

        <h3>Exercices</h3>
        {!seanceId && (recentes.length > 0 || modeles.length > 0) && (
          <div className="raccourcis-seance">
            {recentes.length > 0 && (
              <div className="puces">
                <span className="meta">Reprendre :</span>
                {recentes.map((s, idx) => (
                  <button key={s.id} type="button" className="puce-choix" onClick={() => reprendreSeance(s)}>
                    ↺ {idx === 0 ? `Dernière (${courte(s.date_seance)})` : courte(s.date_seance)} ({s.exercices.length})
                  </button>
                ))}
              </div>
            )}
            {modeles.length > 0 && (
              <select value="" onChange={e => appliquerModele(e.target.value)}>
                <option value="">Charger un modèle…</option>
                {modeles.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            )}
          </div>
        )}

        {lignes.map((l, i) => {
          const dernier = derniers[cle(l.nom)]
          const fiche = biblio[cle(l.nom)]
          const cardio = estCardio(l.nom)
          const temps = estTemps(l)
          const prop = dernier ? proposition(dernier, temps) : null
          const sup = supersets[i]
          const lieAvecSuivant = l.lie_suivant && i < lignes.length - 1
          const classes = [
            'exercice',
            sup.groupe !== null ? `superset-groupe grp-sup-${sup.groupe}` : '',
            lieAvecSuivant ? 'lie-suivant' : '',
          ].filter(Boolean).join(' ')
          const sollicitesSensibles = (fiche?.exercice_muscles ?? []).filter(m => zonesSensibles.includes(m.muscle))
          const afficherReglage = Boolean(l.reglage.trim() || reglagesOuverts[i])

          if (l.valide && l.nom.trim()) {
            const resumeCompact = temps
              ? [
                  resumeCardio({ series: num(l.series), duree_sec: num(l.duree_sec), distance_km: num(l.distance_km) }),
                  l.charge_kg ? `@ ${l.charge_kg} kg` : '',
                ].filter(Boolean).join(' ')
              : [l.series && l.repetitions ? `${l.series}×${l.repetitions}` : '', l.charge_kg ? `@ ${l.charge_kg} kg` : '']
                  .filter(Boolean)
                  .join(' ')
            return (
              <div className={`${classes} compact`} key={i}>
                <div className="exercice-entete">
                  <button
                    type="button"
                    className="btn-valide actif"
                    aria-label="Déplier cet exercice"
                    onClick={() => maj(i, 'valide', false)}
                  >
                    ✓
                  </button>
                  {sup.etiquette && <span className="puce superset-badge">{sup.etiquette}</span>}
                  <button type="button" className="exercice-compact-texte" onClick={() => maj(i, 'valide', false)}>
                    <strong>{l.nom}</strong>
                    {resumeCompact && <span> — {resumeCompact}</span>}
                    {l.reglage.trim() && <small className="meta"> · ⚙ {l.reglage}</small>}
                  </button>
                  <button type="button" className="lien danger outil" aria-label="Retirer cet exercice" onClick={() => retirer(i)}>✕</button>
                </div>
              </div>
            )
          }

          return (
            <div className={classes} key={i}>
              <div className="exercice-entete">
                {l.nom.trim() && (
                  <button
                    type="button"
                    className="btn-valide"
                    title="Marquer comme fait et replier"
                    aria-label="Marquer cet exercice comme fait et replier"
                    onClick={() => maj(i, 'valide', true)}
                  >
                    ✓
                  </button>
                )}
                {sup.etiquette && <span className="puce superset-badge">{sup.etiquette}</span>}
                <button
                  type="button"
                  className={`exercice-nom${l.nom.trim() ? '' : ' vide'}`}
                  onClick={() => setChoix(i)}
                  aria-label={l.nom.trim() ? `Changer l'exercice : ${l.nom}` : 'Choisir un exercice'}
                >
                  {l.nom.trim() || 'Choisir un exercice…'}
                </button>
                <button type="button" className="lien danger outil" aria-label="Retirer cet exercice" onClick={() => retirer(i)}>✕</button>
              </div>

              {sollicitesSensibles.length > 0 && (
                <p className="alerte-zone" role="status">
                  ⚠ Sollicite une zone sensible de {client.prenom} :{' '}
                  <strong>{sollicitesSensibles.map(m => MUSCLES[m.muscle] ?? m.muscle).join(', ')}</strong>
                </p>
              )}

              {dernier && (
                <div className="derniere-ligne">
                  <DerniereFois d={dernier} temps={temps} />
                  <div className="exercice-actions">
                    <button type="button" className="secondaire" onClick={() => copierDerniere(i)}>↺ Dernière fois</button>
                    {prop && <button type="button" className="secondaire" onClick={() => progresser(i)}>↑ Progresser</button>}
                  </div>
                </div>
              )}

              {!cardio && (
                <div className="bascule-mode" role="group" aria-label="Mesure de l'effort">
                  <button
                    type="button"
                    className={`bascule-mode-bouton${!temps ? ' actif' : ''}`}
                    aria-pressed={!temps}
                    onClick={() => changerMode(i, 'reps')}
                  >
                    Répétitions
                  </button>
                  <button
                    type="button"
                    className={`bascule-mode-bouton${temps ? ' actif' : ''}`}
                    aria-pressed={temps}
                    onClick={() => changerMode(i, 'temps')}
                  >
                    Temps
                  </button>
                </div>
              )}

              {cardio ? (
                <div className="compteurs">
                  <Compteur
                    libelle="Séries"
                    valeur={l.series}
                    onChange={v => maj(i, 'series', v)}
                    pas={1}
                    depart={dernier?.series ?? 3}
                    erreur={verifier(l.series, REGLES.series)}
                  />
                  <Compteur
                    libelle="Temps (sec)"
                    valeur={l.duree_sec}
                    onChange={v => maj(i, 'duree_sec', v)}
                    pas={15}
                    choixPas={PAS_SECONDES}
                    depart={dernier?.duree_sec ?? 30}
                    erreur={verifier(l.duree_sec, REGLES.duree_sec)}
                  />
                  <Compteur
                    libelle="Distance (km)"
                    valeur={l.distance_km}
                    onChange={v => maj(i, 'distance_km', v)}
                    pas={0.5}
                    depart={dernier?.distance_km ?? 1}
                    decimal
                    erreur={verifier(l.distance_km, REGLES.distance)}
                  />
                </div>
              ) : temps ? (
                <div className="compteurs">
                  <Compteur
                    libelle="Séries"
                    valeur={l.series}
                    onChange={v => maj(i, 'series', v)}
                    pas={1}
                    depart={dernier?.series ?? 3}
                    erreur={verifier(l.series, REGLES.series)}
                  />
                  <Compteur
                    libelle="Durée (sec)"
                    valeur={l.duree_sec}
                    onChange={v => maj(i, 'duree_sec', v)}
                    pas={5}
                    choixPas={PAS_SECONDES}
                    depart={dernier?.duree_sec ?? 30}
                    erreur={verifier(l.duree_sec, REGLES.duree_sec)}
                  />
                  <Compteur
                    libelle="Charge (kg)"
                    valeur={l.charge_kg}
                    onChange={v => maj(i, 'charge_kg', v)}
                    pas={PAS_KG}
                    choixPas={PAS_CHARGE}
                    depart={dernier?.charge_kg ?? PAS_KG}
                    decimal
                    erreur={verifier(l.charge_kg, REGLES.charge)}
                  />
                </div>
              ) : (
                <div className="compteurs">
                  <Compteur libelle="Séries" valeur={l.series} onChange={v => maj(i, 'series', v)} pas={1} depart={3} erreur={verifier(l.series, REGLES.series)} />
                  <Compteur libelle="Répétitions" valeur={l.repetitions} onChange={v => maj(i, 'repetitions', v)} pas={1} depart={dernier?.repetitions ?? 10} erreur={verifier(l.repetitions, REGLES.repetitions)} />
                  <Compteur
                    libelle="Charge (kg)"
                    valeur={l.charge_kg}
                    onChange={v => maj(i, 'charge_kg', v)}
                    pas={PAS_KG}
                    choixPas={PAS_CHARGE}
                    depart={dernier?.charge_kg ?? PAS_KG}
                    decimal
                    erreur={verifier(l.charge_kg, REGLES.charge)}
                  />
                </div>
              )}

              {afficherReglage ? (
                <input
                  className="champ-reglage"
                  aria-label="Mémo de réglage pour cet exercice"
                  placeholder="⚙ Mémo réglage client (ex. élastique rouge, poulie cran 4, prise neutre…)"
                  value={l.reglage}
                  onChange={e => maj(i, 'reglage', e.target.value)}
                />
              ) : null}

              {fiche && <FicheExercice b={fiche} />}

              <div className="exercice-pied">
                {!afficherReglage && (
                  <button type="button" className="lien superset-lien" onClick={() => setReglagesOuverts(r => ({ ...r, [i]: true }))}>
                    + ⚙ Réglage
                  </button>
                )}
                {i < lignes.length - 1 && (
                  <button
                    type="button"
                    className={`lien superset-lien${l.lie_suivant ? ' actif' : ''}`}
                    aria-pressed={l.lie_suivant}
                    onClick={() => maj(i, 'lie_suivant', !l.lie_suivant)}
                  >
                    {l.lie_suivant ? '⛓ Superset actif' : '+ Superset'}
                  </button>
                )}
                <div className="exercice-outils">
                  {i > 0 && (
                    <button type="button" className="lien outil" aria-label="Monter cet exercice" title="Monter" onClick={() => deplacer(i, -1)}>↑</button>
                  )}
                  {i < lignes.length - 1 && (
                    <button type="button" className="lien outil" aria-label="Descendre cet exercice" title="Descendre" onClick={() => deplacer(i, 1)}>↓</button>
                  )}
                  {l.nom.trim() && (
                    <button type="button" className="lien outil" aria-label="Dupliquer cet exercice" title="Dupliquer" onClick={() => dupliquer(i)}>⎘</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        <div className="ligne" style={{ flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setChoix('ajout')} style={{ flex: 2 }}>
            + Ajouter des exercices
          </button>
          <button type="button" className="secondaire" onClick={() => setFeuilleModele(true)} style={{ flex: 1 }}>
            Créer un modèle
          </button>
        </div>

        <h3>Ressentis & forme du jour (facultatif)</h3>
        <div className="grille-ressentis">
          <NoteSur10 libelle="Difficulté musculaire" valeur={diffMuscu} onChange={setDiffMuscu} />
          <NoteSur10 libelle="Difficulté cardio" valeur={diffCardio} onChange={setDiffCardio} />
          <NoteSur10 libelle="Fatigue" valeur={fatigue} onChange={setFatigue} />
          <NoteSur10 libelle="Qualité du sommeil" valeur={sommeil} onChange={setSommeil} inverse />
        </div>

        <Champ libelle="Notes de séance (facultatif)">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} />
        </Champ>
        <MessageErreur message={erreur} />
        <div className="barre-enregistrement">
          <span className="resume">
            {saisis.length} exercice{saisis.length > 1 ? 's' : ''}
            <small>{nbSeries} série{nbSeries > 1 ? 's' : ''}</small>
          </span>
          <button type="submit" disabled={envoi || Boolean(invalide)}>
            {envoi ? 'Enregistrement…' : seanceId ? 'Enregistrer' : 'Enregistrer la séance'}
          </button>
        </div>
      </form>

      {choix !== null && (
        <SelecteurExercice
          exercices={choixExercices}
          faits={faits}
          zonesSensibles={zonesSensibles}
          multiple={choix === 'ajout'}
          onChoisir={choisirUnExercice}
          onChoisirMultiple={choisirPlusieursExercices}
          onFermer={() => setChoix(null)}
        />
      )}
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
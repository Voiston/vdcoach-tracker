import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { REGLES, verifier } from './validation'
import { messageErreur } from './erreurs'
import { analyserSupersets, aujourdhui, courte, dateLocale, libelleRepos, resumeCardio, type InfoSuperset } from './format'
import { libelleMois, resumeMois } from './facturation-lib'
import { ecrireBrouillon, effacerBrouillon, lireBrouillon, type RessentisParticipant } from './brouillon'
import { Avatar, Champ, Compteur, FeuilleSaisie, MessageErreur, NoteSur10, useClient, useNotifier } from './ui'
import SelecteurExercice, { normaliser, zonesSensiblesSollicitees, type ExoChoix } from './SelecteurExercice'
import Chronometre, { lancerMinuteurRepos } from './Chronometre'
import { lireModelesFavoris } from './Modeles'

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
  repos_sec: string
  reglage: string
  reglageOuvert?: boolean
  lie_suivant: boolean
  valide: boolean
  passe?: boolean
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
  repos_sec?: number | null
  reglage?: string | null
  lie_suivant?: boolean | null
}
type SeanceRecente = { id: string; date_seance: string; duree_min: number | null; exercices: Exo[] }

type ValeursExo = {
  series: number | null
  repetitions: number | null
  charge_kg: number | null
  duree_sec: number | null
  duree_min: null
  distance_km: number | null
  repos_sec: number | null
  reglage: string | null
  lie_suivant: boolean
}

// Cible d'ouverture du sélecteur : remplacer une ligne, ajouter à la fin, ou insérer après une ligne précise
type CibleChoix =
  | { type: 'remplacer'; index: number }
  | { type: 'ajout_fin' }
  | { type: 'inserer_apres'; index: number }

const DUREES_RAPIDES = ['30', '45', '60', '75', '90']
const REPOS_RAPIDES = [30, 60, 90, 120, 180]
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
  repos_sec: '',
  reglage: '',
  lie_suivant: false,
  valide: false,
  passe: false,
})

const ressentiVide = (): RessentisParticipant => ({
  diff_muscu: '',
  diff_cardio: '',
  fatigue: '',
  sommeil: '',
  notes: '',
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
          mode: (x.repetitions == null && secDe(x) != null ? 'temps' : 'reps') as Mode,
          series: txt(x.series),
          repetitions: txt(x.repetitions),
          charge_kg: txt(x.charge_kg),
          duree_sec: txt(secDe(x)),
          distance_km: txt(x.distance_km),
          repos_sec: txt(x.repos_sec),
          reglage: x.reglage ?? '',
          lie_suivant: Boolean(x.lie_suivant),
          valide: false,
          passe: false,
        }))
    : [vide()]

const EXOS = 'exercices(id, ordre, nom, series, repetitions, charge_kg, duree_sec, duree_min, distance_km, repos_sec, reglage, lie_suivant)'

const PLAFOND_REPS = 12
const PAS_KG = 2.5

type Dernier = {
  date: string
  series: number | null
  repetitions: number | null
  charge_kg: number | null
  duree_sec: number | null
  distance_km: number | null
  repos_sec: number | null
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

// Temps de repos entre les séries : boutons rapides + saisie libre en secondes + lancement direct du chrono
function ChampRepos({ valeur, onChange, erreur }: { valeur: string; onChange: (v: string) => void; erreur?: string }) {
  const actuel = num(valeur)
  return (
    <div className="champ">
      <div className="compteur-entete">
        <span className="champ-libelle">Repos entre les séries</span>
        {actuel !== null && actuel > 0 && !erreur && (
          <button
            type="button"
            className="secondaire pas-puce actif"
            title="Lancer le compte à rebours de repos maintenant"
            onClick={() => lancerMinuteurRepos(actuel)}
          >
            ⏱ Lancer {libelleRepos(actuel)}
          </button>
        )}
      </div>
      <div className="durees-rapides">
        {REPOS_RAPIDES.map(s => (
          <button
            key={s}
            type="button"
            className={`puce-choix${actuel === s ? ' actif' : ''}`}
            aria-pressed={actuel === s}
            onClick={() => onChange(actuel === s ? '' : String(s))}
          >
            {libelleRepos(s)}
          </button>
        ))}
        <input
          className="duree-input"
          inputMode="numeric"
          placeholder="sec"
          aria-label="Repos personnalisé en secondes"
          value={valeur}
          onChange={e => onChange(e.target.value)}
        />
      </div>
      {erreur && <span className="champ-erreur" role="alert">{erreur}</span>}
    </div>
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
  const [modeleChargeId, setModeleChargeId] = useState<string | null>(null)
  const [choix, setChoix] = useState<CibleChoix | null>(null)
  const [conserverParametres, setConserverParametres] = useState(true)
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
  const [modelesFavIds, setModelesFavIds] = useState<Set<string>>(() => lireModelesFavoris())
  const [recentes, setRecentes] = useState<SeanceRecente[]>([])
  const [derniers, setDerniers] = useState<Record<string, Dernier>>({})
  const [biblio, setBiblio] = useState<Record<string, Fiche>>({})
  const [erreur, setErreur] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [autres, setAutres] = useState<{ id: string; prenom: string; nom: string | null; groupe_facturation: string | null }[]>([])
  const [invites, setInvites] = useState<string[]>([])
  const [copierCharges, setCopierCharges] = useState(false)
  const [ressentisInvites, setRessentisInvites] = useState<Record<string, RessentisParticipant>>({})

  // Mode Terrain Plein Écran
  const [modeTerrain, setModeTerrain] = useState(false)
  const [indexTerrain, setIndexTerrain] = useState(0)
  const [ecranFinTerrain, setEcranFinTerrain] = useState(false)

  const estCardio = (nom: string) => biblio[cle(nom)]?.groupe === 'Cardio'
  const estTemps = (l: Ligne) => estCardio(l.nom) || l.mode === 'temps'

  const ressentiDeInvite = (cid: string): RessentisParticipant =>
    ressentisInvites[cid] ?? ressentiVide()

  function majRessentiInvite<K extends keyof RessentisParticipant>(cid: string, champ: K, valeur: string) {
    setRessentisInvites(prec => ({
      ...prec,
      [cid]: { ...(prec[cid] ?? ressentiVide()), [champ]: valeur },
    }))
  }

  function copierRessentiPrincipalVers(cid: string) {
    setRessentisInvites(prec => ({
      ...prec,
      [cid]: {
        ...(prec[cid] ?? ressentiVide()),
        diff_muscu: diffMuscu,
        diff_cardio: diffCardio,
        fatigue: fatigue,
        sommeil: sommeil,
      },
    }))
    notifier(`Notes copiées pour ${prenomDe(cid)}`)
  }

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
      repos_sec: num(l.repos_sec),
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
      repos_sec: txt(d?.repos_sec),
      reglage: d?.reglage ?? '',
      lie_suivant: false,
      valide: false,
      passe: false,
    }
  }

  function remplacerLigneIntelligente(ancienne: Ligne, nouveauNom: string): Ligne {
    if (!ancienne.nom.trim() || !conserverParametres) {
      return { ...creerLignePreRemplie(nouveauNom), lie_suivant: ancienne.lie_suivant }
    }
    const d = derniers[cle(nouveauNom)]
    const cardio = estCardio(nouveauNom)
    const nouveauMode: Mode = cardio ? 'temps' : ancienne.mode
    return {
      ...ancienne,
      nom: nouveauNom,
      mode: nouveauMode,
      series: ancienne.series || txt(d?.series ?? 3),
      repetitions: nouveauMode === 'temps' ? '' : ancienne.repetitions || txt(d?.repetitions ?? 10),
      duree_sec: nouveauMode === 'temps' ? ancienne.duree_sec || txt(d?.duree_sec ?? 30) : ancienne.duree_sec,
      charge_kg: cardio ? '' : txt(d?.charge_kg),
      distance_km: cardio ? txt(d?.distance_km) || ancienne.distance_km : '',
      repos_sec: ancienne.repos_sec || txt(d?.repos_sec),
      reglage: d?.reglage ?? '',
      lie_suivant: ancienne.lie_suivant,
      valide: false,
      passe: false,
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
    supabase.from('modeles').select('id, nom').order('nom').then(({ data }) => {
      setModeles(data ?? [])
      setModelesFavIds(lireModelesFavoris())
    })
  }, [])

  async function appliquerModele(id: string) {
    if (!id) return
    const { data, error } = await supabase
      .from('modeles')
      .select('id, nom, duree_min, modele_exercices(id, ordre, nom, series, repetitions, charge_kg, duree_sec, duree_min, distance_km, repos_sec, reglage, lie_suivant)')
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
        repos_sec: l.repos_sec || txt(d?.repos_sec),
        reglage: l.reglage || d?.reglage || '',
      }
    })
    setLignes(nouvelles)
    setModeleChargeId(data.id as string)
    setIndexTerrain(0)
    setEcranFinTerrain(false)
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
    setModeleChargeId(data.id as string)
    notifier(`Modèle « ${nom} » enregistré`)
  }

  async function mettreAJourModeleCharge() {
    if (!modeleChargeId || envoi) return
    if (invalide) return setErreur('Corrige les valeurs invalides avant de mettre à jour le modèle.')
    const modeleActuel = modeles.find(m => m.id === modeleChargeId)
    const exos = lignes.filter(l => l.nom.trim())
    if (!exos.length) return setErreur('Ajoute au moins un exercice pour mettre à jour le modèle.')

    setEnvoi(true)
    setErreur('')

    try {
      const { error: errMaj } = await supabase.from('modeles').update({ duree_min: num(duree) }).eq('id', modeleChargeId)
      if (errMaj) return setErreur(messageErreur(errMaj))

      const { data: anciensExos, error: errAnciens } = await supabase
        .from('modele_exercices')
        .select('id')
        .eq('modele_id', modeleChargeId)
      if (errAnciens) return setErreur(messageErreur(errAnciens))
      const anciensIds = (anciensExos ?? []).map(x => x.id as string)

      const lignesDb = exos.map((l, i) => ({
        modele_id: modeleChargeId,
        ordre: i,
        nom: l.nom.trim(),
        ...valeurs(l),
        lie_suivant: i < exos.length - 1 ? l.lie_suivant : false,
      }))

      let nouveauxIds: string[] = []
      if (lignesDb.length) {
        const { data: crees, error: errInsert } = await supabase
          .from('modele_exercices')
          .insert(lignesDb)
          .select('id')
        if (errInsert) return setErreur(messageErreur(errInsert))
        nouveauxIds = (crees ?? []).map(x => x.id as string)
      }

      if (anciensIds.length) {
        const { error: errSuppr } = await supabase.from('modele_exercices').delete().in('id', anciensIds)
        if (errSuppr) {
          if (nouveauxIds.length) await supabase.from('modele_exercices').delete().in('id', nouveauxIds)
          return setErreur(messageErreur(errSuppr))
        }
      }

      notifier(`Modèle « ${modeleActuel?.nom ?? ''} » mis à jour`)
    } finally {
      setEnvoi(false)
    }
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
                repos_sec: x.repos_sec ?? null,
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
    const parExo = new Map<string, { nom: string; charge: number }>()
    for (const l of lignes) {
      const charge = valeurs(l).charge_kg
      const k = cle(l.nom)
      if (!k || charge === null || !(charge > 0)) continue
      const existant = parExo.get(k)
      if (!existant || charge > existant.charge) {
        parExo.set(k, { nom: l.nom.trim(), charge })
      }
    }
    const candidats = [...parExo.values()]

    const resultats = await Promise.all(
      candidats.map(async ({ nom, charge }) => {
        let q = supabase
          .from('exercices')
          .select('charge_kg, seances!inner(client_id)')
          .eq('seances.client_id', clientId)
          .ilike('nom', echapper(nom))
          .gt('charge_kg', 0)
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
    const aRessentisInvites = Object.values(ressentisInvites).some(
      r => r.diff_muscu || r.diff_cardio || r.fatigue || r.sommeil || (r.notes ?? '').trim(),
    )
    const contenu =
      diffMuscu ||
      diffCardio ||
      fatigue ||
      sommeil ||
      notes.trim() ||
      invites.length > 0 ||
      aRessentisInvites ||
      lignes.some(l => l.nom.trim())
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
          invites,
          copierCharges,
          ressentisInvites,
          lignes,
        }),
      600,
    )
    return () => clearTimeout(minuteur)
  }, [seanceId, brouillon, clientId, date, duree, diffMuscu, diffCardio, fatigue, sommeil, notes, invites, copierCharges, ressentisInvites, lignes])

  function reprendreBrouillon() {
    if (!brouillon) return
    setDate(brouillon.date)
    setDuree(brouillon.duree || '60')
    setDiffMuscu(brouillon.diff_muscu ?? brouillon.ressenti ?? '')
    setDiffCardio(brouillon.diff_cardio ?? '')
    setFatigue(brouillon.fatigue ?? '')
    setSommeil(brouillon.sommeil ?? '')
    setNotes(brouillon.notes)
    if (brouillon.invites) setInvites(brouillon.invites)
    if (brouillon.copierCharges !== undefined) setCopierCharges(brouillon.copierCharges)
    if (brouillon.ressentisInvites) setRessentisInvites(brouillon.ressentisInvites)
    setLignes(
      brouillon.lignes.length
        ? brouillon.lignes.map(l => {
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
    if (!choix) return
    if (choix.type === 'ajout_fin') {
      const nouvelle = creerLignePreRemplie(nom)
      const sansVide = lignes.filter(x => x.nom.trim() !== '')
      const res = [...sansVide, nouvelle]
      setLignes(res)
      if (modeTerrain) {
        setIndexTerrain(res.length - 1)
        setEcranFinTerrain(false)
      }
    } else if (choix.type === 'inserer_apres') {
      const nouvelle = creerLignePreRemplie(nom)
      const copie = [...lignes]
      copie.splice(choix.index + 1, 0, nouvelle)
      setLignes(copie)
      if (modeTerrain) {
        setIndexTerrain(choix.index + 1)
        setEcranFinTerrain(false)
      }
    } else if (choix.type === 'remplacer') {
      setLignes(l => l.map((x, j) => (j === choix.index ? remplacerLigneIntelligente(x, nom) : x)))
    }
    setChoix(null)
  }

  function choisirPlusieursExercices(nomsChoisis: string[]) {
    const nouvelles = nomsChoisis.map(creerLignePreRemplie)
    if (choix?.type === 'inserer_apres') {
      const idx = choix.index
      const copie = [...lignes]
      copie.splice(idx + 1, 0, ...nouvelles)
      setLignes(copie)
      if (modeTerrain) {
        setIndexTerrain(idx + 1)
        setEcranFinTerrain(false)
      }
    } else {
      const sansVide = lignes.filter(x => x.nom.trim() !== '')
      const res = [...sansVide, ...nouvelles]
      setLignes(res)
      if (modeTerrain) {
        setIndexTerrain(Math.max(0, res.length - nouvelles.length))
        setEcranFinTerrain(false)
      }
    }
    setChoix(null)
  }

  function retirer(i: number) {
    if (lignes.length <= 1) {
      setLignes([vide()])
      setIndexTerrain(0)
      return
    }
    const copie = lignes.filter((_, j) => j !== i)
    if (!lignes[i].lie_suivant && i > 0 && lignes[i - 1].lie_suivant) {
      copie[i - 1] = { ...copie[i - 1], lie_suivant: false }
    }
    if (copie.length > 0 && copie[copie.length - 1].lie_suivant) {
      copie[copie.length - 1] = { ...copie[copie.length - 1], lie_suivant: false }
    }
    setLignes(copie)
    if (indexTerrain >= lignes.length - 1) setIndexTerrain(Math.max(0, lignes.length - 2))
  }

  function deplacer(i: number, delta: -1 | 1) {
    const cible = i + delta
    if (cible < 0 || cible >= lignes.length) return
    const copie = [...lignes]
    const [elem] = copie.splice(i, 1)
    copie.splice(cible, 0, elem)
    if (copie.length > 0 && copie[copie.length - 1].lie_suivant) {
      copie[copie.length - 1] = { ...copie[copie.length - 1], lie_suivant: false }
    }
    setLignes(copie)
    if (modeTerrain && indexTerrain === i) setIndexTerrain(cible)
  }

  function dupliquer(i: number) {
    setLignes(l => {
      const copie = [...l]
      copie.splice(i + 1, 0, { ...l[i], valide: false, passe: false })
      return copie
    })
    if (modeTerrain) setIndexTerrain(i + 1)
  }

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
              repos_sec: txt(d.repos_sec) || y.repos_sec,
              reglage: y.reglage.trim() || d.reglage || '',
            },
      ),
    )
  }

  function appliquerProgressionLigne(y: Ligne): Ligne {
    const d = derniers[cle(y.nom)]
    if (!d) return y
    const temps = estTemps(y)
    const cardio = estCardio(y.nom)
    const p = proposition(d, temps)
    if (!p) return y
    return {
      ...y,
      series: p.series != null ? txt(p.series) : y.series,
      repetitions: temps || p.repetitions == null ? y.repetitions : txt(p.repetitions),
      duree_sec: temps && p.duree_sec != null ? txt(p.duree_sec) : y.duree_sec,
      charge_kg: cardio ? y.charge_kg : txt(p.charge_kg),
      reglage: y.reglage.trim() || d.reglage || '',
    }
  }

  function progresser(i: number) {
    setLignes(l => l.map((y, j) => (j === i ? appliquerProgressionLigne(y) : y)))
  }

  function progresserTouteLaSeance() {
    setLignes(l => l.map(appliquerProgressionLigne))
    notifier('Progression appliquée à toute la séance')
  }

  function maj<K extends keyof Ligne>(i: number, champ: K, valeur: Ligne[K]) {
    setLignes(l => l.map((x, j) => (j === i ? { ...x, [champ]: valeur } : x)))
  }

  function reprendreSeance(s: SeanceRecente) {
    setLignes(versLignes(s.exercices))
    setModeleChargeId(null)
    setIndexTerrain(0)
    setEcranFinTerrain(false)
    if (s.duree_min) setDuree(txt(s.duree_min))
    setErreur('')
  }

  /* ---------- Pilotage Mode Terrain Plein Écran ---------- */
  function trouverProchainExercice(depuis: number, etatLignes: Ligne[]): number | null {
    for (let k = depuis + 1; k < etatLignes.length; k++) {
      if (!etatLignes[k].valide && !etatLignes[k].passe) return k
    }
    const nonFaitNonPasse = etatLignes.findIndex((l, k) => k !== depuis && !l.valide && !l.passe)
    if (nonFaitNonPasse !== -1) return nonFaitNonPasse
    const nonFait = etatLignes.findIndex((l, k) => k !== depuis && !l.valide)
    return nonFait !== -1 ? nonFait : null
  }

  function declencherReposSiPrevu(ligne: Ligne | undefined) {
    if (!ligne) return
    const sec = num(ligne.repos_sec)
    if (sec !== null && sec > 0) {
      lancerMinuteurRepos(sec)
    }
  }

  function validerExerciceSimple(i: number) {
    declencherReposSiPrevu(lignes[i])
    maj(i, 'valide', true)
  }

  function validerTerrainEtAvancer(i: number) {
    declencherReposSiPrevu(lignes[i])
    const prochaines = lignes.map((x, j) => (j === i ? { ...x, valide: true, passe: false } : x))
    setLignes(prochaines)
    const suivant = trouverProchainExercice(i, prochaines)
    if (suivant !== null) {
      setIndexTerrain(suivant)
      setEcranFinTerrain(false)
    } else {
      setEcranFinTerrain(true)
    }
  }

  function passerExerciceTerrain(i: number) {
    const prochaines = lignes.map((x, j) => (j === i ? { ...x, passe: true, valide: false } : x))
    setLignes(prochaines)
    const suivant = trouverProchainExercice(i, prochaines)
    if (suivant !== null) {
      setIndexTerrain(suivant)
      setEcranFinTerrain(false)
    } else {
      setEcranFinTerrain(true)
    }
  }

  function ouvrirModeTerrain(indexDepart?: number) {
    const premierNonFait = lignes.findIndex(l => !l.valide)
    const cible = indexDepart ?? (premierNonFait !== -1 ? premierNonFait : 0)
    setIndexTerrain(cible)
    setEcranFinTerrain(false)
    setModeTerrain(true)
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
      .insert(
        invites.map(cid => {
          const r = ressentiDeInvite(cid)
          const notePerso = (r.notes ?? '').trim()
          const noteCommune = notes.trim()
          const notesFinales = [notePerso, noteCommune].filter(Boolean).join(' — ') || null
          return {
            client_id: cid,
            date_seance: date,
            duree_min: num(duree),
            diff_muscu: num(r.diff_muscu),
            diff_cardio: num(r.diff_cardio),
            fatigue: num(r.fatigue),
            sommeil: num(r.sommeil),
            notes: notesFinales,
            session_id: sessionId,
          }
        }),
      )
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
        repos_sec: x.repos_sec,
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
  const nbTermines = saisis.filter(l => l.valide).length
  const peutToutProgresser = saisis.some(l => {
    const d = derniers[cle(l.nom)]
    return d ? Boolean(proposition(d, estTemps(l))) : false
  })
  const modelesFavoris = modeles.filter(m => modelesFavIds.has(m.id))
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
        verifier(l.repos_sec, REGLES.duree_sec) ||
        (estTemps(l) ? verifier(l.duree_sec, REGLES.duree_sec) : verifier(l.repetitions, REGLES.repetitions)),
    )

  // Bloc réutilisable des 4 notes sur 10 pour 1 ou plusieurs membres sur le même écran
  const aDesNotesPrincipal = Boolean(diffMuscu || diffCardio || fatigue || sommeil)
  const nbNotesPrincipal = [diffMuscu, diffCardio, fatigue, sommeil].filter(Boolean).length

  const blocRessentisTousMembres =
    invites.length === 0 ? (
      <div className="grille-ressentis">
        <NoteSur10 libelle="Difficulté musculaire" valeur={diffMuscu} onChange={setDiffMuscu} />
        <NoteSur10 libelle="Difficulté cardio" valeur={diffCardio} onChange={setDiffCardio} />
        <NoteSur10 libelle="Fatigue" valeur={fatigue} onChange={setFatigue} />
        <NoteSur10 libelle="Qualité du sommeil" valeur={sommeil} onChange={setSommeil} inverse />
      </div>
    ) : (
      <div className="ressentis-partages">
        {/* Carte du client principal */}
        <div className="carte-ressenti-membre">
          <div className="entete-ressenti-membre">
            <span className="identite-ressenti-membre">
              <Avatar client={client} />
              <strong>{client.prenom} {client.nom}</strong>
            </span>
            <span className="puce neutre">{nbNotesPrincipal}/4 noté{nbNotesPrincipal > 1 ? 's' : ''}</span>
          </div>
          <div className="grille-ressentis compacte">
            <NoteSur10 libelle="Difficulté musculaire" valeur={diffMuscu} onChange={setDiffMuscu} />
            <NoteSur10 libelle="Difficulté cardio" valeur={diffCardio} onChange={setDiffCardio} />
            <NoteSur10 libelle="Fatigue" valeur={fatigue} onChange={setFatigue} />
            <NoteSur10 libelle="Qualité du sommeil" valeur={sommeil} onChange={setSommeil} inverse />
          </div>
        </div>

        {/* Cartes de chaque membre invité sur le même écran */}
        {invites.map(cid => {
          const membre = autres.find(c => c.id === cid) ?? { id: cid, prenom: 'Participant', nom: null }
          const r = ressentiDeInvite(cid)
          const nbNotes = [r.diff_muscu, r.diff_cardio, r.fatigue, r.sommeil].filter(Boolean).length
          return (
            <div key={cid} className="carte-ressenti-membre">
              <div className="entete-ressenti-membre">
                <span className="identite-ressenti-membre">
                  <Avatar client={membre} />
                  <strong>{membre.prenom} {membre.nom}</strong>
                </span>
                <div className="ligne" style={{ gap: '.35rem' }}>
                  {aDesNotesPrincipal && (
                    <button
                      type="button"
                      className="secondaire pas-puce actif"
                      title={`Copier les 4 notes de ${client.prenom}`}
                      onClick={() => copierRessentiPrincipalVers(cid)}
                    >
                      ⎘ Idem {client.prenom}
                    </button>
                  )}
                  <span className="puce neutre">{nbNotes}/4 noté{nbNotes > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="grille-ressentis compacte">
                <NoteSur10
                  libelle="Difficulté musculaire"
                  valeur={r.diff_muscu}
                  onChange={v => majRessentiInvite(cid, 'diff_muscu', v)}
                />
                <NoteSur10
                  libelle="Difficulté cardio"
                  valeur={r.diff_cardio}
                  onChange={v => majRessentiInvite(cid, 'diff_cardio', v)}
                />
                <NoteSur10
                  libelle="Fatigue"
                  valeur={r.fatigue}
                  onChange={v => majRessentiInvite(cid, 'fatigue', v)}
                />
                <NoteSur10
                  libelle="Qualité du sommeil"
                  valeur={r.sommeil}
                  onChange={v => majRessentiInvite(cid, 'sommeil', v)}
                  inverse
                />
              </div>
              <input
                className="champ-reglage"
                aria-label={`Note spécifique pour ${membre.prenom}`}
                placeholder={`Note personnelle pour ${membre.prenom} (facultatif)…`}
                value={r.notes ?? ''}
                onChange={e => majRessentiInvite(cid, 'notes', e.target.value)}
              />
            </div>
          )
        })}
      </div>
    )

  // Données de l'exercice affiché en Mode Terrain Plein Écran
  const iTerrain = Math.min(indexTerrain, Math.max(0, lignes.length - 1))
  const lTerrain = lignes[iTerrain] ?? vide()
  const dernierTerrain = derniers[cle(lTerrain.nom)]
  const ficheTerrain = biblio[cle(lTerrain.nom)]
  const cardioTerrain = estCardio(lTerrain.nom)
  const tempsTerrain = estTemps(lTerrain)
  const propTerrain = dernierTerrain ? proposition(dernierTerrain, tempsTerrain) : null
  const supTerrain = supersets[iTerrain]
  const alertesTerrain = lTerrain.nom.trim()
    ? zonesSensiblesSollicitees(
        { nom: lTerrain.nom, groupe: ficheTerrain?.groupe, muscles: ficheTerrain?.exercice_muscles ?? [] },
        zonesSensibles,
      )
    : []
  const partenairesSuperset =
    supTerrain?.groupe !== null && supTerrain?.groupe !== undefined
      ? lignes
          .map((x, idx) => ({ ligne: x, idx, sup: supersets[idx] }))
          .filter(item => item.idx !== iTerrain && item.sup?.groupe === supTerrain.groupe)
      : []

  const exoRemplaceNom = choix?.type === 'remplacer' ? lignes[choix.index]?.nom.trim() || null : null
  const nomsParticipants = [client.prenom, ...invites.map(prenomDe)].join(' & ')

  return (
    <div className={modeTerrain ? 'terrain-plein-ecran' : undefined}>
      {/* En-tête du Mode Terrain Plein Écran */}
      {modeTerrain && (
        <div className="terrain-barre-haut">
          <div className="terrain-identite">
            <strong>{nomsParticipants}</strong>
            <span className="puce">
              {nbTermines}/{saisis.length || lignes.length} fait{nbTermines > 1 ? 's' : ''}
            </span>
          </div>
          <div className="ligne">
            <button
              type="button"
              className={`btn-compact ${ecranFinTerrain ? '' : 'secondaire'}`}
              onClick={() => setEcranFinTerrain(v => !v)}
            >
              🏁 {ecranFinTerrain ? 'Retour exos' : 'Bilan & Fin'}
            </button>
            <button
              type="button"
              className="secondaire btn-compact"
              onClick={() => setModeTerrain(false)}
            >
              ☰ Vue liste
            </button>
          </div>
        </div>
      )}

      {/* Le Chronomètre reste toujours monté au même endroit */}
      <Chronometre />

      <form onSubmit={enregistrer} className={modeTerrain ? 'terrain-formulaire' : undefined}>
        {modeTerrain ? (
          <>
            {/* Ruban horizontal des exercices en Mode Terrain */}
            <div className="terrain-ruban" role="tablist" aria-label="Exercices de la séance">
              {lignes.map((l, idx) => {
                const sup = supersets[idx]
                const actif = !ecranFinTerrain && idx === iTerrain
                const nomCourt = l.nom.trim() ? l.nom.trim().slice(0, 18) + (l.nom.trim().length > 18 ? '…' : '') : 'À choisir'
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={actif}
                    className={[
                      'terrain-onglet-exo',
                      actif ? 'actif' : '',
                      l.valide ? 'fait' : l.passe ? 'passe' : '',
                      sup.groupe !== null ? `grp-sup-${sup.groupe}` : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => {
                      setIndexTerrain(idx)
                      setEcranFinTerrain(false)
                    }}
                  >
                    <span className="terrain-onglet-num">
                      {l.valide ? '✓' : l.passe ? '⏭' : sup.etiquette ?? idx + 1}
                    </span>
                    <span className="terrain-onglet-nom">{nomCourt}</span>
                  </button>
                )
              })}
              <button
                type="button"
                className="terrain-onglet-exo ajout"
                onClick={() => setChoix({ type: 'ajout_fin' })}
              >
                + Ajouter
              </button>
            </div>

            {/* Contenu principal : soit l'écran de Fin & Bilan (avec notes de tous les membres), soit l'exercice actif */}
            {ecranFinTerrain ? (
              <div className="terrain-carte-active">
                <div className="terrain-fin-entete">
                  <h3>🏁 Fin de séance — {nomsParticipants}</h3>
                  <p className="meta">
                    {nbTermines} / {saisis.length} exercice(s) validé(s) · {nbSeries} série(s) au total
                  </p>
                </div>

                <div className="champ">
                  <span className="champ-libelle">Durée de la séance (min)</span>
                  <div className="durees-rapides">
                    {DUREES_RAPIDES.map(d => (
                      <button
                        key={d}
                        type="button"
                        className={`puce-choix${duree === d ? ' actif' : ''}`}
                        onClick={() => setDuree(duree === d ? '' : d)}
                      >
                        {d}
                      </button>
                    ))}
                    <input
                      className="duree-input"
                      inputMode="numeric"
                      placeholder="Autre"
                      value={duree}
                      onChange={e => setDuree(e.target.value)}
                    />
                  </div>
                </div>

                {/* Possibilité d'associer un partenaire directement depuis l'écran de fin */}
                {!seanceId && autres.length > 0 && (
                  <div className="participants">
                    <span className="champ-libelle">Séance partagée avec</span>
                    {puces.length > 0 && (
                      <div className="puces">
                        {puces.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className={`puce-choix${invites.includes(c.id) ? ' actif' : ''}`}
                            aria-pressed={invites.includes(c.id)}
                            onClick={() => basculerInvite(c.id)}
                          >
                            {invites.includes(c.id) ? '✓ ' : '+ '}{c.prenom}
                          </button>
                        ))}
                      </div>
                    )}
                    <select
                      aria-label="Ajouter un autre client à la séance"
                      value=""
                      onChange={e => e.target.value && setInvites(l => [...l, e.target.value])}
                    >
                      <option value="">Ajouter un autre client…</option>
                      {autres
                        .filter(c => !puces.some(p => p.id === c.id))
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.prenom} {c.nom}
                          </option>
                        ))}
                    </select>
                    {invites.length > 0 && (
                      <label className="case">
                        <input type="checkbox" checked={copierCharges} onChange={e => setCopierCharges(e.target.checked)} />
                        Copier aussi les charges et réglages
                      </label>
                    )}
                  </div>
                )}

                <div>
                  <span className="champ-libelle" style={{ display: 'block', marginBottom: '.45rem' }}>
                    {invites.length > 0
                      ? `Ressentis par participant (${invites.length + 1} personnes)`
                      : 'Ressentis & forme du jour (facultatif)'}
                  </span>
                  {blocRessentisTousMembres}
                </div>

                <Champ libelle={invites.length > 0 ? `Notes générales ou pour ${client.prenom} (facultatif)` : 'Notes de séance (facultatif)'}>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
                </Champ>

                <MessageErreur message={erreur} />
              </div>
            ) : (
              <div
                className={[
                  'terrain-carte-active',
                  supTerrain?.groupe !== null ? `superset-groupe grp-sup-${supTerrain.groupe}` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {partenairesSuperset.length > 0 && (
                  <div className="terrain-bandeau-superset">
                    <span>
                      ⛓ <strong>Superset {supTerrain.etiquette}</strong>
                    </span>
                    <div className="puces" style={{ marginTop: 0 }}>
                      {partenairesSuperset.map(p => (
                        <button
                          key={p.idx}
                          type="button"
                          className="puce-choix puce-compacte"
                          onClick={() => setIndexTerrain(p.idx)}
                        >
                          Aller à {p.sup.etiquette} : {p.ligne.nom || 'Exercice'} →
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="terrain-exo-entete">
                  <span className="terrain-badge-position">
                    {supTerrain?.etiquette ?? `Exercice ${iTerrain + 1} / ${lignes.length}`}
                  </span>
                  {lTerrain.valide && <span className="puce" style={{ background: 'var(--succes)', color: '#fff' }}>✓ Terminé</span>}
                  {lTerrain.passe && !lTerrain.valide && <span className="puce alerte-muscle">⏭ Mis de côté</span>}
                </div>

                <button
                  type="button"
                  className={`terrain-titre-bouton${lTerrain.nom.trim() ? '' : ' vide'}`}
                  onClick={() => setChoix({ type: 'remplacer', index: iTerrain })}
                >
                  <span className="terrain-titre-nom">{lTerrain.nom.trim() || 'Choisir un exercice…'}</span>
                  <span className="badge-swap-inline">⇄ {lTerrain.nom.trim() ? 'Remplacer' : 'Choisir'}</span>
                </button>

                {ficheTerrain && (ficheTerrain.groupe || ficheTerrain.materiel) && (
                  <p className="meta" style={{ marginTop: '-.25rem' }}>
                    {[ficheTerrain.groupe, ficheTerrain.materiel].filter(Boolean).join(' · ')}
                  </p>
                )}

                {alertesTerrain.length > 0 && (
                  <p className="alerte-zone" role="status">
                    ⚠ Sollicite une zone sensible de {client.prenom} :{' '}
                    <strong>{alertesTerrain.join(', ')}</strong>
                    {' · '}
                    <button
                      type="button"
                      className="lien"
                      style={{ minHeight: 'auto', padding: '0 .25rem', textDecoration: 'underline' }}
                      onClick={() => setChoix({ type: 'remplacer', index: iTerrain })}
                    >
                      Alternatives →
                    </button>
                  </p>
                )}

                {dernierTerrain && (
                  <div className="terrain-bloc-historique">
                    <DerniereFois d={dernierTerrain} temps={tempsTerrain} />
                    <div className="exercice-actions">
                      <button type="button" className="secondaire" onClick={() => copierDerniere(iTerrain)}>
                        ↺ Copier dernière
                      </button>
                      {propTerrain && (
                        <button type="button" className="secondaire" onClick={() => progresser(iTerrain)}>
                          ↑ Progresser
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {!cardioTerrain && (
                  <div className="bascule-mode" role="group" aria-label="Mesure de l'effort">
                    <button
                      type="button"
                      className={`bascule-mode-bouton${!tempsTerrain ? ' actif' : ''}`}
                      aria-pressed={!tempsTerrain}
                      onClick={() => changerMode(iTerrain, 'reps')}
                    >
                      Répétitions
                    </button>
                    <button
                      type="button"
                      className={`bascule-mode-bouton${tempsTerrain ? ' actif' : ''}`}
                      aria-pressed={tempsTerrain}
                      onClick={() => changerMode(iTerrain, 'temps')}
                    >
                      Temps
                    </button>
                  </div>
                )}

                {cardioTerrain ? (
                  <div className="compteurs">
                    <Compteur
                      libelle="Séries"
                      valeur={lTerrain.series}
                      onChange={v => maj(iTerrain, 'series', v)}
                      pas={1}
                      depart={dernierTerrain?.series ?? 3}
                      erreur={verifier(lTerrain.series, REGLES.series)}
                    />
                    <Compteur
                      libelle="Temps (sec)"
                      valeur={lTerrain.duree_sec}
                      onChange={v => maj(iTerrain, 'duree_sec', v)}
                      pas={15}
                      choixPas={PAS_SECONDES}
                      depart={dernierTerrain?.duree_sec ?? 30}
                      erreur={verifier(lTerrain.duree_sec, REGLES.duree_sec)}
                    />
                    <Compteur
                      libelle="Distance (km)"
                      valeur={lTerrain.distance_km}
                      onChange={v => maj(iTerrain, 'distance_km', v)}
                      pas={0.5}
                      depart={dernierTerrain?.distance_km ?? 1}
                      decimal
                      erreur={verifier(lTerrain.distance_km, REGLES.distance)}
                    />
                  </div>
                ) : tempsTerrain ? (
                  <div className="compteurs">
                    <Compteur
                      libelle="Séries"
                      valeur={lTerrain.series}
                      onChange={v => maj(iTerrain, 'series', v)}
                      pas={1}
                      depart={dernierTerrain?.series ?? 3}
                      erreur={verifier(lTerrain.series, REGLES.series)}
                    />
                    <Compteur
                      libelle="Durée (sec)"
                      valeur={lTerrain.duree_sec}
                      onChange={v => maj(iTerrain, 'duree_sec', v)}
                      pas={5}
                      choixPas={PAS_SECONDES}
                      depart={dernierTerrain?.duree_sec ?? 30}
                      erreur={verifier(lTerrain.duree_sec, REGLES.duree_sec)}
                    />
                    <Compteur
                      libelle="Charge (kg)"
                      valeur={lTerrain.charge_kg}
                      onChange={v => maj(iTerrain, 'charge_kg', v)}
                      pas={PAS_KG}
                      choixPas={PAS_CHARGE}
                      depart={dernierTerrain?.charge_kg ?? PAS_KG}
                      decimal
                      erreur={verifier(lTerrain.charge_kg, REGLES.charge)}
                    />
                  </div>
                ) : (
                  <div className="compteurs">
                    <Compteur
                      libelle="Séries"
                      valeur={lTerrain.series}
                      onChange={v => maj(iTerrain, 'series', v)}
                      pas={1}
                      depart={3}
                      erreur={verifier(lTerrain.series, REGLES.series)}
                    />
                    <Compteur
                      libelle="Répétitions"
                      valeur={lTerrain.repetitions}
                      onChange={v => maj(iTerrain, 'repetitions', v)}
                      pas={1}
                      depart={dernierTerrain?.repetitions ?? 10}
                      erreur={verifier(lTerrain.repetitions, REGLES.repetitions)}
                    />
                    <Compteur
                      libelle="Charge (kg)"
                      valeur={lTerrain.charge_kg}
                      onChange={v => maj(iTerrain, 'charge_kg', v)}
                      pas={PAS_KG}
                      choixPas={PAS_CHARGE}
                      depart={dernierTerrain?.charge_kg ?? PAS_KG}
                      decimal
                      erreur={verifier(lTerrain.charge_kg, REGLES.charge)}
                    />
                  </div>
                )}

                <ChampRepos
                  valeur={lTerrain.repos_sec}
                  onChange={v => maj(iTerrain, 'repos_sec', v)}
                  erreur={verifier(lTerrain.repos_sec, REGLES.duree_sec)}
                />

                <div className="champ">
                  <span className="champ-libelle">⚙ Réglage matériel / mémo client</span>
                  <input
                    className="champ-reglage"
                    aria-label="Mémo de réglage pour cet exercice"
                    placeholder="Ex. élastique rouge, poulie cran 4, banc 30°…"
                    value={lTerrain.reglage}
                    onChange={e => maj(iTerrain, 'reglage', e.target.value)}
                  />
                </div>

                {ficheTerrain && <FicheExercice b={ficheTerrain} />}

                <div className="exercice-pied">
                  {iTerrain < lignes.length - 1 && (
                    <button
                      type="button"
                      className={`lien superset-lien${lTerrain.lie_suivant ? ' actif' : ''}`}
                      onClick={() => maj(iTerrain, 'lie_suivant', !lTerrain.lie_suivant)}
                    >
                      {lTerrain.lie_suivant ? '⛓ Superset actif' : '+ Superset avec suivant'}
                    </button>
                  )}
                  <button
                    type="button"
                    className="lien superset-lien"
                    onClick={() => setChoix({ type: 'inserer_apres', index: iTerrain })}
                  >
                    +↓ Insérer un exo après
                  </button>
                  <div className="exercice-outils">
                    {lTerrain.nom.trim() && (
                      <button type="button" className="lien outil" title="Dupliquer" onClick={() => dupliquer(iTerrain)}>
                        ⎘
                      </button>
                    )}
                    <button type="button" className="lien danger outil" title="Supprimer cet exercice" onClick={() => retirer(iTerrain)}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Barre d'actions fixe en bas du Mode Terrain Plein Écran */}
            <div className="terrain-barre-bas">
              {ecranFinTerrain ? (
                <>
                  <button type="button" className="secondaire" onClick={() => setEcranFinTerrain(false)}>
                    ← Retour aux exercices
                  </button>
                  <button type="submit" disabled={envoi || Boolean(invalide)} style={{ flex: 2 }}>
                    {envoi
                      ? 'Enregistrement…'
                      : seanceId
                        ? 'Enregistrer'
                        : invites.length > 0
                          ? `✓ Enregistrer pour ${invites.length + 1} clients`
                          : '✓ Enregistrer la séance'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="secondaire"
                    onClick={() => passerExerciceTerrain(iTerrain)}
                  >
                    ⏭ Passer
                  </button>
                  <button
                    type="button"
                    className="secondaire"
                    onClick={() => setChoix({ type: 'remplacer', index: iTerrain })}
                  >
                    ⇄ Remplacer
                  </button>
                  <button
                    type="button"
                    className="btn-terrain-valider"
                    onClick={() => validerTerrainEtAvancer(iTerrain)}
                  >
                    ✓ Fait & Suivant
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          /* ================= VUE LISTE CLASSIQUE (Préparation / Bureau) ================= */
          <>
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
                    <p className="meta">
                      La séance sera enregistrée pour chaque participant ({nomsParticipants}). Tu pourras noter les ressentis (1 à 10) de chacun en bas de page.
                    </p>
                    <label className="case">
                      <input type="checkbox" checked={copierCharges} onChange={e => setCopierCharges(e.target.checked)} />
                      Copier aussi les charges et réglages (sinon à compléter dans leur profil)
                    </label>
                  </>
                )}
              </div>
            )}

            <div className="entete-exercices-terrain">
              <h3>Exercices</h3>
              <div className="actions-entete-exos">
                {peutToutProgresser && (
                  <button
                    type="button"
                    className="secondaire btn-compact"
                    title="Appliquer la progression automatique sur tous les exercices"
                    onClick={progresserTouteLaSeance}
                  >
                    ↑ Tout progresser
                  </button>
                )}
                <button
                  type="button"
                  className="btn-compact"
                  onClick={() => ouvrirModeTerrain()}
                >
                  ⚡ Mode Terrain plein écran
                </button>
              </div>
            </div>

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
                {modelesFavoris.length > 0 && (
                  <div className="puces">
                    <span className="meta">★ Favoris :</span>
                    {modelesFavoris.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        className={`puce-choix${modeleChargeId === m.id ? ' actif' : ''}`}
                        onClick={() => appliquerModele(m.id)}
                      >
                        ★ {m.nom}
                      </button>
                    ))}
                  </div>
                )}
                {modeles.length > 0 && (
                  <select value={modeleChargeId ?? ''} onChange={e => appliquerModele(e.target.value)}>
                    <option value="">Charger un modèle…</option>
                    {modeles.map(m => (
                      <option key={m.id} value={m.id}>
                        {modelesFavIds.has(m.id) ? `★ ${m.nom}` : m.nom}
                      </option>
                    ))}
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

              const alertesZones = l.nom.trim()
                ? zonesSensiblesSollicitees(
                    { nom: l.nom, groupe: fiche?.groupe, muscles: fiche?.exercice_muscles ?? [] },
                    zonesSensibles,
                  )
                : []
              const afficherReglage = Boolean(l.reglage.trim() || l.reglageOuvert)

              const resumeCompact = temps
                ? [
                    resumeCardio({ series: num(l.series), duree_sec: num(l.duree_sec), distance_km: num(l.distance_km) }),
                    l.charge_kg ? `@ ${l.charge_kg} kg` : '',
                  ].filter(Boolean).join(' ')
                : [l.series && l.repetitions ? `${l.series}×${l.repetitions}` : '', l.charge_kg ? `@ ${l.charge_kg} kg` : '']
                    .filter(Boolean)
                    .join(' ')
              const reposTxt = libelleRepos(num(l.repos_sec))

              if (l.valide && l.nom.trim()) {
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
                      <button
                        type="button"
                        className="exercice-compact-texte"
                        onClick={() => maj(i, 'valide', false)}
                      >
                        <strong>{l.nom}</strong>
                        {resumeCompact && <span> — {resumeCompact}</span>}
                        {reposTxt && <small className="meta"> · repos {reposTxt}</small>}
                        {l.reglage.trim() && <small className="meta"> · ⚙ {l.reglage}</small>}
                      </button>
                      <button
                        type="button"
                        className="lien outil"
                        title="Ouvrir en Mode Terrain"
                        onClick={() => ouvrirModeTerrain(i)}
                      >
                        ⚡
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
                        title="Marquer comme fait, lancer le repos et replier"
                        aria-label="Marquer cet exercice comme fait et replier"
                        onClick={() => validerExerciceSimple(i)}
                      >
                        ✓
                      </button>
                    )}
                    {sup.etiquette && <span className="puce superset-badge">{sup.etiquette}</span>}
                    <button
                      type="button"
                      className={`exercice-nom${l.nom.trim() ? '' : ' vide'}`}
                      onClick={() => setChoix({ type: 'remplacer', index: i })}
                      aria-label={l.nom.trim() ? `Remplacer l'exercice : ${l.nom}` : 'Choisir un exercice'}
                    >
                      <span>{l.nom.trim() || 'Choisir un exercice…'}</span>
                      {l.nom.trim() && <span className="badge-swap-inline">⇄ Remplacer</span>}
                    </button>
                    {l.nom.trim() && (
                      <button
                        type="button"
                        className="lien outil"
                        title="Ouvrir cet exercice en Mode Terrain plein écran"
                        onClick={() => ouvrirModeTerrain(i)}
                      >
                        ⚡
                      </button>
                    )}
                    <button type="button" className="lien danger outil" aria-label="Retirer cet exercice" onClick={() => retirer(i)}>✕</button>
                  </div>

                  {alertesZones.length > 0 && (
                    <p className="alerte-zone" role="status">
                      ⚠ Sollicite une zone sensible de {client.prenom} :{' '}
                      <strong>{alertesZones.join(', ')}</strong>
                      {' · '}
                      <button
                        type="button"
                        className="lien"
                        style={{ minHeight: 'auto', padding: '0 .25rem', textDecoration: 'underline' }}
                        onClick={() => setChoix({ type: 'remplacer', index: i })}
                      >
                        Voir les alternatives adaptées →
                      </button>
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

                  <ChampRepos valeur={l.repos_sec} onChange={v => maj(i, 'repos_sec', v)} erreur={verifier(l.repos_sec, REGLES.duree_sec)} />

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
                      <button type="button" className="lien superset-lien" onClick={() => maj(i, 'reglageOuvert', true)}>
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
                    <button
                      type="button"
                      className="lien superset-lien"
                      title="Insérer un exercice juste en dessous"
                      onClick={() => setChoix({ type: 'inserer_apres', index: i })}
                    >
                      +↓ Insérer dessous
                    </button>
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
              <button type="button" onClick={() => setChoix({ type: 'ajout_fin' })} style={{ flex: 2 }}>
                + Ajouter des exercices
              </button>
              {modeleChargeId && (
                <button
                  type="button"
                  className="secondaire"
                  disabled={envoi || Boolean(invalide)}
                  onClick={mettreAJourModeleCharge}
                  style={{ flex: 1 }}
                >
                  Mettre à jour le modèle
                </button>
              )}
              <button type="button" className="secondaire" onClick={() => setFeuilleModele(true)} style={{ flex: 1 }}>
                {modeleChargeId ? 'Nouveau modèle' : 'Créer un modèle'}
              </button>
            </div>

            <h3>
              {invites.length > 0
                ? `Ressentis & forme du jour (${invites.length + 1} participants)`
                : 'Ressentis & forme du jour (facultatif)'}
            </h3>
            {blocRessentisTousMembres}

            <Champ libelle={invites.length > 0 ? `Notes communes ou pour ${client.prenom} (facultatif)` : 'Notes de séance (facultatif)'}>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} />
            </Champ>
            <MessageErreur message={erreur} />
            <div className="barre-enregistrement">
              <span className="resume">
                {saisis.length} exercice{saisis.length > 1 ? 's' : ''}
                <small>
                  {nbSeries} série{nbSeries > 1 ? 's' : ''}
                  {invites.length > 0 ? ` · ${invites.length + 1} clients` : ''}
                </small>
              </span>
              <button type="submit" disabled={envoi || Boolean(invalide)}>
                {envoi
                  ? 'Enregistrement…'
                  : seanceId
                    ? 'Enregistrer'
                    : invites.length > 0
                      ? `Enregistrer (${invites.length + 1} clients)`
                      : 'Enregistrer la séance'}
              </button>
            </div>
          </>
        )}
      </form>

      {choix !== null && (
        <SelecteurExercice
          exercices={choixExercices}
          faits={faits}
          zonesSensibles={zonesSensibles}
          multiple={choix.type !== 'remplacer'}
          remplacementDe={exoRemplaceNom}
          conserverParametres={conserverParametres}
          onChangeConserverParametres={setConserverParametres}
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
    </div>
  )
}
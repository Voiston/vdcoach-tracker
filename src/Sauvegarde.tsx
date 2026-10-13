import { useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { aujourdhui, joursDepuis } from './format'
import { useNotifier } from './ui'

type Ligne = Record<string, any>
const CLE = 'vdcoach_derniere_sauvegarde'
const TABLES = ['bibliotheque_exercices', 'exercice_muscles', 'clients', 'modeles', 'modele_exercices', 'seances', 'exercices', 'mesures', 'objectifs'] as const
const FACULTATIVES: string[] = ['bibliotheque_exercices', 'exercice_muscles', 'modeles', 'modele_exercices', 'objectifs']
type Donnees = { version: number; exporte_le?: string } & Record<(typeof TABLES)[number], Ligne[]>

async function toutes(table: string): Promise<Ligne[]> {
  const lignes: Ligne[] = []
  for (let debut = 0; ; debut += 1000) {
    let q = supabase.from(table).select('*')
    q = table === 'exercice_muscles' ? q.order('exercice_id').order('muscle') : q.order('id')
    const { data, error } = await q.range(debut, debut + 999)
    if (error) throw new Error(messageErreur(error))
    lignes.push(...data)
    if (data.length < 1000) return lignes
  }
}

function telecharger(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  a.click()
  URL.revokeObjectURL(url)
}

const cellule = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`

function ligneValide(table: string, l: Ligne): boolean {
  if (!l || typeof l !== 'object') return false
  if (table === 'exercice_muscles') return typeof l.exercice_id === 'string' && typeof l.muscle === 'string'
  return typeof l.id === 'string'
}

export default function Sauvegarde() {
  const [etat, setEtat] = useState('')
  const notifier = useNotifier()
  const [derniere, setDerniere] = useState<string | null>(localStorage.getItem(CLE))
  const [apercu, setApercu] = useState<Donnees | null>(null)
  const jours = derniere ? joursDepuis(derniere) : null

  async function exporter(format: 'json' | 'csv') {
    setEtat('Export en cours…')
    try {
      const [clients, seances, exercices, mesures, bibliotheque_exercices, modeles, modele_exercices, objectifs, exercice_muscles] = await Promise.all(
        ['clients', 'seances', 'exercices', 'mesures', 'bibliotheque_exercices', 'modeles', 'modele_exercices', 'objectifs', 'exercice_muscles'].map(toutes),
      )
      const jour = aujourdhui()

      if (format === 'json') {
        const maintenant = new Date().toISOString()
        const contenu = JSON.stringify({ version: 1, exporte_le: maintenant, clients, seances, exercices, mesures, bibliotheque_exercices, modeles, modele_exercices, objectifs, exercice_muscles }, null, 2)
        telecharger(`vdcoach-sauvegarde-${jour}.json`, contenu, 'application/json')
        localStorage.setItem(CLE, maintenant)
        setDerniere(maintenant)
      } else {
        const nomClient = new Map(clients.map(c => [c.id, `${c.prenom} ${c.nom ?? ''}`.trim()]))
        const lignes = [...seances]
          .sort((a, b) => a.date_seance.localeCompare(b.date_seance))
          .flatMap(s => {
            const base = [s.date_seance, nomClient.get(s.client_id), s.duree_min, s.diff_muscu ?? s.ressenti, s.diff_cardio, s.fatigue, s.sommeil]
            const exos = exercices.filter(x => x.seance_id === s.id).sort((a, b) => a.ordre - b.ordre)
            return (exos.length ? exos : [{}]).map(x =>
              [...base, x.nom, x.series, x.repetitions, x.charge_kg, x.duree_sec, x.distance_km, x.reglage, s.notes].map(cellule).join(';'),
            )
          })
        const entete = ['date', 'client', 'duree_min', 'diff_muscu', 'diff_cardio', 'fatigue', 'sommeil', 'exercice', 'series', 'repetitions', 'charge_kg', 'duree_sec', 'distance_km', 'reglage', 'notes'].join(';')
        telecharger(`vdcoach-seances-${jour}.csv`, '\uFEFF' + [entete, ...lignes].join('\r\n'), 'text/csv;charset=utf-8')
      }
      setEtat('Export terminé.')
      notifier('Fichier téléchargé')
    } catch (e) {
      setEtat(`Erreur : ${(e as Error).message}`)
    }
  }

  async function lire(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    e.target.value = ''
    if (!fichier) return
    try {
      const d = JSON.parse(await fichier.text())
      const valide =
        d?.version === 1 &&
        TABLES.every(t => (d[t] === undefined && FACULTATIVES.includes(t)) || (Array.isArray(d[t]) && d[t].every((l: Ligne) => ligneValide(t, l))))
      if (!valide) throw new Error('fichier de sauvegarde non reconnu.')
      for (const t of TABLES) d[t] ??= []
      setApercu(d)
      setEtat('')
    } catch {
      setApercu(null)
      setEtat('Erreur : ce fichier n’est pas une sauvegarde valide.')
    }
  }

  async function restaurer() {
    if (!apercu || !window.confirm('Restaurer ces données ? Les lignes du fichier seront ajoutées ou mises à jour, rien ne sera supprimé.')) return
    setEtat('Restauration en cours…')
    try {
      for (const t of TABLES) {
        const lignes = apercu[t]
        if (!lignes.length) continue
        const onConflict = t === 'exercice_muscles' && !('id' in lignes[0]) ? 'exercice_id,muscle' : 'id'
        for (let i = 0; i < lignes.length; i += 500) {
          const { error } = await supabase.from(t).upsert(lignes.slice(i, i + 500), { onConflict })
          if (error) throw new Error(`${t} : ${messageErreur(error)}`)
        }
      }
      setApercu(null)
      setEtat('Restauration terminée.')
      notifier('Données restaurées')
    } catch (e) {
      setEtat(`Erreur : ${(e as Error).message}`)
    }
  }

  return (
    <section>
      <h3>Sauvegarde</h3>
      <p className={jours === null || jours > 30 ? 'erreur' : 'meta'}>
        {jours === null ? 'Aucune sauvegarde effectuée sur cet appareil.' : `Dernière sauvegarde : il y a ${jours} jour(s).`}
      </p>
      <div className="ligne">
        <button type="button" onClick={() => exporter('json')}>Sauvegarde complète (JSON)</button>
        <button type="button" className="secondaire" onClick={() => exporter('csv')}>Séances (CSV)</button>
      </div>
      <h3>Restauration</h3>
      <p className="meta">Importe un fichier de sauvegarde JSON : ses données sont ajoutées ou mises à jour, rien n'est supprimé.</p>
      <input type="file" accept="application/json,.json" onChange={lire} />
      {apercu && (
        <>
          <p className="meta">
            Sauvegarde du {apercu.exporte_le ? new Date(apercu.exporte_le).toLocaleDateString('fr-FR') : 'date inconnue'} :{' '}
            {apercu.clients.length} client(s), {apercu.seances.length} séance(s), {apercu.exercices.length} exercice(s), {apercu.mesures.length} mesure(s).
          </p>
          <button type="button" onClick={restaurer}>Restaurer ces données</button>
        </>
      )}
      {etat && <p className="meta">{etat}</p>}
    </section>
  )
}
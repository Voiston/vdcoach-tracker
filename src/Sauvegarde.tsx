import { useState } from 'react'
import { supabase } from './supabase'
import { useNotifier } from './ui'

type Ligne = Record<string, any>
const CLE = 'vdcoach_derniere_sauvegarde'
// Ordre de restauration : les tables liées passent après celles dont elles dépendent
const TABLES = ['bibliotheque_exercices', 'clients', 'modeles', 'modele_exercices', 'seances', 'exercices', 'mesures', 'objectifs'] as const
// Absentes des anciennes sauvegardes : facultatives à l'import
const FACULTATIVES: string[] = ['bibliotheque_exercices', 'modeles', 'modele_exercices', 'objectifs']
type Donnees = { version: number; exporte_le?: string } & Record<(typeof TABLES)[number], Ligne[]>

// L'API renvoie 1000 lignes maximum par requête : on pagine pour tout récupérer.
async function toutes(table: string): Promise<Ligne[]> {
  const lignes: Ligne[] = []
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase.from(table).select('*').order('id').range(debut, debut + 999)
    if (error) throw error
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

export default function Sauvegarde() {
  const [etat, setEtat] = useState('')
  const notifier = useNotifier()
  const [derniere, setDerniere] = useState<string | null>(localStorage.getItem(CLE))
  const [apercu, setApercu] = useState<Donnees | null>(null)
  const jours = derniere ? Math.floor((Date.now() - Date.parse(derniere)) / 86_400_000) : null

  async function exporter(format: 'json' | 'csv') {
    setEtat('Export en cours…')
    try {
      const [clients, seances, exercices, mesures, bibliotheque_exercices, modeles, modele_exercices, objectifs] = await Promise.all(
        ['clients', 'seances', 'exercices', 'mesures', 'bibliotheque_exercices', 'modeles', 'modele_exercices', 'objectifs'].map(toutes),
      )
      const jour = new Date().toLocaleDateString('sv-SE')

      if (format === 'json') {
        const maintenant = new Date().toISOString()
        const contenu = JSON.stringify({ version: 1, exporte_le: maintenant, clients, seances, exercices, mesures, bibliotheque_exercices, modeles, modele_exercices, objectifs }, null, 2)
        telecharger(`vdcoach-sauvegarde-${jour}.json`, contenu, 'application/json')
        localStorage.setItem(CLE, maintenant)
        setDerniere(maintenant)
      } else {
        const nomClient = new Map(clients.map(c => [c.id, `${c.prenom} ${c.nom ?? ''}`.trim()]))
        const lignes = [...seances]
          .sort((a, b) => a.date_seance.localeCompare(b.date_seance))
          .flatMap(s => {
            const base = [s.date_seance, nomClient.get(s.client_id), s.duree_min, s.ressenti]
            const exos = exercices.filter(x => x.seance_id === s.id).sort((a, b) => a.ordre - b.ordre)
            return (exos.length ? exos : [{}]).map(x =>
              [...base, x.nom, x.series, x.repetitions, x.charge_kg, s.notes].map(cellule).join(';'),
            )
          })
        const entete = ['date', 'client', 'duree_min', 'ressenti', 'exercice', 'series', 'repetitions', 'charge_kg', 'notes'].join(';')
        // BOM + séparateur « ; » : s'ouvre correctement dans Excel / LibreOffice en français
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
      const valide = d?.version === 1 && TABLES.every(t => (d[t] === undefined && FACULTATIVES.includes(t)) || (Array.isArray(d[t]) && d[t].every((l: Ligne) => typeof l?.id === 'string')))
      if (!valide) throw new Error('fichier de sauvegarde non reconnu.')
      for (const t of TABLES) d[t] ??= []
      setApercu(d)
      setEtat('')
    } catch (err) {
      setApercu(null)
      setEtat(`Erreur : ${(err as Error).message}`)
    }
  }

  // Fusion : les lignes du fichier sont ajoutées ou mises à jour (même identifiant), rien n'est supprimé.
  // Les tables sont traitées dans l'ordre des dépendances ; on peut relancer sans risque en cas d'interruption.
  async function restaurer() {
    if (!apercu || !window.confirm('Restaurer ces données ? Les lignes du fichier seront ajoutées ou mises à jour, rien ne sera supprimé.')) return
    setEtat('Restauration en cours…')
    try {
      for (const t of TABLES) {
        const lignes = apercu[t]
        for (let i = 0; i < lignes.length; i += 500) {
          const { error } = await supabase.from(t).upsert(lignes.slice(i, i + 500), { onConflict: 'id' })
          if (error) throw new Error(`${t} : ${error.message}`)
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

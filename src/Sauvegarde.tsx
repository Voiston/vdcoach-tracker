import { useState } from 'react'
import { supabase } from './supabase'

type Ligne = Record<string, any>
const CLE = 'vdcoach_derniere_sauvegarde'

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
  const [derniere, setDerniere] = useState<string | null>(localStorage.getItem(CLE))
  const jours = derniere ? Math.floor((Date.now() - Date.parse(derniere)) / 86_400_000) : null

  async function exporter(format: 'json' | 'csv') {
    setEtat('Export en cours…')
    try {
      const [clients, seances, exercices, mesures] = await Promise.all(
        ['clients', 'seances', 'exercices', 'mesures'].map(toutes),
      )
      const jour = new Date().toLocaleDateString('sv-SE')

      if (format === 'json') {
        const maintenant = new Date().toISOString()
        const contenu = JSON.stringify({ version: 1, exporte_le: maintenant, clients, seances, exercices, mesures }, null, 2)
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
      {etat && <p className="meta">{etat}</p>}
    </section>
  )
}

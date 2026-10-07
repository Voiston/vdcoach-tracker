import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { EtatVide, MessageErreur, Squelette, useClient } from './ui'
import type { Rubrique } from './Profil'

type Derniere = { id: string; date_seance: string; duree_min: number | null; exercices: { nom: string; ordre: number }[] }
const courte = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

export default function Apercu({ onRubrique }: { onRubrique: (r: Rubrique) => void }) {
  const client = useClient()
  const [pret, setPret] = useState(false)
  const [erreur, setErreur] = useState('')
  const [total, setTotal] = useState(0)
  const [ceMois, setCeMois] = useState(0)
  const [dernieres, setDernieres] = useState<Derniere[]>([])

  async function charger() {
    const debutMois = `${new Date().toLocaleDateString('sv-SE').slice(0, 7)}-01`
    const [t, m, d] = await Promise.all([
      supabase.from('seances').select('id', { count: 'exact', head: true }).eq('client_id', client.id),
      supabase.from('seances').select('id', { count: 'exact', head: true }).eq('client_id', client.id).gte('date_seance', debutMois),
      supabase.from('seances').select('id, date_seance, duree_min, exercices(nom, ordre)').eq('client_id', client.id)
        .order('date_seance', { ascending: false }).order('created_at', { ascending: false }).limit(3),
    ])
    setPret(true)
    const err = t.error ?? m.error ?? d.error
    if (err) return setErreur(messageErreur(err))
    setErreur('')
    setTotal(t.count ?? 0)
    setCeMois(m.count ?? 0)
    setDernieres(d.data as unknown as Derniere[])
  }

  useEffect(() => {
    setPret(false)
    charger()
  }, [client.id])

  return (
    <section>
      <MessageErreur message={erreur} reessayer={charger} />
      {!pret && !erreur && <Squelette lignes={3} />}
      {pret && !erreur && (
        <>
          <div className="stats">
            <div><strong>{total}</strong><span>séances</span></div>
            <div><strong>{ceMois}</strong><span>ce mois-ci</span></div>
            <div><strong>{dernieres[0] ? courte(dernieres[0].date_seance) : '—'}</strong><span>dernière</span></div>
          </div>

          {client.objectifs && (
            <>
              <h3>Objectifs</h3>
              <p>{client.objectifs}</p>
            </>
          )}

          <h3>Dernières séances</h3>
          {dernieres.length ? (
            <ul className="liste">
              {dernieres.map(s => (
                <li key={s.id}>
                  <div>
                    <strong>{dateFr(s.date_seance)}</strong>
                    <p className="meta">
                      {[...s.exercices].sort((a, b) => a.ordre - b.ordre).map(x => x.nom).join(', ') || 'Aucun exercice saisi'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EtatVide titre="Aucune séance pour l'instant" texte={`Enregistre la première séance de ${client.prenom}.`} action={{ libelle: 'Nouvelle séance', onClick: () => onRubrique('seance') }} />
          )}

          <div className="ligne" style={{ marginTop: '1rem' }}>
            <button type="button" className="secondaire" onClick={() => onRubrique('seances')}>Toutes les séances</button>
            <button type="button" className="secondaire" onClick={() => onRubrique('suivi')}>Voir le suivi</button>
          </div>
        </>
      )}
    </section>
  )
}

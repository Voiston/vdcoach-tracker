import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { MUSCLES, NIVEAUX, niveauDe } from './definitions'
import { Champ, EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useAller, useNotifier, useOccupe } from './ui'

const GROUPES = ['Jambes', 'Fessiers', 'Pectoraux', 'Dos', 'Épaules', 'Bras', 'Abdominaux', 'Corps entier', 'Cardio', 'Mobilité']
const MATERIELS = ['Poids du corps', 'Haltères', 'Kettlebell', 'Élastique', 'Barre de traction', 'Sangles de suspension', 'Chaise / banc', 'Swiss ball', 'Corde à sauter', 'Autre']

type Reference = { id: string; nom: string; groupe: string; materiel: string; notes: string | null; video_url: string | null; exercice_muscles: { muscle: string; coefficient: number }[] }
type Formulaire = { id?: string; nom: string; groupe: string; materiel: string; notes: string; video_url: string; muscles: { muscle: string; coefficient: string }[] }

const vide = (): Formulaire => ({ nom: '', groupe: GROUPES[0], materiel: MATERIELS[0], notes: '', video_url: '', muscles: [] })
const lienSur = (u: string | null) => (u && /^https?:\/\//i.test(u) ? u : null) // refuse javascript:, etc.

export default function Bibliotheque() {
  const [liste, setListe] = useState<Reference[]>([])
  const [groupe, setGroupe] = useState('')
  const [recherche, setRecherche] = useState('')
  const [form, setForm] = useState<Formulaire | null>(null)
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()
  const [charge, setCharge] = useState(false)
  const notifier = useNotifier()
  const [masques, setMasques] = useState<string[]>([])

  async function charger() {
    const { data, error } = await supabase.from('bibliotheque_exercices').select('*, exercice_muscles(muscle, coefficient)').order('groupe').order('nom')
    setCharge(true)
    if (error) setErreur(messageErreur(error))
    else setListe(data as Reference[])
  }

  useEffect(() => {
    charger()
  }, [])

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const url = form.video_url.trim()
    if (url && !lienSur(url)) return setErreur('Le lien vidéo doit commencer par http:// ou https://')
    const champs = { nom: form.nom.trim(), groupe: form.groupe, materiel: form.materiel, notes: form.notes.trim() || null, video_url: url || null }
    const message = (code?: string) => (code === '23505' ? 'Un exercice porte déjà ce nom.' : undefined)

    let id = form.id
    if (id) {
      const { error } = await supabase.from('bibliotheque_exercices').update(champs).eq('id', id)
      if (error) return setErreur(message(error.code) ?? messageErreur(error))
    } else {
      const { data, error } = await supabase.from('bibliotheque_exercices').insert(champs).select('id').single()
      if (error) return setErreur(message(error.code) ?? messageErreur(error))
      id = data.id as string
      setForm({ ...form, id }) // en cas d'échec plus bas, un nouvel essai ne recrée pas l'exercice
    }

    // Muscles sollicités : on remplace l'ensemble (un muscle ne peut apparaître qu'une fois)
    const muscles = [...new Map(form.muscles.filter(m => m.muscle).map(m => [m.muscle, Number(m.coefficient)])).entries()]
    const suppression = await supabase.from('exercice_muscles').delete().eq('exercice_id', id)
    if (suppression.error) return setErreur(messageErreur(suppression.error))
    if (muscles.length) {
      const { error } = await supabase.from('exercice_muscles').insert(muscles.map(([muscle, coefficient]) => ({ exercice_id: id, muscle, coefficient })))
      if (error) return setErreur(messageErreur(error))
    }

    setForm(null)
    setErreur('')
    charger()
    notifier(form.id ? 'Exercice modifié' : 'Exercice ajouté')
  }

  function supprimer(x: Reference) {
    supprimerAvecAnnulation({
      notifier,
      message: `« ${x.nom} » supprimé`,
      masquer: () => setMasques(l => [...l, x.id]),
      restaurer: () => setMasques(l => l.filter(id => id !== x.id)),
      effacer: async () => {
        const { error } = await supabase.from('bibliotheque_exercices').delete().eq('id', x.id)
        if (!error) charger()
        return error
      },
    })
  }

  const affiches = liste.filter(x => !masques.includes(x.id) && (!groupe || x.groupe === groupe) && x.nom.toLowerCase().includes(recherche.trim().toLowerCase()))

  return (
    <section>
      <h2>Exercices</h2>
      <MessageErreur message={erreur} reessayer={charger} />

      {form ? (
        <form onSubmit={e => lancer(() => enregistrer(e))}>
          <Champ libelle="Nom"><input autoComplete="off" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required /></Champ>
          <div className="ligne">
            <Champ libelle="Groupe musculaire"><select value={form.groupe} onChange={e => setForm({ ...form, groupe: e.target.value })}>
              {GROUPES.map(g => <option key={g}>{g}</option>)}
            </select></Champ>
            <Champ libelle="Matériel"><select value={form.materiel} onChange={e => setForm({ ...form, materiel: e.target.value })}>
              {MATERIELS.map(m => <option key={m}>{m}</option>)}
            </select></Champ>
          </div>
          <Champ libelle="Consignes de technique (facultatif)"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Champ>
          <Champ libelle="Lien vidéo (facultatif)"><input inputMode="url" type="url" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} /></Champ>
          <fieldset>
            <legend>Muscles sollicités</legend>
            {form.muscles.map((m, i) => (
              <div className="ligne" key={i}>
                <select aria-label="Muscle" value={m.muscle} onChange={e => setForm({ ...form, muscles: form.muscles.map((x, j) => (j === i ? { ...x, muscle: e.target.value } : x)) })}>
                  {Object.entries(MUSCLES).map(([k, libelle]) => <option key={k} value={k}>{libelle}</option>)}
                </select>
                <select aria-label="Niveau de sollicitation" value={m.coefficient} onChange={e => setForm({ ...form, muscles: form.muscles.map((x, j) => (j === i ? { ...x, coefficient: e.target.value } : x)) })}>
                  {NIVEAUX.map(n => <option key={n.valeur} value={String(n.valeur)}>{n.libelle}</option>)}
                </select>
                <button type="button" className="lien danger" aria-label="Retirer ce muscle" onClick={() => setForm({ ...form, muscles: form.muscles.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button
              type="button"
              className="secondaire"
              onClick={() => setForm({ ...form, muscles: [...form.muscles, { muscle: Object.keys(MUSCLES).find(k => !form.muscles.some(m => m.muscle === k)) ?? 'quadriceps', coefficient: form.muscles.length ? '0.5' : '1' }] })}
            >
              + Ajouter un muscle
            </button>
            <p className="champ-aide">Principal : le muscle qui travaille le plus. Secondaire : environ la moitié. Stabilisateur : environ un quart. Ces niveaux pondèrent le calcul des séries par muscle.</p>
          </fieldset>
          <button type="submit" disabled={occupe}>{occupe ? 'Enregistrement…' : form.id ? 'Enregistrer' : "Ajouter l'exercice"}</button>
          <button type="button" className="secondaire" onClick={() => { setForm(null); setErreur('') }}>Annuler</button>
        </form>
      ) : (
        <button type="button" onClick={() => setForm(vide())}>+ Nouvel exercice</button>
      )}

      <div className="ligne">
        <select aria-label="Filtrer par groupe" value={groupe} onChange={e => setGroupe(e.target.value)}>
          <option value="">Tous les groupes</option>
          {GROUPES.map(g => <option key={g}>{g}</option>)}
        </select>
        <input aria-label="Rechercher un exercice" placeholder="Rechercher…" value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      {!charge && !erreur && <Squelette lignes={5} />}
      <ul className="liste" hidden={!charge}>
        {affiches.map(x => (
          <li key={x.id}>
            <div>
              <strong>{x.nom}</strong>
              <p className="meta">{x.groupe} · {x.materiel}</p>
              {x.exercice_muscles.length > 0 && (
                <div className="puces">
                  <span className="meta">Muscles :</span>
                  {[...x.exercice_muscles].sort((a, b) => Number(b.coefficient) - Number(a.coefficient)).map(m => (
                    <span key={m.muscle} className={`puce ${niveauDe(Number(m.coefficient))}`}>{MUSCLES[m.muscle] ?? m.muscle}</span>
                  ))}
                </div>
              )}
              {x.notes && <p>{x.notes}</p>}
              {lienSur(x.video_url) && <a href={lienSur(x.video_url)!} target="_blank" rel="noopener noreferrer">Vidéo</a>}
            </div>
            <div className="ligne">
              <button className="lien" onClick={() => { setForm({ id: x.id, nom: x.nom, groupe: x.groupe, materiel: x.materiel, notes: x.notes ?? '', video_url: x.video_url ?? '', muscles: x.exercice_muscles.map(m => ({ muscle: m.muscle, coefficient: String(Number(m.coefficient)) })) }); setErreur('') }}>Modifier</button>
              <button className="lien danger" onClick={() => supprimer(x)}>Supprimer</button>
            </div>
          </li>
        ))}
      </ul>
      {charge && !affiches.length && (liste.length
        ? <EtatVide titre="Aucun exercice trouvé" texte="Essaie une autre recherche ou un autre groupe." action={{ libelle: 'Réinitialiser les filtres', onClick: () => { setGroupe(''); setRecherche('') } }} />
        : <EtatVide titre="Bibliothèque vide" texte="Ajoute tes exercices pour les retrouver en séance." action={{ libelle: 'Ajouter un exercice', onClick: () => setForm(vide()) }} />)}
    </section>
  )
}

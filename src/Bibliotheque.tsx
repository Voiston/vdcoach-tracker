import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { EtatVide, Squelette, supprimerAvecAnnulation, useAller, useNotifier, useOccupe } from './ui'

const GROUPES = ['Jambes', 'Fessiers', 'Pectoraux', 'Dos', 'Épaules', 'Bras', 'Abdominaux', 'Corps entier', 'Cardio', 'Mobilité']
const MATERIELS = ['Poids du corps', 'Haltères', 'Kettlebell', 'Élastique', 'Barre de traction', 'Sangles de suspension', 'Chaise / banc', 'Swiss ball', 'Corde à sauter', 'Autre']

type Reference = { id: string; nom: string; groupe: string; materiel: string; notes: string | null; video_url: string | null }
type Formulaire = { id?: string; nom: string; groupe: string; materiel: string; notes: string; video_url: string }

const vide = (): Formulaire => ({ nom: '', groupe: GROUPES[0], materiel: MATERIELS[0], notes: '', video_url: '' })
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
    const { data, error } = await supabase.from('bibliotheque_exercices').select('*').order('groupe').order('nom')
    setCharge(true)
    if (error) setErreur(error.message)
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
    const { error } = form.id
      ? await supabase.from('bibliotheque_exercices').update(champs).eq('id', form.id)
      : await supabase.from('bibliotheque_exercices').insert(champs)
    if (error) return setErreur(error.code === '23505' ? 'Un exercice porte déjà ce nom.' : error.message)
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
        return error?.message
      },
    })
  }

  const affiches = liste.filter(x => !masques.includes(x.id) && (!groupe || x.groupe === groupe) && x.nom.toLowerCase().includes(recherche.trim().toLowerCase()))

  return (
    <section>
      <h2>Exercices</h2>
      {erreur && <p className="erreur">{erreur}</p>}

      {form ? (
        <form onSubmit={e => lancer(() => enregistrer(e))}>
          <input placeholder="Nom de l'exercice" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} required />
          <div className="ligne">
            <select value={form.groupe} onChange={e => setForm({ ...form, groupe: e.target.value })}>
              {GROUPES.map(g => <option key={g}>{g}</option>)}
            </select>
            <select value={form.materiel} onChange={e => setForm({ ...form, materiel: e.target.value })}>
              {MATERIELS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <textarea placeholder="Consignes de technique (facultatif)" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <input type="url" placeholder="Lien vidéo (facultatif)" value={form.video_url} onChange={e => setForm({ ...form, video_url: e.target.value })} />
          <button type="submit" disabled={occupe}>{occupe ? 'Enregistrement…' : form.id ? 'Enregistrer' : "Ajouter l'exercice"}</button>
          <button type="button" className="secondaire" onClick={() => { setForm(null); setErreur('') }}>Annuler</button>
        </form>
      ) : (
        <button type="button" onClick={() => setForm(vide())}>+ Nouvel exercice</button>
      )}

      <div className="ligne">
        <select value={groupe} onChange={e => setGroupe(e.target.value)}>
          <option value="">Tous les groupes</option>
          {GROUPES.map(g => <option key={g}>{g}</option>)}
        </select>
        <input placeholder="Rechercher…" value={recherche} onChange={e => setRecherche(e.target.value)} />
      </div>

      {!charge && !erreur && <Squelette lignes={5} />}
      <ul className="liste" hidden={!charge}>
        {affiches.map(x => (
          <li key={x.id}>
            <div>
              <strong>{x.nom}</strong>
              <div className="puces"><span className="puce">{x.groupe}</span><span className="puce neutre">{x.materiel}</span></div>
              {x.notes && <p>{x.notes}</p>}
              {lienSur(x.video_url) && <a href={lienSur(x.video_url)!} target="_blank" rel="noopener noreferrer">Vidéo</a>}
            </div>
            <div className="ligne">
              <button className="lien" onClick={() => { setForm({ id: x.id, nom: x.nom, groupe: x.groupe, materiel: x.materiel, notes: x.notes ?? '', video_url: x.video_url ?? '' }); setErreur('') }}>Modifier</button>
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

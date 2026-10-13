import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { messageErreur } from './erreurs'
import { etiquettesSuperset, resumeCardio } from './format'
import FenetreProgrammePdf, { type LigneProgramme } from './ProgrammePdf'
import { EtatVide, FeuilleSaisie, MessageErreur, Squelette, supprimerAvecAnnulation, useNotifier } from './ui'

type ModeleExo = LigneProgramme & { ordre: number }
type Modele = { id: string; nom: string; duree_min: number | null; modele_exercices: ModeleExo[] }

export default function Modeles() {
  const [modeles, setModeles] = useState<Modele[]>([])
  const [erreur, setErreur] = useState('')
  const [charge, setCharge] = useState(false)
  const notifier = useNotifier()
  const [enRenommage, setEnRenommage] = useState<Modele | null>(null)
  const [modelePdf, setModelePdf] = useState<Modele | null>(null)
  const [masques, setMasques] = useState<string[]>([])

  async function charger() {
    const { data, error } = await supabase
      .from('modeles')
      .select('id, nom, duree_min, modele_exercices(ordre, nom, series, repetitions, charge_kg, duree_min, distance_km, reglage, lie_suivant)')
      .order('nom')
    setCharge(true)
    if (error) setErreur(messageErreur(error))
    else setModeles(data as unknown as Modele[])
  }

  useEffect(() => {
    charger()
  }, [])

  async function enregistrerNom(m: Modele, nom: string): Promise<string | undefined> {
    const { error } = await supabase.from('modeles').update({ nom }).eq('id', m.id)
    if (error) return messageErreur(error)
    charger()
    notifier('Modèle renommé')
  }

  function supprimer(m: Modele) {
    supprimerAvecAnnulation({
      notifier,
      message: `Modèle « ${m.nom} » supprimé`,
      masquer: () => setMasques(l => [...l, m.id]),
      restaurer: () => setMasques(l => l.filter(id => id !== m.id)),
      effacer: async () => (await supabase.from('modeles').delete().eq('id', m.id)).error,
    })
  }

  const visibles = modeles.filter(m => !masques.includes(m.id))

  return (
    <section>
      <h3>Modèles de séance</h3>
      <MessageErreur message={erreur} reessayer={charger} />
      {charge && !visibles.length && !erreur && <EtatVide titre="Aucun modèle" texte="Dans l'onglet Séance, saisis tes exercices puis touche « Enregistrer comme modèle »." />}
      {!charge && !erreur && <Squelette lignes={2} />}
      <ul className="liste" hidden={!charge}>
        {visibles.map(m => {
          const exos = [...m.modele_exercices].sort((a, b) => a.ordre - b.ordre)
          const etiquettes = etiquettesSuperset(exos)
          return (
            <li key={m.id}>
              <div>
                <strong>{m.nom}</strong>
                <p className="meta">
                  {exos.length} exercice(s){m.duree_min ? ` · ${m.duree_min} min` : ''}
                </p>
                {exos.map((x, idx) => (
                  <p key={idx} className="meta">
                    {etiquettes[idx] && <span className="puce superset-mini">{etiquettes[idx]}</span>}
                    {x.nom}
                    {x.series && x.repetitions ? ` — ${x.series}×${x.repetitions}` : ''}
                    {resumeCardio({ duree_min: x.duree_min ?? null, distance_km: x.distance_km ?? null }) ? ` — ${resumeCardio({ duree_min: x.duree_min ?? null, distance_km: x.distance_km ?? null })}` : ''}
                  </p>
                ))}
                <div className="ligne" style={{ flexWrap: 'wrap', marginTop: '.35rem' }}>
                  {exos.length > 0 && (
                    <button className="lien" onClick={() => setModelePdf(m)}>Programme PDF</button>
                  )}
                  <button className="lien" onClick={() => setEnRenommage(m)}>Renommer</button>
                  <button className="lien danger" onClick={() => supprimer(m)}>Supprimer</button>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      {enRenommage && (
        <FeuilleSaisie
          titre="Renommer le modèle"
          libelle="Nom du modèle"
          valeur={enRenommage.nom}
          obligatoire
          onFermer={() => setEnRenommage(null)}
          onValider={async nom => {
            const e = await enregistrerNom(enRenommage, nom)
            if (!e) setEnRenommage(null)
            return e
          }}
        />
      )}
      {modelePdf && (
        <FenetreProgrammePdf
          titreInitial={modelePdf.nom}
          lignes={[...modelePdf.modele_exercices].sort((a, b) => a.ordre - b.ordre)}
          onFermer={() => setModelePdf(null)}
        />
      )}
    </section>
  )
}
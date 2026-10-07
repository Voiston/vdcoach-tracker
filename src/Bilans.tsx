import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { REGLES, verifier } from './validation'
import { messageErreur } from './erreurs'
import { ErreurChargement, EtatVide, MessageErreur, Squelette, supprimerAvecAnnulation, useAller, useClient, useNotifier, useOccupe } from './ui'
import { TESTS } from './definitions'

type Resultat = { id: string; date_mesure: string; type: string; valeur: number }
const courte = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })
const CLES = Object.keys(TESTS)

export default function Bilans() {
  const [pret, setPret] = useState(false)
  const clientId = useClient().id
  const [resultats, setResultats] = useState<Resultat[]>([])
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'))
  const [saisies, setSaisies] = useState<Record<string, string>>({})
  const [erreur, setErreur] = useState('')
  const [occupe, lancer] = useOccupe()
  const notifier = useNotifier()
  const aller = useAller()
  const [masquees, setMasquees] = useState<string[]>([])

  async function charger() {
    if (!clientId) return
    const { data, error } = await supabase
      .from('mesures')
      .select('id, date_mesure, type, valeur')
      .eq('client_id', clientId)
      .in('type', CLES)
      .order('date_mesure')
    setPret(true)
    if (error) return setErreur(messageErreur(error))
    setErreur('')
    setResultats((data ?? []).map(x => ({ ...x, valeur: Number(x.valeur) })))
  }

  useEffect(() => {
    setPret(false)
    charger()
  }, [clientId])

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault()
    const lignes = Object.entries(saisies)
      .filter(([, v]) => v.trim() !== '')
      .map(([type, v]) => ({ client_id: clientId, date_mesure: date, type, valeur: Number(v.replace(',', '.')), unite: TESTS[type].unite }))
    if (!lignes.length) return setErreur('Saisis au moins un résultat.')
    if (lignes.some(l => Number.isNaN(l.valeur))) return setErreur("Une valeur saisie n'est pas un nombre.")
    const { error } = await supabase.from('mesures').insert(lignes)
    if (error) return setErreur(messageErreur(error))
    setSaisies({})
    charger()
    notifier('Bilan enregistré')
  }

  function supprimerBilan(d: string) {
    supprimerAvecAnnulation({
      notifier,
      message: `Bilan du ${courte(d)} supprimé`,
      masquer: () => setMasquees(l => [...l, d]),
      restaurer: () => setMasquees(l => l.filter(x => x !== d)),
      effacer: async () => {
        const { error } = await supabase.from('mesures').delete().eq('client_id', clientId).eq('date_mesure', d).in('type', CLES)
        if (!error) charger()
        return error
      },
    })
  }

  const visibles = resultats.filter(r => !masquees.includes(r.date_mesure))

  // Initial (premier résultat) vs dernier, pour chaque test réalisé
  const comparaison = CLES.flatMap(cle => {
    const l = visibles.filter(x => x.type === cle)
    return l.length ? [{ cle, t: TESTS[cle], premier: l[0], dernier: l[l.length - 1], n: l.length }] : []
  })

  // Historique groupé par date de bilan (le plus récent d'abord)
  const dates = [...new Set(visibles.map(r => r.date_mesure))].sort().reverse()

  return (
    <section>
      <MessageErreur message={erreur} reessayer={charger} />

      {!pret && <Squelette lignes={3} />}
      <div hidden={!pret}>
      <h3>Initial → dernier bilan</h3>
      {comparaison.length ? (
        <ul className="liste">
          {comparaison.map(({ cle, t, premier, dernier, n }) => {
            const diff = dernier.valeur - premier.valeur
            const mieux = t.sens === 'hausse' ? diff > 0 : diff < 0
            const pct = premier.valeur !== 0 ? (diff / Math.abs(premier.valeur)) * 100 : null
            return (
              <li key={cle}>
                <div>
                  <strong>{t.label}</strong>
                  <p>
                    {premier.valeur} {t.unite} <span className="meta">({courte(premier.date_mesure)})</span> → <b>{dernier.valeur} {t.unite}</b>{' '}
                    <span className="meta">({courte(dernier.date_mesure)})</span>
                  </p>
                  {n > 1 ? (
                    <p className={diff === 0 ? 'meta' : mieux ? 'bien' : 'mal'}>
                      {diff > 0 ? '+' : ''}{+diff.toFixed(1)} {t.unite}{pct !== null ? ` (${diff > 0 ? '+' : ''}${Math.round(pct)} %)` : ''}
                    </p>
                  ) : (
                    <p className="meta">Un seul résultat pour l'instant.</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <EtatVide titre="Aucun bilan" texte="Fais un premier bilan pour avoir un point de départ à comparer plus tard." />
      )}

      <h3>Nouveau bilan</h3>
      <form onSubmit={e => lancer(() => enregistrer(e))}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
        {CLES.map(cle => (
          <label key={cle} className="champ-test">
            <span>{TESTS[cle].label}</span>
            <input inputMode="decimal" placeholder={TESTS[cle].unite} aria-invalid={Boolean(verifier(saisies[cle] ?? ''))} value={saisies[cle] ?? ''} onChange={e => setSaisies({ ...saisies, [cle]: e.target.value })} />
          </label>
        ))}
        {CLES.some(c => verifier(saisies[c] ?? '')) && <p className="champ-erreur" role="alert">Une des valeurs saisies n'est pas un nombre.</p>}
        <p className="meta">Remplis seulement les tests réalisés.</p>
        <button type="submit" disabled={occupe || CLES.some(c => Boolean(verifier(saisies[c] ?? '')))}>{occupe ? 'Enregistrement…' : 'Enregistrer le bilan'}</button>
      </form>

      {dates.length > 0 && (
        <>
          <h3>Historique</h3>
          <ul className="liste">
            {dates.map(d => (
              <li key={d}>
                <div>
                  <strong>{courte(d)}</strong>
                  <p className="meta">
                    {visibles.filter(r => r.date_mesure === d).map(r => `${TESTS[r.type].label} : ${r.valeur} ${TESTS[r.type].unite}`).join(' · ')}
                  </p>
                </div>
                <button className="lien danger" onClick={() => supprimerBilan(d)}>Supprimer</button>
              </li>
            ))}
          </ul>
        </>
      )}
      </div>
    </section>
  )
}

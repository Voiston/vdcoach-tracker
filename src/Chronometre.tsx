import { useEffect, useRef, useState } from 'react'

const PRESETS = [
  { label: '45s', s: 45 },
  { label: '1m', s: 60 },
  { label: '1m30', s: 90 },
  { label: '2m', s: 120 },
  { label: '6m', s: 360 },
]

function bipSonore() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    ;[0, 0.18, 0.36].forEach((delai, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = idx === 2 ? 1046.5 : 880
      gain.gain.setValueAtTime(0.25, ctx.currentTime + delai)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delai + 0.14)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(ctx.currentTime + delai)
      osc.stop(ctx.currentTime + delai + 0.15)
    })
  } catch {
    /* Audio non supporté ou bloqué */
  }
  if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200])
}

function formaterTemps(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Chronometre() {
  const [ouvert, setOuvert] = useState(false)
  const [mode, setMode] = useState<'minuteur' | 'chrono'>('minuteur')
  const [actif, setActif] = useState(false)
  const [secondes, setSecondes] = useState(0)
  const [termine, setTermine] = useState(false)
  const refCible = useRef<number>(0) // timestamp de fin (minuteur) ou de départ (chrono)

  useEffect(() => {
    if (!actif) return
    const id = setInterval(() => {
      if (mode === 'minuteur') {
        const reste = Math.max(0, Math.ceil((refCible.current - Date.now()) / 1000))
        setSecondes(reste)
        if (reste <= 0) {
          setActif(false)
          setTermine(true)
          bipSonore()
        }
      } else {
        setSecondes(Math.floor((Date.now() - refCible.current) / 1000))
      }
    }, 250)
    return () => clearInterval(id)
  }, [actif, mode])

  function demarrerMinuteur(dureeSec: number) {
    setMode('minuteur')
    setTermine(false)
    refCible.current = Date.now() + dureeSec * 1000
    setSecondes(dureeSec)
    setActif(true)
    setOuvert(true)
  }

  function ajouter15s() {
    if (mode !== 'minuteur') return
    const base = actif ? refCible.current : Date.now() + secondes * 1000
    refCible.current = base + 15_000
    setSecondes(s => s + 15)
    setTermine(false)
    setActif(true)
  }

  function basculerChrono() {
    if (mode !== 'chrono') {
      setMode('chrono')
      setTermine(false)
      refCible.current = Date.now()
      setSecondes(0)
      setActif(true)
    } else if (actif) {
      setActif(false)
    } else {
      refCible.current = Date.now() - secondes * 1000
      setActif(true)
    }
  }

  function reinitialiser() {
    setActif(false)
    setTermine(false)
    setSecondes(0)
  }

  if (!ouvert) {
    return (
      <div className="chrono-barre reduit">
        <button type="button" className="secondaire chrono-pastille" onClick={() => setOuvert(true)}>
          ⏱ {actif || secondes > 0 ? <strong>{formaterTemps(secondes)}</strong> : 'Chrono & repos'}
        </button>
      </div>
    )
  }

  return (
    <div className={`chrono-barre${termine ? ' termine' : ''}`} role="region" aria-label="Chronomètre">
      <div className="chrono-entete">
        <span className={`chrono-affichage${termine ? ' clignote' : ''}`} aria-live="off">
          {formaterTemps(secondes)}
        </span>
        {termine && <span className="puce">Temps écoulé !</span>}
        <div className="ligne" style={{ marginLeft: 'auto' }}>
          {mode === 'minuteur' && (actif || secondes > 0) && (
            <button type="button" className="secondaire chrono-btn" onClick={ajouter15s}>+15s</button>
          )}
          {(actif || secondes > 0) && (
            <button
              type="button"
              className="secondaire chrono-btn"
              onClick={() => {
                if (actif) setActif(false)
                else if (mode === 'minuteur' && secondes > 0) demarrerMinuteur(secondes)
                else basculerChrono()
              }}
            >
              {actif ? 'Pause' : 'Reprendre'}
            </button>
          )}
          {secondes > 0 && (
            <button type="button" className="lien danger chrono-btn" onClick={reinitialiser}>Réinitialiser</button>
          )}
          <button type="button" className="lien chrono-btn" aria-label="Réduire le chronomètre" onClick={() => setOuvert(false)}>✕</button>
        </div>
      </div>

      <div className="chrono-presets">
        {PRESETS.map(p => (
          <button key={p.s} type="button" className="secondaire chrono-preset" onClick={() => demarrerMinuteur(p.s)}>
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className={`chrono-preset ${mode === 'chrono' && (actif || secondes > 0) ? '' : 'secondaire'}`}
          onClick={basculerChrono}
        >
          {mode === 'chrono' && actif ? '⏸ Stop' : '⏱ Chrono libre'}
        </button>
      </div>
    </div>
  )
}
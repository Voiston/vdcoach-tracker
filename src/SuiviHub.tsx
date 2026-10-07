import { useState } from 'react'
import Suivi from './Suivi'
import Muscles from './Muscles'
import Objectifs from './Objectifs'
import Bilans from './Bilans'

export type Vue = 'progression' | 'muscles' | 'objectifs' | 'bilans'
const LIBELLES: Record<Vue, string> = { progression: 'Progression', muscles: 'Muscles', objectifs: 'Objectifs', bilans: 'Bilans' }

export default function SuiviHub({ vues }: { vues: Vue[] }) {
  const [vue, setVue] = useState<Vue>(vues[0])
  return (
    <div>
      <div className="segments">
        {vues.map(v => (
          <button key={v} className={v === vue ? 'actif' : ''} onClick={() => setVue(v)}>{LIBELLES[v]}</button>
        ))}
      </div>
      {vue === 'progression' && <Suivi />}
      {vue === 'muscles' && <Muscles />}
      {vue === 'objectifs' && <Objectifs />}
      {vue === 'bilans' && <Bilans />}
    </div>
  )
}

import { useState } from 'react'
import Suivi from './Suivi'
import Muscles from './Muscles'
import Objectifs from './Objectifs'
import Bilans from './Bilans'

type Vue = 'progression' | 'muscles' | 'objectifs' | 'bilans'
const LIBELLES: Record<Vue, string> = { progression: 'Progression', muscles: 'Muscles', objectifs: 'Objectifs', bilans: 'Bilans' }

export default function SuiviHub() {
  const [vue, setVue] = useState<Vue>('progression')
  return (
    <div>
      <div className="segments">
        {(Object.keys(LIBELLES) as Vue[]).map(v => (
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

import { Suspense, lazy, useEffect, useState } from 'react'
import Leaderboard from '../launcher/Leaderboard'

const Desk = lazy(() => import('../desk/Desk'))

const isDesk = () => window.location.hash.startsWith('#/desk')

/** Public site: the leaderboard, plus the committee desk behind #/desk. The desk is a lazy chunk, so phones on the board never load it. */
export default function BoardApp() {
  const [desk, setDesk] = useState(isDesk)
  useEffect(() => {
    const on = () => setDesk(isDesk())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  if (!desk) return <Leaderboard />
  return (
    <Suspense fallback={null}>
      <Desk />
    </Suspense>
  )
}

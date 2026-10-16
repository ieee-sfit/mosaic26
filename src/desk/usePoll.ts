import { useCallback, useEffect, useState } from 'react'
import { rpc } from './api'

/** Calls an RPC now and every `ms`; `reload` forces a refresh. Stops polling when the tab is hidden. */
export function usePoll<T>(fn: string, args: Record<string, unknown>, ms: number) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const key = JSON.stringify(args)
  const reload = useCallback(async () => {
    try {
      setData(await rpc<T>(fn, JSON.parse(key)))
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [fn, key])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload()
    const id = setInterval(() => document.visibilityState === 'visible' && void reload(), ms)
    return () => clearInterval(id)
  }, [reload, ms])
  return { data, error, reload }
}

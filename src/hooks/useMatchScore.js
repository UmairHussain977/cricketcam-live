import { useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

// status: 'idle' | 'connecting' | 'connected' | 'error'
// 'connected' means the realtime channel is live — it does not by itself mean a score
// has arrived yet (the scoring app might not have sent a ball since we joined), so the
// caller should treat `score === null` as "connected, waiting for the first update".
export function useMatchScore(matchCode) {
  const [status, setStatus] = useState('idle')
  const [score, setScore] = useState(null)
  const channelRef = useRef(null)

  useEffect(() => {
    if (!matchCode) {
      setStatus('idle')
      setScore(null)
      return
    }
    if (!isSupabaseConfigured) {
      setStatus('error')
      return
    }

    let cancelled = false
    const code = matchCode.trim().toUpperCase()
    setStatus('connecting')
    setScore(null)

    const init = async () => {
      const { data } = await supabase.from('live_matches').select('score').eq('match_code', code).maybeSingle()
      if (cancelled) return
      if (data?.score) setScore(data.score)

      const channel = supabase
        .channel(`live_matches_${code}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'live_matches', filter: `match_code=eq.${code}` },
          (payload) => {
            if (payload.new?.score) setScore(payload.new.score)
          },
        )
        .subscribe((subStatus) => {
          if (cancelled) return
          if (subStatus === 'SUBSCRIBED') setStatus('connected')
          else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT' || subStatus === 'CLOSED') setStatus('error')
        })

      channelRef.current = channel
    }

    init()

    return () => {
      cancelled = true
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }, [matchCode])

  return { status, score }
}

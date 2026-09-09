import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { useMatchScore } from '../hooks/useMatchScore'

export default function Connect() {
  const navigate = useNavigate()
  const [code, setCode] = useState(() => sessionStorage.getItem('cricketcam.lastCode') || '')
  const [submittedCode, setSubmittedCode] = useState(null)
  const { status, score } = useMatchScore(submittedCode)

  useEffect(() => {
    if (status === 'connected' && score) {
      sessionStorage.setItem('cricketcam.lastCode', submittedCode)
      const t = setTimeout(() => navigate(`/camera?code=${submittedCode}`), 500)
      return () => clearTimeout(t)
    }
  }, [status, score, submittedCode, navigate])

  const connect = (e) => {
    e.preventDefault()
    const clean = code.trim().toUpperCase()
    if (clean.length < 4) return
    setSubmittedCode(clean)
  }

  const skipWaiting = () => {
    sessionStorage.setItem('cricketcam.lastCode', submittedCode)
    navigate(`/camera?code=${submittedCode}`)
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <div className="mb-2 text-4xl">🏏📷</div>
        <h1 className="text-2xl font-black tracking-tight">CricketCam Live</h1>
        <p className="mt-1 text-sm text-white/50">Record your match with the live score burned in.</p>
      </div>

      {!isSupabaseConfigured && (
        <p className="max-w-xs rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-center text-xs text-red-300">
          Realtime isn't configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Set them in .env and restart.
        </p>
      )}

      <form onSubmit={connect} className="w-full max-w-xs space-y-3">
        <label className="block text-center text-xs font-bold uppercase tracking-widest text-white/40">Match Code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 8))}
          placeholder="ABC123"
          autoCapitalize="characters"
          autoCorrect="off"
          className="input"
        />
        <button type="submit" disabled={code.trim().length < 4 || !isSupabaseConfigured} className="btn-gold w-full">
          CONNECT
        </button>
      </form>

      {submittedCode && (
        <div className="w-full max-w-xs rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm">
          {status === 'connecting' && <p className="text-white/60">Connecting…</p>}
          {status === 'error' && <p className="text-red-400">Couldn't connect. Check the code and your internet connection.</p>}
          {status === 'connected' && !score && (
            <div>
              <p className="font-bold text-gold">Connected ✓</p>
              <p className="mt-1 text-xs text-white/50">Waiting for the scoring app to send the first update…</p>
              <button type="button" onClick={skipWaiting} className="btn-primary mt-3 w-full">Open camera anyway</button>
            </div>
          )}
          {status === 'connected' && score && <p className="font-bold text-gold">Connected ✓ — opening camera…</p>}
        </div>
      )}

      <p className="max-w-xs text-center text-[11px] leading-5 text-white/30">
        Find the match code at the top of the scoring app's live scoring screen (📡 code), then enter it here.
      </p>
    </div>
  )
}

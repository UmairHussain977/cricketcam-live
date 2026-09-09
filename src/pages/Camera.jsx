import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCameraStream } from '../hooks/useCameraStream'
import { useMatchScore } from '../hooks/useMatchScore'
import { startCompositor } from '../lib/compositor'
import { createRecorder } from '../lib/recorder'
import { saveVideoToGallery } from '../lib/saveToGallery'

const POSITIONS = ['bottom-left', 'bottom-right', 'top-left', 'top-right']

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function CameraScreen() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const code = params.get('code')

  const { stream, toggleFacing, torchOn, torchSupported, toggleTorch, error: cameraError } = useCameraStream()
  const { status: connectionStatus, score } = useMatchScore(code)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const scoreRef = useRef(score)
  const positionRef = useRef('bottom-left')
  const recorderRef = useRef(null)

  const [position, setPosition] = useState('bottom-left')
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [saveState, setSaveState] = useState(null) // null | 'saving' | { method } | 'error'

  useEffect(() => { scoreRef.current = score }, [score])
  useEffect(() => { positionRef.current = position }, [position])

  useEffect(() => {
    if (!code) navigate('/')
  }, [code, navigate])

  useEffect(() => {
    if (!stream || !videoRef.current) return
    videoRef.current.srcObject = stream
    videoRef.current.play().catch(() => {})
  }, [stream])

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return
    const stop = startCompositor({
      videoEl: videoRef.current,
      canvas: canvasRef.current,
      getScore: () => scoreRef.current,
      getPosition: () => positionRef.current,
    })
    return stop
  }, [stream])

  useEffect(() => {
    if (!recording) return
    setElapsed(0)
    const start = Date.now()
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 250)
    return () => clearInterval(id)
  }, [recording])

  const startRecording = () => {
    if (!stream || !canvasRef.current || recording) return
    const canvasStream = canvasRef.current.captureStream(30)
    const combined = new MediaStream([...canvasStream.getVideoTracks(), ...stream.getAudioTracks()])
    const recorder = createRecorder(combined)
    recorderRef.current = recorder
    recorder.start()
    setRecording(true)
    setSaveState(null)
  }

  const stopRecording = async () => {
    const recorder = recorderRef.current
    if (!recorder || !recording) return
    setRecording(false)
    recorder.stop()
    const blob = await recorder.stopped
    setSaveState('saving')
    const filename = `cricketcam-${code || 'match'}-${Date.now()}.${recorder.extension}`
    try {
      const result = await saveVideoToGallery(blob, filename)
      setSaveState(result)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveState('error')
    }
  }

  const cyclePosition = () => {
    if (recording) return
    const i = POSITIONS.indexOf(position)
    setPosition(POSITIONS[(i + 1) % POSITIONS.length])
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <video ref={videoRef} muted playsInline className="absolute -left-full top-0 h-px w-px opacity-0" />
      <canvas ref={canvasRef} className="h-full w-full object-cover" onClick={cyclePosition} />

      {/* Top bar: connection status + match code */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-400'}`} />
          <span className="text-xs font-bold">{code}</span>
        </div>
        {recording && (
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5">
            <span className="rec-dot h-2 w-2 rounded-full bg-white" />
            <span className="text-xs font-black tabular-nums">{formatTimer(elapsed)}</span>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 text-center">
          <p className="text-sm text-red-300">Camera access failed: {cameraError.message || 'permission denied'}. Allow camera/microphone access and reload.</p>
        </div>
      )}

      {saveState && (
        <div className="absolute inset-x-4 bottom-28 rounded-xl bg-black/80 p-3 text-center text-sm backdrop-blur">
          {saveState === 'saving' && <p>Saving…</p>}
          {saveState === 'error' && <p className="text-red-400">Couldn't save the video. Try again.</p>}
          {saveState?.method === 'native-gallery' && <p className="text-gold">Saved to gallery ✓</p>}
          {saveState?.method === 'share' && <p className="text-gold">Shared ✓</p>}
          {saveState?.method === 'download' && <p className="text-gold">Downloaded ✓ (check your Downloads folder)</p>}
          {saveState?.method === 'cancelled' && <p className="text-white/60">Save cancelled.</p>}
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={toggleFacing} disabled={recording} className="tap grid h-12 w-12 place-items-center rounded-full bg-white/15 text-xl backdrop-blur disabled:opacity-30">🔄</button>

        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={!stream}
          className="tap grid h-20 w-20 place-items-center rounded-full border-4 border-white disabled:opacity-40"
        >
          <span className={recording ? 'h-7 w-7 rounded-md bg-red-600' : 'h-14 w-14 rounded-full bg-red-600'} />
        </button>

        {torchSupported ? (
          <button type="button" onClick={toggleTorch} className={`tap grid h-12 w-12 place-items-center rounded-full text-xl backdrop-blur ${torchOn ? 'bg-gold text-black' : 'bg-white/15'}`}>⚡</button>
        ) : (
          <div className="h-12 w-12" />
        )}
      </div>

      <p className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 text-[10px] text-white/40">Tap preview to move scoreboard</p>
    </div>
  )
}

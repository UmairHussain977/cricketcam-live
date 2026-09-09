import { useEffect, useState } from 'react'

export function useCameraStream() {
  const [facingMode, setFacingMode] = useState('environment')
  const [stream, setStream] = useState(null)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    let activeStream = null

    async function start() {
      try {
        setError(null)
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        })
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return }
        activeStream = s
        setStream(s)
        const [videoTrack] = s.getVideoTracks()
        const capabilities = videoTrack.getCapabilities?.() || {}
        setTorchSupported(Boolean(capabilities.torch))
        setTorchOn(false)
      } catch (err) {
        if (!cancelled) setError(err)
      }
    }

    start()

    return () => {
      cancelled = true
      if (activeStream) activeStream.getTracks().forEach((t) => t.stop())
    }
  }, [facingMode])

  const toggleFacing = () => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))

  const toggleTorch = async () => {
    if (!stream || !torchSupported) return
    const [videoTrack] = stream.getVideoTracks()
    const next = !torchOn
    try {
      await videoTrack.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch (err) {
      console.warn('Torch toggle failed:', err)
    }
  }

  return { stream, facingMode, toggleFacing, torchOn, torchSupported, toggleTorch, error }
}

const CANDIDATE_MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

export function pickSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  return CANDIDATE_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

// Wraps MediaRecorder over a MediaStream (video: canvas.captureStream, audio: the mic track
// from the real camera stream). Returns controls plus a promise that resolves with the final
// Blob once recording actually stops and the last chunk has flushed.
export function createRecorder(stream) {
  const mimeType = pickSupportedMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined)
  const chunks = []

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }

  let resolveStop
  const stopped = new Promise((resolve) => { resolveStop = resolve })
  recorder.onstop = () => {
    resolveStop(new Blob(chunks, { type: mimeType || 'video/webm' }))
  }

  return {
    start: () => recorder.start(250), // periodic chunks so a crash doesn't lose the whole take
    stop: () => recorder.stop(),
    stopped,
    mimeType: mimeType || 'video/webm',
    extension: (mimeType || 'video/webm').includes('mp4') ? 'mp4' : 'webm',
  }
}

// Three tiers, tried in order:
//  1. Native (only present when this app is actually wrapped and running via Capacitor on
//     Android) — writes the file and inserts it into MediaStore so it appears in Gallery/
//     Photos automatically, no user action needed.
//  2. Web Share — works in any modern mobile browser right now; the OS share sheet lets the
//     user pick "Save to Photos" / "Save video" in one tap.
//  3. Plain download — always available as a last resort; lands in the Downloads folder.

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(String(reader.result).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function trySaveNative(blob, filename) {
  const Capacitor = (await import('@capacitor/core')).Capacitor
  if (!Capacitor?.isNativePlatform?.()) return null
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem')
    const base64 = await blobToBase64(blob)
    const written = await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.Cache })
    const { Media } = await import('@capacitor-community/media')
    await Media.saveVideo({ path: written.uri, albumIdentifier: 'CricketCam Live' })
    return { method: 'native-gallery' }
  } catch (err) {
    console.warn('Native gallery save failed, falling back:', err)
    return null
  }
}

async function trySaveViaShare(blob, filename) {
  if (!navigator.canShare || !navigator.share) return null
  const file = new File([blob], filename, { type: blob.type })
  if (!navigator.canShare({ files: [file] })) return null
  try {
    await navigator.share({ files: [file], title: 'CricketCam Live recording' })
    return { method: 'share' }
  } catch (err) {
    if (err?.name === 'AbortError') return { method: 'cancelled' }
    console.warn('Share failed, falling back to download:', err)
    return null
  }
}

function saveViaDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 15_000)
  return { method: 'download' }
}

export async function saveVideoToGallery(blob, filename) {
  const native = await trySaveNative(blob, filename)
  if (native) return native

  const shared = await trySaveViaShare(blob, filename)
  if (shared) return shared

  return saveViaDownload(blob, filename)
}

// Draws the camera frame plus the score overlay onto a canvas every animation frame.
// The canvas's own pixels are what MediaRecorder captures, so the overlay is genuinely
// part of the recorded video, not a separate layer shown only on screen.

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function drawScoreOverlay(ctx, score, w, h, position = 'bottom-left') {
  if (!score) return
  const s = w / 1080 // scale relative to a 1080-wide reference so text stays readable at any resolution

  const rows = []
  rows.push({ text: `${score.battingTeamName ?? ''}  ${score.runs ?? 0}/${score.wickets ?? 0}`, size: 30 * s, weight: 900, color: '#ffffff' })
  rows.push({ text: `OVERS ${score.oversText ?? '0.0'}${score.totalOvers ? ` / ${score.totalOvers}` : ''}`, size: 16 * s, weight: 700, color: '#f0b429' })
  if (score.striker) rows.push({ text: `${score.striker.name}  ${score.striker.runs}${score.status === 'live' ? '*' : ''} (${score.striker.balls})`, size: 19 * s, weight: 800, color: '#ffffff' })
  if (score.nonStriker) rows.push({ text: `${score.nonStriker.name}  ${score.nonStriker.runs} (${score.nonStriker.balls})`, size: 17 * s, weight: 500, color: '#d4d4d4' })
  if (score.bowler) rows.push({ text: `${score.bowler.name}  ${score.bowler.wickets}/${score.bowler.runs}`, size: 17 * s, weight: 500, color: '#d4d4d4' })
  if (score.isSecondInnings && score.target != null) rows.push({ text: `NEED ${score.runsNeeded} OFF ${score.ballsLeft}`, size: 16 * s, weight: 800, color: '#f0b429' })
  if (score.status === 'completed' && score.result) rows.push({ text: score.result.toUpperCase(), size: 17 * s, weight: 900, color: '#f0b429' })

  const padding = 18 * s
  const rowGap = 0.32
  const boxW = Math.min(560 * s, w * 0.92)
  const boxH = padding * 2 + rows.reduce((sum, r) => sum + r.size * (1 + rowGap), 0)
  const margin = 22 * s

  let x = position.includes('left') ? margin : w - boxW - margin
  let y = position.includes('top') ? margin : h - boxH - margin

  ctx.save()
  roundRect(ctx, x, y, boxW, boxH, 14 * s)
  ctx.fillStyle = 'rgba(6, 10, 8, 0.72)'
  ctx.fill()
  ctx.lineWidth = Math.max(1, 1.5 * s)
  ctx.strokeStyle = 'rgba(240, 180, 41, 0.55)'
  ctx.stroke()

  let cy = y + padding
  ctx.textBaseline = 'top'
  for (const row of rows) {
    ctx.font = `${row.weight} ${row.size}px system-ui, -apple-system, sans-serif`
    ctx.fillStyle = row.color
    ctx.fillText(row.text, x + padding, cy, boxW - padding * 2)
    cy += row.size * (1 + rowGap)
  }
  ctx.restore()
}

// Starts the draw loop. `getScore` and `getPosition` are called fresh every frame so the
// overlay always reflects the latest state without needing to restart the loop.
export function startCompositor({ videoEl, canvas, getScore, getPosition }) {
  const ctx = canvas.getContext('2d', { alpha: false })
  let running = true
  let rafId = null

  function frame() {
    if (!running) return
    if (videoEl.readyState >= 2 && videoEl.videoWidth) {
      if (canvas.width !== videoEl.videoWidth || canvas.height !== videoEl.videoHeight) {
        canvas.width = videoEl.videoWidth
        canvas.height = videoEl.videoHeight
      }
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
      drawScoreOverlay(ctx, getScore(), canvas.width, canvas.height, getPosition())
    }
    rafId = requestAnimationFrame(frame)
  }

  frame()

  return function stop() {
    running = false
    if (rafId) cancelAnimationFrame(rafId)
  }
}

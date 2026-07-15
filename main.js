import { prepareWithSegments, layoutNextLine } from '@chenglou/pretext'

const BIO = `Over the last eight years I've moved between product design and front-end engineering, usually landing wherever a team needs someone who can carry an idea from a napkin sketch to shipped code without losing the thread. I led the design-system rebuild at a mid-size fintech, cutting new-screen turnaround from three weeks to four days, and spent two years before that as the fourth hire at a climate-tech startup, where I did everything from user research to writing the CSS that shipped.`

const FONT = '16px Georgia'
const LINE_HEIGHT = 26
const TEXT_COLOR = '#D8DEE9'

const canvas = document.getElementById('bio-canvas')
const ctx = canvas.getContext('2d')

// One-time expensive pass: segment + measure every piece of text with canvas.
const prepared = prepareWithSegments(BIO, FONT)

const orb = { x: 90, y: 70, radius: 74, vx: 0, vy: 0 }
let dragging = false
let dragOffset = { x: 0, y: 0 }
let lastPointer = { x: 0, y: 0, t: 0 }

// stats
const statLines = document.getElementById('stat-lines')
const statReflow = document.getElementById('stat-reflow')
const statFps = document.getElementById('stat-fps')
let frameTimes = []

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const height = 340
  canvas.width = rect.width * dpr
  canvas.height = height * dpr
  canvas.style.height = height + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

// Returns usable line width at vertical position y, narrowed when that row
// intersects the orb's current vertical span. Pure arithmetic — no DOM reads.
function lineWidthAt(y, fullWidth) {
  const top = y - LINE_HEIGHT
  const bottom = y
  const orbTop = orb.y - orb.radius
  const orbBottom = orb.y + orb.radius
  if (bottom <= orbTop || top >= orbBottom) return { width: fullWidth, side: null }

  const rowMidY = (top + bottom) / 2
  const dy = Math.abs(rowMidY - orb.y)
  const halfChord = Math.sqrt(Math.max(orb.radius * orb.radius - dy * dy, 0))
  const reach = halfChord + 16
  const width = Math.max(fullWidth - reach, fullWidth * 0.25)
  const side = orb.x < fullWidth / 2 ? 'left' : 'right'
  return { width, side }
}

// The hot path: walks the whole paragraph fresh every frame, using the orb's
// live position to decide each line's available width. This is what
// "reflow every frame, zero DOM reads" actually means — it's just math.
function render() {
  const frameStart = performance.now()
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  ctx.clearRect(0, 0, width, height)

  ctx.font = FONT
  ctx.fillStyle = TEXT_COLOR
  ctx.textBaseline = 'alphabetic'

  let cursor = { segmentIndex: 0, graphemeIndex: 0 }
  let y = LINE_HEIGHT
  let lineCount = 0

  while (y < height) {
    const { width: availableWidth, side } = lineWidthAt(y, width)
    const line = layoutNextLine(prepared, cursor, availableWidth)
    if (line === null) break

    const xOffset = side === 'left' ? width - availableWidth : 0
    ctx.fillText(line.text, xOffset, y)

    cursor = line.end
    y += LINE_HEIGHT
    lineCount++
  }

  // orb drawn last so it sits visually above the text it's displacing
  ctx.save()
  ctx.globalAlpha = 0.94
  ctx.shadowColor = 'rgba(0,0,0,0.4)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 8
  const grad = ctx.createRadialGradient(
    orb.x - orb.radius * 0.3, orb.y - orb.radius * 0.3, orb.radius * 0.1,
    orb.x, orb.y, orb.radius
  )
  grad.addColorStop(0, '#FBE4A8')
  grad.addColorStop(1, '#8A6E28')
  ctx.beginPath()
  ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.restore()

  const reflowMs = performance.now() - frameStart
  frameTimes.push(frameStart)
  frameTimes = frameTimes.filter(t => frameStart - t < 1000)

  statLines.textContent = lineCount
  statReflow.textContent = reflowMs.toFixed(2)
  statFps.textContent = frameTimes.length
}

let running = true
function loop() {
  if (!dragging) {
    const friction = 0.96
    orb.x += orb.vx
    orb.y += orb.vy
    orb.vx *= friction
    orb.vy *= friction

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (orb.x - orb.radius < 0) { orb.x = orb.radius; orb.vx *= -0.6 }
    if (orb.x + orb.radius > width) { orb.x = width - orb.radius; orb.vx *= -0.6 }
    if (orb.y - orb.radius < 0) { orb.y = orb.radius; orb.vy *= -0.6 }
    if (orb.y + orb.radius > height) { orb.y = height - orb.radius; orb.vy *= -0.6 }
  }
  render()
  if (running) requestAnimationFrame(loop)
}

function pointerPos(e) {
  const rect = canvas.getBoundingClientRect()
  const point = e.touches ? e.touches[0] : e
  return { x: point.clientX - rect.left, y: point.clientY - rect.top }
}

canvas.addEventListener('mousedown', (e) => {
  const p = pointerPos(e)
  if (Math.hypot(p.x - orb.x, p.y - orb.y) <= orb.radius) {
    dragging = true
    orb.vx = 0
    orb.vy = 0
    dragOffset = { x: p.x - orb.x, y: p.y - orb.y }
    lastPointer = { x: p.x, y: p.y, t: performance.now() }
  }
})

window.addEventListener('mousemove', (e) => {
  if (!dragging) return
  const p = pointerPos(e)
  const now = performance.now()
  const dt = Math.max(now - lastPointer.t, 1)

  orb.x = p.x - dragOffset.x
  orb.y = p.y - dragOffset.y
  orb.vx = ((p.x - lastPointer.x) / dt) * 16.7
  orb.vy = ((p.y - lastPointer.y) / dt) * 16.7
  lastPointer = { x: p.x, y: p.y, t: now }
})

window.addEventListener('mouseup', () => { dragging = false })

window.addEventListener('resize', resizeCanvas)

document.fonts.ready.then(() => { resizeCanvas(); loop() })
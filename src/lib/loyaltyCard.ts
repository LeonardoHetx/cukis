import { formatDate } from './format'
import type { LoyaltyProgress } from './loyalty'
import type { LoyaltySettings } from '../types/database'

const WIDTH = 1080
const PAD = 72

const colors = {
  page: '#f7ebe0',
  card: '#fff9f2',
  border: '#edd9c6',
  cocoa: '#2c1810',
  cocoaSoft: '#7a4e2d',
  honey: '#c8953c',
  honeyDark: '#a87a2e',
  dough: '#e8c4a0',
  chip: '#3d2418',
}

const DISPLAY = 'Fraunces, Georgia, serif'
const SANS = '"Nunito Sans", system-ui, sans-serif'

/** Posições fixas das gotas de chocolate (fração do raio). */
const CHIPS: [number, number, number][] = [
  [-0.35, -0.3, 0.13],
  [0.3, -0.38, 0.11],
  [0.05, 0.05, 0.12],
  [-0.4, 0.3, 0.1],
  [0.38, 0.25, 0.13],
  [-0.05, 0.48, 0.09],
]

function gridColumns(goal: number): number {
  if (goal <= 4) return goal
  if (goal <= 12) return Math.ceil(goal / 2)
  return 5
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawCookie(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = colors.dough
  ctx.fill()
  ctx.lineWidth = Math.max(3, r * 0.08)
  ctx.strokeStyle = colors.honey
  ctx.stroke()

  ctx.fillStyle = colors.chip
  for (const [dx, dy, size] of CHIPS) {
    ctx.beginPath()
    ctx.arc(x + dx * r, y + dy * r, size * r, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawEmptySlot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  label: string,
  isPrize: boolean,
) {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = isPrize ? '#fbefd9' : '#ffffff'
  ctx.fill()
  ctx.setLineDash([r * 0.18, r * 0.12])
  ctx.lineWidth = Math.max(3, r * 0.06)
  ctx.strokeStyle = isPrize ? colors.honey : colors.border
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = isPrize ? colors.honeyDark : colors.cocoaSoft
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = isPrize ? `700 ${Math.round(r * 0.42)}px ${SANS}` : `700 ${Math.round(r * 0.6)}px ${DISPLAY}`
  ctx.fillText(label, x, y)
}

async function ensureFonts() {
  if (!document.fonts) return
  await Promise.all([
    document.fonts.load(`700 64px Fraunces`),
    document.fonts.load(`400 32px "Nunito Sans"`),
    document.fonts.load(`600 32px "Nunito Sans"`),
    document.fonts.load(`700 32px "Nunito Sans"`),
  ]).catch(() => undefined)
}

/** Desenha o cartão fidelidade e devolve um PNG. */
export async function renderLoyaltyCard(
  progress: LoyaltyProgress,
  settings: LoyaltySettings,
): Promise<Blob> {
  await ensureFonts()

  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível neste navegador')

  const inner = WIDTH - PAD * 2
  const cardInner = inner - 2 * 56
  const goal = settings.goal
  const cols = gridColumns(goal)
  const rows = Math.ceil(goal / cols)
  const gap = 28
  const cell = Math.min(170, (cardInner - gap * (cols - 1)) / cols)
  const gridHeight = rows * cell + (rows - 1) * gap

  const done = progress.rewardsAvailable > 0
  const message = done
    ? `Parabéns! Você ganhou ${settings.reward}`
    : `Faltam ${progress.remaining} ${progress.remaining === 1 ? 'cookie' : 'cookies'} para ganhar ${settings.reward}`
  ctx.font = `600 38px ${SANS}`
  const messageLines = wrapText(ctx, message, cardInner)

  // Altura total (mesma sequência usada no desenho abaixo)
  const nameH = 90
  const messageH = messageLines.length * 50 + 20
  const cardH = 56 + nameH + gridHeight + 40 + messageH + 40
  canvas.height = PAD + cardH + 110

  // Fundo
  ctx.fillStyle = colors.page
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  let y = PAD
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  // Cartão
  ctx.beginPath()
  ctx.roundRect(PAD, y, inner, cardH, 48)
  ctx.fillStyle = colors.card
  ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = colors.border
  ctx.stroke()

  const left = PAD + 56
  y += 56

  ctx.fillStyle = colors.cocoa
  ctx.font = `700 54px ${DISPLAY}`
  ctx.fillText(progress.customer.name, left, y + 56, cardInner)
  y += nameH

  // Carimbos
  const gridWidth = cols * cell + (cols - 1) * gap
  const gridLeft = left + (cardInner - gridWidth) / 2
  const r = cell / 2
  for (let i = 0; i < goal; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = gridLeft + col * (cell + gap) + r
    const cy = y + row * (cell + gap) + r
    if (i < progress.stamps) {
      drawCookie(ctx, cx, cy, r)
    } else {
      const isPrize = i === goal - 1
      drawEmptySlot(ctx, cx, cy, r, isPrize ? 'PRÊMIO' : String(i + 1), isPrize)
    }
  }
  y += gridHeight + 40

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = done ? colors.honeyDark : colors.cocoa
  ctx.font = `600 38px ${SANS}`
  for (const line of messageLines) {
    ctx.fillText(line, left, y + 38)
    y += 50
  }
  y += 20

  // Rodapé
  ctx.textAlign = 'center'
  ctx.fillStyle = colors.cocoaSoft
  ctx.font = `400 28px ${SANS}`
  ctx.fillText(
    `Atualizado em ${formatDate(new Date())}`,
    WIDTH / 2,
    canvas.height - 50,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem'))),
      'image/png',
    )
  })
}

export function loyaltyCardFileName(progress: LoyaltyProgress): string {
  const slug = progress.customer.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `cukis-fidelidade-${slug || 'cliente'}.png`
}

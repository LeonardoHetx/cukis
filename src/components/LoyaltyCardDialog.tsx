import { useEffect, useState } from 'react'
import type { LoyaltyProgress } from '../lib/loyalty'
import { loyaltyCardFileName, renderLoyaltyCard } from '../lib/loyaltyCard'
import type { LoyaltySettings } from '../types/database'
import { Button } from './Button'

type Props = {
  progress: LoyaltyProgress
  settings: LoyaltySettings
  onClose: () => void
}

export function LoyaltyCardDialog({ progress, settings, onClose }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false

    renderLoyaltyCard(progress, settings)
      .then((result) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(result)
        setBlob(result)
        setUrl(objectUrl)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao gerar cartão')
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [progress, settings])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const fileName = loyaltyCardFileName(progress)
  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null
  const canShare = Boolean(file && navigator.canShare?.({ files: [file] }))

  async function handleShare() {
    if (!file) return
    try {
      await navigator.share({ files: [file] })
    } catch (err) {
      // Usuária fechou a folha de compartilhamento: não é erro
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Não foi possível compartilhar')
    }
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-cocoa-950/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Cartão fidelidade de ${progress.customer.name}`}
        className="flex max-h-[92dvh] w-full max-w-md flex-col gap-4 rounded-2xl border border-biscuit-200 bg-biscuit-50 p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl font-bold text-cocoa-900">
            Cartão de {progress.customer.name}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl bg-biscuit-100">
          {url ? (
            <img src={url} alt={`Cartão fidelidade de ${progress.customer.name}`} className="w-full" />
          ) : (
            <p className="p-6 text-center text-sm text-cocoa-700/70">
              {error ?? 'Gerando cartão…'}
            </p>
          )}
        </div>

        {error && url ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {canShare ? (
            <Button onClick={handleShare} disabled={!file} className="flex-1">
              Compartilhar
            </Button>
          ) : null}
          {url ? (
            <a
              href={url}
              download={fileName}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-biscuit-200 px-4 py-2.5 text-sm font-semibold text-cocoa-800 transition hover:bg-biscuit-100"
            >
              Baixar PNG
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Input } from '../components/Input'
import { LoyaltyCardDialog } from '../components/LoyaltyCardDialog'
import { formatDate } from '../lib/format'
import {
  DEFAULT_LOYALTY_SETTINGS,
  loadLoyaltyProgress,
  loadLoyaltySettings,
  redeemReward,
  saveLoyaltySettings,
  type LoyaltyProgress,
} from '../lib/loyalty'
import type { LoyaltySettings } from '../types/database'

const GOAL_PRESETS = [6, 10, 15, 20]

export function LoyaltyPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [settings, setSettings] = useState<LoyaltySettings>(DEFAULT_LOYALTY_SETTINGS)
  const [form, setForm] = useState({
    goal: String(DEFAULT_LOYALTY_SETTINGS.goal),
    reward: DEFAULT_LOYALTY_SETTINGS.reward,
    starts_at: DEFAULT_LOYALTY_SETTINGS.starts_at,
  })
  const [progress, setProgress] = useState<LoyaltyProgress[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openCustomerId = searchParams.get('cliente')
  const openProgress = progress.find((p) => p.customer.id === openCustomerId) ?? null

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const loaded = await loadLoyaltySettings()
      setSettings(loaded)
      setForm({
        goal: String(loaded.goal),
        reward: loaded.reward,
        starts_at: loaded.starts_at,
      })
      setProgress(await loadLoyaltyProgress(loaded))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fidelidade')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const participants = useMemo(() => {
    const q = search.trim().toLowerCase()
    return progress
      .filter((p) => p.earned > 0 || p.used > 0)
      .filter((p) => p.customer.name.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          b.rewardsAvailable - a.rewardsAvailable ||
          b.stamps - a.stamps ||
          a.customer.name.localeCompare(b.customer.name),
      )
  }, [progress, search])

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSavedMessage(null)

    const goal = Number.parseInt(form.goal, 10)
    if (!Number.isFinite(goal) || goal < 1 || goal > 100) {
      setError('A meta precisa ser entre 1 e 100 cookies')
      return
    }
    if (!form.reward.trim() || !form.starts_at) {
      setError('Preencha o prêmio e a data de início')
      return
    }

    setSaving(true)
    try {
      await saveLoyaltySettings({
        goal,
        reward: form.reward.trim(),
        starts_at: form.starts_at,
      })
      setSavedMessage('Regras salvas')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar regras')
    } finally {
      setSaving(false)
    }
  }

  async function handleRedeem(p: LoyaltyProgress) {
    if (
      !confirm(
        `Entregar "${settings.reward}" para ${p.customer.name}?\nIsso desconta ${settings.goal} cookies do cartão.`,
      )
    ) {
      return
    }
    try {
      await redeemReward(p.customer.id, settings)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar prêmio')
    }
  }

  function openCard(customerId: string) {
    setSearchParams({ cliente: customerId })
  }

  const closeCard = useCallback(() => {
    setSearchParams({}, { replace: true })
  }, [setSearchParams])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl font-bold text-cocoa-900">Fidelidade</h2>
        <p className="mt-1 text-sm text-cocoa-700/70">
          Cada cookie vendido vira um carimbo. Gere o cartão e mande pro cliente.
        </p>
      </div>

      <Card>
        <form className="space-y-4" onSubmit={handleSaveSettings}>
          <h3 className="font-display text-xl font-bold">Regras do cartão</h3>

          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-cocoa-800">
              Meta (cookies para ganhar o prêmio)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, goal: String(preset) }))}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    form.goal === String(preset)
                      ? 'bg-cocoa-900 text-biscuit-50'
                      : 'border border-biscuit-200 text-cocoa-800 hover:bg-biscuit-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <input
                aria-label="Outra meta"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.goal}
                onChange={(e) =>
                  setForm((f) => ({ ...f, goal: e.target.value.replace(/\D/g, '') }))
                }
                className="w-20 rounded-xl border border-biscuit-200 bg-white/80 px-3 py-2 text-center text-cocoa-900 outline-none focus:border-honey-500 focus:ring-2 focus:ring-honey-500/20"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Prêmio"
              required
              value={form.reward}
              onChange={(e) => setForm((f) => ({ ...f, reward: e.target.value }))}
              placeholder="Ex: 1 cookie grátis"
            />
            <Input
              label="Contar compras a partir de"
              type="date"
              required
              value={form.starts_at}
              onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
              hint="Compras antes dessa data não entram no cartão"
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {savedMessage ? (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {savedMessage}
            </p>
          ) : null}

          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar regras'}
          </Button>
        </form>
      </Card>

      <Card>
        <Input
          label="Buscar"
          placeholder="Nome do cliente"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {loading ? <p className="text-cocoa-700/70">Carregando…</p> : null}

      {!loading && participants.length === 0 ? (
        <Card>
          <p className="text-cocoa-700/70">
            Nenhuma compra desde {formatDate(`${settings.starts_at}T00:00:00`)}. As próximas
            vendas já entram no cartão.
          </p>
        </Card>
      ) : null}

      <div className="space-y-3">
        {participants.map((p) => (
          <Card key={p.customer.id} className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-cocoa-900">{p.customer.name}</p>
                <p className="text-sm text-cocoa-700/70">
                  {p.rewardsAvailable > 0
                    ? `Prêmio liberado${p.rewardsAvailable > 1 ? ` (${p.rewardsAvailable}x)` : ''}!`
                    : `Faltam ${p.remaining} para o prêmio`}
                </p>
              </div>
              <p className="font-display text-xl font-bold text-cocoa-900">
                {p.stamps}
                <span className="text-base text-cocoa-700/60"> / {settings.goal}</span>
              </p>
            </div>

            <div className="h-2.5 overflow-hidden rounded-full bg-biscuit-100">
              <div
                className={`h-full rounded-full ${p.rewardsAvailable > 0 ? 'bg-honey-500' : 'bg-cocoa-800'}`}
                style={{ width: `${(p.stamps / settings.goal) * 100}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => openCard(p.customer.id)}>
                Gerar cartão
              </Button>
              {p.rewardsAvailable > 0 ? (
                <Button size="sm" variant="secondary" onClick={() => handleRedeem(p)}>
                  Entregar prêmio
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      {openProgress ? (
        <LoyaltyCardDialog progress={openProgress} settings={settings} onClose={closeCard} />
      ) : null}
    </div>
  )
}

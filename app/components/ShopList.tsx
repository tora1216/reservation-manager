'use client'

import { useState, useEffect } from 'react'
import { subscribeShops, addShop, deleteShop, type Shop } from '@/app/lib/shops'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

const CATEGORIES = [
  { label: 'レストラン', emoji: '🍽️' },
  { label: 'ラーメン',   emoji: '🍜' },
  { label: 'その他',     emoji: '📌' },
]

/** releaseDay の曜日で、今日以降の直近の日付を返す */
function nextReleaseDate(releaseDay: number): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = (releaseDay - today.getDay() + 7) % 7
  const next = new Date(today)
  next.setDate(today.getDate() + diff)
  return next
}

function daysUntilNext(releaseDay: number): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = (releaseDay - today.getDay() + 7) % 7
  return diff
}

function formatNextDate(releaseDay: number): string {
  const d = nextReleaseDate(releaseDay)
  return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}

function ReleaseBadge({ releaseDay }: { releaseDay: number }) {
  const days = daysUntilNext(releaseDay)
  if (days === 0) {
    return (
      <span className="inline-block rounded-full bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5">
        本日受付
      </span>
    )
  }
  if (days <= 3) {
    return (
      <span className="inline-block rounded-full bg-orange-100 text-orange-700 text-xs font-semibold px-2 py-0.5">
        あと {days} 日
      </span>
    )
  }
  return (
    <span className="inline-block rounded-full bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5">
      あと {days} 日
    </span>
  )
}

function ShopCard({ shop, onDelete }: { shop: Shop; onDelete: (id: string) => void }) {
  const hasSchedule = shop.releaseDay !== null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900 truncate">{shop.name}</h2>
            {shop.category && (
              <span className="shrink-0 text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5 font-medium">
                {CATEGORIES.find((c) => c.label === shop.category)?.emoji} {shop.category}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(shop.id)}
          className="shrink-0 text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50"
          aria-label="削除"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>

      {hasSchedule ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>
              毎週{DAY_LABELS[shop.releaseDay!]}曜日
              {shop.releaseTime && ` ${shop.releaseTime}`}
              {' '}に枠開放
            </span>
            <ReleaseBadge releaseDay={shop.releaseDay!} />
          </div>
          <p className="text-xs text-gray-400 pl-[22px]">
            次回: {formatNextDate(shop.releaseDay!)}
            {shop.releaseTime && ` ${shop.releaseTime}`}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>受付スケジュール未設定</span>
        </div>
      )}

      {shop.reservationUrl && (
        <a
          href={shop.reservationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors w-fit"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span className="truncate max-w-xs">{shop.reservationUrl}</span>
        </a>
      )}

      {shop.notes && (
        <p className="text-sm text-gray-400 leading-relaxed">{shop.notes}</p>
      )}
    </div>
  )
}

interface ModalProps {
  onClose: () => void
  onSave: (shop: Omit<Shop, 'id' | 'createdAt'>) => Promise<void>
}

function AddShopModal({ onClose, onSave }: ModalProps) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [reservationUrl, setReservationUrl] = useState('')
  const [releaseDay, setReleaseDay] = useState<number | null>(null)
  const [releaseTime, setReleaseTime] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('お店の名前を入力してください')
      return
    }
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        category: category.trim(),
        reservationUrl: reservationUrl.trim(),
        releaseDay,
        releaseTime,
        notes: notes.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-semibold text-gray-900">お店を追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              お店の名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="例: 銀座 〇〇レストラン"
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">カテゴリ</label>
            <div className="flex gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setCategory(category === c.label ? '' : c.label)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    category === c.label
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  <span className="text-xl leading-none">{c.emoji}</span>
                  <span className="text-xs">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">枠開放の曜日</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReleaseDay(releaseDay === i ? null : i)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    releaseDay === i
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">開放時刻</label>
            <input
              type="time"
              value={releaseTime}
              onChange={(e) => setReleaseTime(e.target.value)}
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">予約サイトURL</label>
            <input
              type="url"
              value={reservationUrl}
              onChange={(e) => setReservationUrl(e.target.value)}
              placeholder="https://..."
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">メモ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="自由記入欄"
              rows={3}
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
            >
              {saving ? '保存中...' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ShopList() {
  const [shops, setShops] = useState<Shop[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeShops((data) => {
      setShops(data)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function handleSave(data: Omit<Shop, 'id' | 'createdAt'>) {
    await addShop(data)
    setShowModal(false)
  }

  async function handleDelete(id: string) {
    setDeleteError('')
    try {
      await deleteShop(id)
    } catch {
      setDeleteError('削除に失敗しました。もう一度お試しください。')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">予約リスト</h1>
          <span className="text-sm text-gray-400">{loading ? '...' : `${shops.length} 件`}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {deleteError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
            {deleteError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-700">お店がまだ登録されていません</p>
              <p className="text-sm text-gray-400 mt-1">右下の + ボタンから追加できます</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center z-40"
        aria-label="お店を追加"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {showModal && (
        <AddShopModal onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </div>
  )
}

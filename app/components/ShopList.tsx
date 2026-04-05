'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { subscribeShops, addShop, updateShop, deleteShop, type Shop, type ReleaseType } from '@/app/lib/shops'

function toggleDay(days: number[], day: number): number[] {
  return days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
}
import { subscribeCategories, addCategory, deleteCategory, reorderCategories, type Category } from '@/app/lib/categories'

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

const RELEASE_TYPES: { value: ReleaseType; label: string }[] = [
  { value: 'monthly', label: '毎月' },
  { value: 'weekly',  label: '毎週' },
  { value: 'daily',   label: '毎日' },
]

// ─── スケジュール計算ユーティリティ ──────────────────────────

function getNextRelease(shop: Shop): { date: Date; daysAway: number } | null {
  const { releaseType, releaseDays, releaseTime } = shop
  if (!releaseType) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (releaseType === 'weekly' && releaseDays.length > 0) {
    // 最も近い曜日を選ぶ
    const diffs = releaseDays.map((d) => (d - today.getDay() + 7) % 7)
    const minDiff = Math.min(...diffs)
    const next = new Date(today)
    next.setDate(today.getDate() + minDiff)
    return { date: next, daysAway: minDiff }
  }

  if (releaseType === 'monthly' && releaseDays.length > 0) {
    const day = releaseDays[0]
    let next = new Date(today.getFullYear(), today.getMonth(), day)
    if (next.getTime() < today.getTime()) {
      next = new Date(today.getFullYear(), today.getMonth() + 1, day)
    }
    const daysAway = Math.round((next.getTime() - today.getTime()) / 86400000)
    return { date: next, daysAway }
  }

  if (releaseType === 'daily') {
    const now = new Date()
    const [h = 0, m = 0] = releaseTime ? releaseTime.split(':').map(Number) : []
    const passed = now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m)
    const daysAway = passed ? 1 : 0
    const next = new Date(today)
    next.setDate(today.getDate() + daysAway)
    return { date: next, daysAway }
  }

  return null
}

function releaseScheduleText(shop: Shop): string {
  const { releaseType, releaseDays, releaseTime } = shop
  const t = releaseTime ? ` ${releaseTime}` : ''
  if (releaseType === 'weekly' && releaseDays.length > 0) {
    const sorted = [...releaseDays].sort((a, b) => WEEKDAY_DISPLAY_ORDER.indexOf(a) - WEEKDAY_DISPLAY_ORDER.indexOf(b))
    const labels = sorted.map((d) => `${DAY_LABELS[d]}曜日`).join('・')
    return `毎週${labels}${t} 予約開始`
  }
  if (releaseType === 'monthly' && releaseDays.length > 0) return `毎月${releaseDays[0]}日${t} 予約開始`
  if (releaseType === 'daily') return `毎日${t} 予約開始`
  return ''
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })
}

function ReleaseBadge({ daysAway }: { daysAway: number }) {
  if (daysAway === 0) return <span className="inline-block rounded-full bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 dark:bg-red-900/40 dark:text-red-400">本日受付</span>
  return (
    <span className={`inline-block rounded-full text-xs font-semibold px-2 py-0.5 ${daysAway <= 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
      あと {daysAway} 日
    </span>
  )
}

// ─── ShopCard ───────────────────────────────────────────────
function ShopCard({ shop, categories, onEdit, onDelete }: {
  shop: Shop
  categories: Category[]
  onEdit: (s: Shop) => void
  onDelete: (id: string) => void
}) {
  const cat = categories.find((c) => c.label === shop.category)
  const next = getNextRelease(shop)
  const scheduleText = releaseScheduleText(shop)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow dark:bg-gray-900 dark:border-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-gray-900 truncate dark:text-white">{shop.name}</h2>
            {shop.category && (
              <span className="shrink-0 text-xs bg-indigo-50 text-indigo-600 rounded-full px-2 py-0.5 font-medium dark:bg-indigo-900/40 dark:text-indigo-400">
                {cat?.emoji} {shop.category}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button onClick={() => onEdit(shop)} className="text-gray-300 hover:text-indigo-400 transition-colors p-1 rounded-lg hover:bg-indigo-50" aria-label="編集">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button onClick={() => onDelete(shop.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50" aria-label="削除">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>
      </div>

      {scheduleText ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="dark:text-gray-400">{scheduleText}</span>
            {next && <ReleaseBadge daysAway={next.daysAway} />}
          </div>
          {next && (
            <p className="text-xs text-gray-400 pl-[22px]">
              次回: {formatDate(next.date)}{shop.releaseTime && ` ${shop.releaseTime}`}
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <span>受付スケジュール未設定</span>
        </div>
      )}

      {shop.reservationUrl && (
        <a href={shop.reservationUrl} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 hover:underline transition-colors w-fit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span className="truncate max-w-xs">{shop.reservationUrl}</span>
        </a>
      )}

      {shop.notes && <p className="text-sm text-gray-400 leading-relaxed">{shop.notes}</p>}
    </div>
  )
}

// ─── SettingsModal ───────────────────────────────────────────
function SettingsModal({ categories, onClose }: { categories: Category[]; onClose: () => void }) {
  const [newEmoji, setNewEmoji] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const labelRef = useRef<HTMLInputElement>(null)
  const touchState = useRef<{ startId: string; overId: string | null }>({ startId: '', overId: null })

  function startAdding() {
    setAdding(true); setNewEmoji(''); setNewLabel('')
    setTimeout(() => labelRef.current?.focus(), 0)
  }

  async function confirmAdd() {
    const label = newLabel.trim()
    if (!label) return
    await addCategory(label, newEmoji.trim() || '🏷️')
    setNewEmoji(''); setNewLabel(''); setAdding(false)
  }

  function applyReorder(fromId: string, toId: string) {
    if (fromId === toId) return
    const from = categories.findIndex((c) => c.id === fromId)
    const to = categories.findIndex((c) => c.id === toId)
    const reordered = [...categories]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    reorderCategories(reordered.map((c) => c.id))
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) { setDraggingId(null); setDragOverId(null); return }
    applyReorder(draggingId, targetId)
    setDraggingId(null); setDragOverId(null)
  }

  function handleTouchStart(id: string) {
    setDraggingId(id)
    touchState.current = { startId: id, overId: null }
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault()
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const row = el?.closest('[data-cat-id]') as HTMLElement | null
    const overId = row?.dataset.catId ?? null
    if (overId && overId !== touchState.current.startId) {
      touchState.current.overId = overId
      setDragOverId(overId)
    }
  }

  function handleTouchEnd() {
    const { startId, overId } = touchState.current
    if (overId) applyReorder(startId, overId)
    setDraggingId(null); setDragOverId(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto dark:bg-gray-900">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">設定</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">カテゴリ管理</h3>
              <span className="text-xs text-gray-400">ドラッグで並び替え</span>
            </div>
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
              {categories.map((cat) => (
                <div key={cat.id} data-cat-id={cat.id} draggable
                  onDragStart={() => setDraggingId(cat.id)}
                  onDragOver={(e) => { e.preventDefault(); if (cat.id !== draggingId) setDragOverId(cat.id) }}
                  onDrop={() => handleDrop(cat.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverId(null) }}
                  className={`flex items-center gap-3 px-3 py-3 bg-white dark:bg-gray-900 transition-all select-none ${draggingId === cat.id ? 'opacity-40' : ''} ${dragOverId === cat.id && draggingId !== cat.id ? 'border-t-2 border-indigo-400' : ''}`}>
                  <span
                    className="text-gray-300 cursor-grab active:cursor-grabbing shrink-0"
                    style={{ touchAction: 'none' }}
                    onTouchStart={() => handleTouchStart(cat.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" />
                    </svg>
                  </span>
                  <span className="text-xl w-7 text-center leading-none shrink-0">{cat.emoji}</span>
                  <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">{cat.label}</span>
                  <button onClick={() => deleteCategory(cat.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 shrink-0" aria-label={`${cat.label}を削除`}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              ))}
              {adding ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/20">
                  <input type="text" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)}
                    placeholder="🏷️" maxLength={4}
                    className="w-10 text-center border border-gray-200 rounded-lg px-1 py-1 text-[16px] text-gray-900 outline-none focus:border-indigo-400 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                  <input ref={labelRef} type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmAdd() } }}
                    placeholder="カテゴリ名"
                    className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[16px] text-gray-900 outline-none focus:border-indigo-400 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
                  <button onClick={confirmAdd} disabled={!newLabel.trim()}
                    className="text-indigo-600 hover:text-indigo-800 disabled:opacity-30 transition-colors p-1" aria-label="確定">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </button>
                  <button onClick={() => setAdding(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-1" aria-label="キャンセル">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button onClick={startAdding}
                  className="flex items-center gap-2 px-4 py-3 text-sm text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors font-medium">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  カテゴリを追加
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ShopFormModal ───────────────────────────────────────────
function ShopFormModal({ initialData, categories, onClose, onSave }: {
  initialData?: Shop
  categories: Category[]
  onClose: () => void
  onSave: (data: Omit<Shop, 'id' | 'createdAt'>) => Promise<void>
}) {
  const [name, setName] = useState(initialData?.name ?? '')
  const [category, setCategory] = useState(initialData?.category ?? '')
  const [reservationUrl, setReservationUrl] = useState(initialData?.reservationUrl ?? '')
  const [releaseType, setReleaseType] = useState<ReleaseType | null>(initialData?.releaseType ?? null)
  const [releaseDays, setReleaseDays] = useState<number[]>(initialData?.releaseDays ?? [])
  const [releaseTime, setReleaseTime] = useState(initialData?.releaseTime ?? '')
  const [notes, setNotes] = useState(initialData?.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = initialData !== undefined

  function handleTypeChange(type: ReleaseType) {
    if (releaseType === type) {
      setReleaseType(null); setReleaseDays([])
    } else {
      setReleaseType(type); setReleaseDays([])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('お店の名前を入力してください'); return }
    setSaving(true)
    try {
      await onSave({ name: name.trim(), category, reservationUrl: reservationUrl.trim(), releaseType, releaseDays, releaseTime, notes: notes.trim() })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90dvh] overflow-y-auto dark:bg-gray-900">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl dark:bg-gray-900 dark:border-gray-800">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isEdit ? 'お店を編集' : 'お店を追加'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* 店名 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">お店の名前 <span className="text-red-500">*</span></label>
            <input type="text" value={name} onChange={(e) => { setName(e.target.value); setError('') }}
              placeholder="例: 銀座 〇〇レストラン"
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-[16px] text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500" />
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* カテゴリ */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">カテゴリ</label>
            <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
              <button type="button" onClick={() => setCategory('')}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  category === ''
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                }`}>
                なし
              </button>
              {categories.map((cat) => (
                <button key={cat.id} type="button"
                  onClick={() => setCategory(category === cat.label ? '' : cat.label)}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    category === cat.label
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}>
                  <span>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 予約開始スケジュール */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">予約開始スケジュール</label>

            {/* タイプ選択 */}
            <div className="flex gap-2">
              {RELEASE_TYPES.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => handleTypeChange(value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    releaseType === value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* 毎週: 曜日（複数選択可） */}
            {releaseType === 'weekly' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-1.5">
                  {WEEKDAY_DISPLAY_ORDER.map((dayIndex) => (
                    <button key={dayIndex} type="button" onClick={() => setReleaseDays((prev) => toggleDay(prev, dayIndex))}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                        releaseDays.includes(dayIndex)
                          ? 'bg-indigo-500 text-white border-indigo-500'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                      }`}>
                      {DAY_LABELS[dayIndex]}
                    </button>
                  ))}
                </div>
                {releaseDays.length > 1 && (
                  <p className="text-xs text-gray-400">
                    {[...releaseDays].sort((a, b) => WEEKDAY_DISPLAY_ORDER.indexOf(a) - WEEKDAY_DISPLAY_ORDER.indexOf(b)).map((d) => `${DAY_LABELS[d]}曜日`).join('・')} に開放
                  </p>
                )}
              </div>
            )}

            {/* 毎月: 日付 */}
            {releaseType === 'monthly' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">毎月</span>
                <input
                  type="number" min="1" max="31"
                  value={releaseDays[0] ?? ''}
                  onChange={(e) => {
                    const v = parseInt(e.target.value)
                    setReleaseDays(isNaN(v) ? [] : [Math.min(31, Math.max(1, v))])
                  }}
                  placeholder="1"
                  className="w-16 border border-gray-200 rounded-xl px-3 py-2 text-[16px] text-gray-900 text-center outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">日</span>
              </div>
            )}

            {/* 開放時刻 (共通) */}
            {releaseType && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">開放時刻</span>
                <input type="time" value={releaseTime} onChange={(e) => setReleaseTime(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-2 text-[16px] text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white" />
              </div>
            )}
          </div>

          {/* 予約サイトURL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">予約サイトURL</label>
            <input type="url" value={reservationUrl} onChange={(e) => setReservationUrl(e.target.value)}
              placeholder="https://..."
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-[16px] text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500" />
          </div>

          {/* メモ */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">メモ</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="自由記入欄" rows={3}
              className="border border-gray-200 rounded-xl px-3.5 py-2.5 text-[16px] text-gray-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all resize-none dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder:text-gray-500" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} disabled={saving}
              className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
              キャンセル
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60">
              {saving ? '保存中...' : isEdit ? '保存する' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ShopList (page root) ────────────────────────────────────
export default function ShopList() {
  const [shops, setShops] = useState<Shop[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Shop | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteError, setDeleteError] = useState('')
  const [isDark, setIsDark] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'release' | 'registered' | 'name'>('release')

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggleTheme = useCallback(() => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    const unsubShops = subscribeShops((data) => { setShops(data); setLoading(false) })
    const unsubCats = subscribeCategories(setCategories)
    return () => { unsubShops(); unsubCats() }
  }, [])

  async function handleAdd(data: Omit<Shop, 'id' | 'createdAt'>) {
    await addShop(data); setAddOpen(false)
  }
  async function handleUpdate(data: Omit<Shop, 'id' | 'createdAt'>) {
    if (!editTarget) return
    await updateShop(editTarget.id, data); setEditTarget(null)
  }
  async function handleDelete(id: string) {
    setDeleteError('')
    try { await deleteShop(id) }
    catch { setDeleteError('削除に失敗しました。もう一度お試しください。') }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm dark:bg-gray-900 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight dark:text-white">予約リスト</h1>
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800"
              aria-label={isDark ? 'ライトモードに切替' : 'ダークモードに切替'}>
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button onClick={() => setSettingsOpen(true)}
              className="text-gray-400 hover:text-gray-700 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800" aria-label="設定">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {!loading && categories.length > 0 && (
        <div className="sticky top-14 z-30 bg-white dark:bg-gray-900">
          <div className="max-w-2xl mx-auto px-4 pt-2 pb-0 flex flex-col">
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <button onClick={() => setFilterCategory(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  filterCategory === null
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                }`}>
                すべて
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => setFilterCategory(filterCategory === cat.label ? null : cat.label)}
                  className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    filterCategory === cat.label
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}>
                  <span>{cat.emoji}</span>
                  {filterCategory === cat.label && <span>{cat.label}</span>}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2 pb-0.5 bg-gray-50 dark:bg-gray-950 -mx-4 px-4">
              <span className="text-sm text-gray-400 dark:text-gray-500">{`${filterCategory ? shops.filter((s) => s.category === filterCategory).length : shops.length} 件`}</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as typeof sortOrder)}
                className="text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300">
                <option value="release">開放順</option>
                <option value="registered">登録順</option>
                <option value="name">名前順</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 pt-3 pb-28">
        {deleteError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">{deleteError}</div>
        )}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : shops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center dark:bg-indigo-900/30">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">お店がまだ登録されていません</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">右下の + ボタンから追加できます</p>
            </div>
          </div>
        ) : (() => {
          const filtered = filterCategory ? shops.filter((s) => s.category === filterCategory) : shops
          const sorted = [...filtered].sort((a, b) => {
            if (sortOrder === 'name') return a.name.localeCompare(b.name, 'ja')
            if (sortOrder === 'registered') return (b.createdAt > a.createdAt ? 1 : -1)
            // release: 次回開放が近い順、未設定は末尾
            const da = getNextRelease(a)?.daysAway ?? Infinity
            const db = getNextRelease(b)?.daysAway ?? Infinity
            return da - db
          })
          return sorted.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-16">このカテゴリのお店はありません</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sorted.map((shop) => (
                <ShopCard key={shop.id} shop={shop} categories={categories} onEdit={setEditTarget} onDelete={handleDelete} />
              ))}
            </div>
          )
        })()}
      </main>

      <button onClick={() => setAddOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center z-40"
        aria-label="お店を追加">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {settingsOpen && <SettingsModal categories={categories} onClose={() => setSettingsOpen(false)} />}
      {addOpen && <ShopFormModal categories={categories} onClose={() => setAddOpen(false)} onSave={handleAdd} />}
      {editTarget && <ShopFormModal initialData={editTarget} categories={categories} onClose={() => setEditTarget(null)} onSave={handleUpdate} />}
    </div>
  )
}

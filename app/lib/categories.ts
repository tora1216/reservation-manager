import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
  getDocs,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

export interface Category {
  id: string
  label: string
  emoji: string
  order: number | null
}

const COLLECTION = 'categories'

const DEFAULTS = [
  { label: 'レストラン', emoji: '🍽️', order: 0 },
  { label: 'ラーメン',   emoji: '🍜', order: 1 },
  { label: 'その他',     emoji: '📌', order: 2 },
]

// 初回ロード完了前にスナップショットが空だった場合のみデフォルト投入する
let _defaultsSeeded = false

export function subscribeCategories(callback: (cats: Category[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'))
  return onSnapshot(q, async (snapshot) => {
    // まだ一度もデータが存在したことがない場合のみデフォルトを投入
    if (snapshot.empty && !_defaultsSeeded) {
      _defaultsSeeded = true
      const batch = writeBatch(db)
      DEFAULTS.forEach((d) => {
        batch.set(doc(collection(db, COLLECTION)), { ...d, createdAt: serverTimestamp() })
      })
      await batch.commit()
      return
    }
    // データが存在する状態を一度でも確認したらフラグを立てる
    if (!snapshot.empty) _defaultsSeeded = true

    const cats: Category[] = snapshot.docs.map((d) => ({
      id: d.id,
      label: d.data().label ?? '',
      emoji: d.data().emoji ?? '',
      order: d.data().order ?? null,
    }))
    const allHaveOrder = cats.every((c) => c.order !== null)
    if (allHaveOrder) {
      cats.sort((a, b) => (a.order as number) - (b.order as number))
    }
    callback(cats)
  })
}

export async function addCategory(label: string, emoji: string): Promise<void> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  const maxOrder = snapshot.docs.reduce(
    (max, d) => Math.max(max, d.data().order ?? -1),
    -1,
  )
  await addDoc(collection(db, COLLECTION), {
    label,
    emoji,
    order: maxOrder + 1,
    createdAt: serverTimestamp(),
  })
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const batch = writeBatch(db)
  orderedIds.forEach((id, index) => {
    batch.update(doc(db, COLLECTION, id), { order: index })
  })
  await batch.commit()
}

export async function updateCategory(id: string, label: string, emoji: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { label, emoji })
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

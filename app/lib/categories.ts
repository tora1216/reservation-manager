import {
  collection,
  addDoc,
  deleteDoc,
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

export function subscribeCategories(callback: (cats: Category[]) => void): Unsubscribe {
  // createdAt でフェッチし、order があればクライアント側でソート
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'asc'))
  return onSnapshot(q, async (snapshot) => {
    if (snapshot.empty) {
      for (const d of DEFAULTS) {
        await addDoc(collection(db, COLLECTION), { ...d, createdAt: serverTimestamp() })
      }
      return
    }
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

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

import {
  collection,
  addDoc,
  deleteDoc,
  setDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

export type ReleaseType = 'weekly' | 'monthly' | 'daily'

export interface Shop {
  id: string
  name: string
  category: string
  reservationUrl: string
  /** 解放パターン: weekly=毎週, monthly=毎月, daily=毎日, null=未設定 */
  releaseType: ReleaseType | null
  /**
   * weekly: 0=日〜6=土 の配列（複数選択可）
   * monthly: [日付(1〜31)]
   * daily: []
   */
  releaseDays: number[]
  /** "HH:MM" 形式。空文字=未設定 */
  releaseTime: string
  notes: string
  createdAt: string
}

type ShopInput = Omit<Shop, 'id' | 'createdAt'>

const COLLECTION = 'shops'

export function subscribeShops(callback: (shops: Shop[]) => void): Unsubscribe {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    const shops: Shop[] = snapshot.docs.map((d) => {
      const data = d.data()
      // 旧データ (releaseType なし) は weekly として扱う
      const releaseType: ReleaseType | null =
        data.releaseType ?? (data.releaseDay != null ? 'weekly' : null)
      // 旧データ (releaseDay: number) を releaseDays: number[] に移行
      let releaseDays: number[] = data.releaseDays ?? []
      if (releaseDays.length === 0 && data.releaseDay != null) {
        releaseDays = [data.releaseDay]
      }
      return {
        id: d.id,
        name: data.name ?? '',
        category: data.category ?? '',
        reservationUrl: data.reservationUrl ?? '',
        releaseType,
        releaseDays,
        releaseTime: data.releaseTime ?? '',
        notes: data.notes ?? '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? '',
      }
    })
    callback(shops)
  })
}

export async function addShop(input: ShopInput): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    ...input,
    createdAt: serverTimestamp(),
  })
}

export async function updateShop(id: string, input: ShopInput): Promise<void> {
  await setDoc(doc(db, COLLECTION, id), input, { merge: true })
}

export async function deleteShop(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

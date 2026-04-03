import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

export interface Shop {
  id: string
  name: string
  category: string
  reservationUrl: string
  /** 0=日 1=月 2=火 3=水 4=木 5=金 6=土  null=未設定 */
  releaseDay: number | null
  /** "HH:MM" 形式 例: "10:00"  空文字=未設定 */
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
      return {
        id: d.id,
        name: data.name ?? '',
        category: data.category ?? '',
        reservationUrl: data.reservationUrl ?? '',
        releaseDay: data.releaseDay ?? null,
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

export async function deleteShop(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id))
}

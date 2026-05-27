import { db } from './db'

export async function getMeta<T>(key: string): Promise<T | null> {
  const record = await db.meta.get(key)
  if (!record) {
    return null
  }

  return JSON.parse(record.value) as T
}

export async function setMeta<T>(key: string, value: T): Promise<void> {
  await db.meta.put({ key, value: JSON.stringify(value) })
}

export async function removeMeta(key: string): Promise<void> {
  await db.meta.delete(key)
}

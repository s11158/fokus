// Файловое хранилище моста: очередь захватов + снимок задач приложения.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// fileURLToPath корректно обрабатывает пути на Windows (без ведущего слэша).
const FILE = fileURLToPath(new URL('./data/state.json', import.meta.url))

const empty = () => ({ captures: [], snapshot: { inbox: [], today: [], updatedAt: 0 } })

let cache = null

async function load() {
  if (cache) return cache
  try {
    cache = JSON.parse(await readFile(FILE, 'utf8'))
  } catch {
    cache = empty()
  }
  return cache
}

async function persist() {
  await mkdir(dirname(FILE), { recursive: true })
  await writeFile(FILE, JSON.stringify(cache, null, 2))
}

function rid() {
  return 'cap-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export async function addCapture(task, source = 'telegram') {
  const s = await load()
  const item = { id: rid(), task, source, createdAt: Date.now() }
  s.captures.push(item)
  await persist()
  return item
}

export async function listCaptures() {
  return (await load()).captures
}

export async function ackCaptures(ids) {
  const s = await load()
  const set = new Set(ids)
  s.captures = s.captures.filter((c) => !set.has(c.id))
  await persist()
  return s.captures.length
}

export async function setSnapshot(inbox, today) {
  const s = await load()
  s.snapshot = { inbox: inbox || [], today: today || [], updatedAt: Date.now() }
  await persist()
}

export async function getSnapshot() {
  return (await load()).snapshot
}

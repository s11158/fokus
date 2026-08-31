// Локальный HTTP-мост между Telegram-ботом и веб-приложением.
// Приложение опрашивает /captures и импортирует их в Inbox, затем /captures/ack.
// Приложение пушит снимок задач в /snapshot — бот отвечает на /inbox и /today.
import { createServer } from 'node:http'
import { addCapture, listCaptures, ackCaptures, setSnapshot, getSnapshot } from './store.js'

const PORT = Number(process.env.BRIDGE_PORT || 8787)

function send(res, code, data) {
  const body = JSON.stringify(data)
  res.writeHead(code, {
    'content-type': 'application/json',
    // Разрешаем доступ из локального приложения (любой localhost-origin).
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve) => {
    let b = ''
    req.on('data', (c) => (b += c))
    req.on('end', () => {
      try { resolve(b ? JSON.parse(b) : {}) } catch { resolve({}) }
    })
  })
}

export function startBridge() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`)
    if (req.method === 'OPTIONS') return send(res, 204, {})

    try {
      if (url.pathname === '/health') return send(res, 200, { ok: true, ts: Date.now() })

      if (url.pathname === '/captures' && req.method === 'GET') {
        return send(res, 200, { captures: await listCaptures() })
      }
      if (url.pathname === '/captures' && req.method === 'POST') {
        const body = await readBody(req)
        if (!body.task?.title) return send(res, 400, { error: 'task.title required' })
        const item = await addCapture(body.task, body.source || 'api')
        return send(res, 200, { ok: true, item })
      }
      if (url.pathname === '/captures/ack' && req.method === 'POST') {
        const body = await readBody(req)
        const remaining = await ackCaptures(Array.isArray(body.ids) ? body.ids : [])
        return send(res, 200, { ok: true, remaining })
      }
      if (url.pathname === '/snapshot' && req.method === 'POST') {
        const body = await readBody(req)
        await setSnapshot(body.inbox, body.today)
        return send(res, 200, { ok: true })
      }
      if (url.pathname === '/snapshot' && req.method === 'GET') {
        return send(res, 200, await getSnapshot())
      }
      send(res, 404, { error: 'not found' })
    } catch (e) {
      send(res, 500, { error: String(e?.message || e) })
    }
  })

  server.listen(PORT, () => console.log(`[мост] слушает http://localhost:${PORT}`))
  return server
}

// Позволяет запустить мост отдельно: `node bridge.js` (для теста без Telegram).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('bridge.js')) {
  startBridge()
}

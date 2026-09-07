// Telegram-бот захвата для «Фокуса».
// Принимает текст/голос -> AI-разбор -> кладёт в очередь моста.
// Команды: /inbox, /today (из снимка, который пушит приложение).
// Токен и ключи - только из .env (см. .env.example). Ничего не хардкодим.
import 'dotenv/config'
import { Bot } from 'grammy'
import { parseTask } from './ai.js'
import { transcribe } from './stt.js'
import { addCapture, getSnapshot } from './store.js'
import { startBridge } from './bridge.js'

const token = process.env.TELEGRAM_BOT_TOKEN
if (!token) {
  console.error('Нет TELEGRAM_BOT_TOKEN. Скопируйте .env.example в .env и заполните.')
  process.exit(1)
}

// Поднимаем локальный мост, чтобы приложение могло забирать захваты.
startBridge()

const bot = new Bot(token)

const fmtTask = (t) => {
  const bits = []
  if (t.priority) bits.push('⚑'.repeat(t.priority))
  if (t.start) bits.push('📅 ' + String(t.start).slice(0, 16).replace('T', ' '))
  if (t.tags?.length) bits.push(t.tags.map((x) => '#' + x).join(' '))
  const sub = t.subtasks?.length ? '\n  • ' + t.subtasks.join('\n  • ') : ''
  return `✅ В Inbox: *${t.title}*` + (bits.length ? '\n' + bits.join('  ') : '') + sub
}

bot.command('start', (ctx) =>
  ctx.reply('Привет! Пришлите задачу текстом или голосом - я разберу её и положу в Inbox «Фокуса».\nКоманды: /inbox, /today'),
)

bot.command('inbox', async (ctx) => {
  const s = await getSnapshot()
  if (!s.updatedAt) return ctx.reply('Снимок пуст. Откройте приложение «Фокус», чтобы синхронизировать.')
  const list = s.inbox.slice(0, 20)
  ctx.reply(list.length ? '📥 Входящие:\n' + list.map((t) => '• ' + t).join('\n') : 'Во «Входящих» пусто.')
})

bot.command('today', async (ctx) => {
  const s = await getSnapshot()
  if (!s.updatedAt) return ctx.reply('Снимок пуст. Откройте приложение «Фокус», чтобы синхронизировать.')
  const list = s.today.slice(0, 20)
  ctx.reply(list.length ? '⭐ Сегодня:\n' + list.map((t) => '• ' + t).join('\n') : 'На сегодня задач нет.')
})

async function capture(ctx, text) {
  if (!text?.trim()) return
  const task = await parseTask(text)
  await addCapture(task, 'telegram')
  await ctx.reply(fmtTask(task), { parse_mode: 'Markdown' })
}

// Текстовые сообщения (кроме команд)
bot.on('message:text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return
  await capture(ctx, ctx.message.text)
})

// Голосовые сообщения -> STT -> разбор
bot.on('message:voice', async (ctx) => {
  try {
    await ctx.replyWithChatAction('typing')
    const file = await ctx.getFile()
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`
    const buf = Buffer.from(await (await fetch(fileUrl)).arrayBuffer())
    const text = await transcribe(buf, 'audio/ogg')
    if (!text) return ctx.reply('Не удалось распознать речь.')
    await ctx.reply(`🎙 Распознано: «${text}»`)
    await capture(ctx, text)
  } catch (e) {
    ctx.reply('Ошибка обработки голоса: ' + (e?.message || e))
  }
})

bot.catch((err) => console.error('[bot] ошибка', err))

bot.start({ onStart: (i) => console.log(`[bot] @${i.username} запущен`) })

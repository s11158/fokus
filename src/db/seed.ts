// Демо-данные при первом запуске, чтобы интерфейс не был пустым.
// Позже заменим импортом из вашего SingularityApp-бэкапа.
import { db } from './db'
import { createProject, createTask, createTag, createKanbanStatus, addChecklistItem } from './repo'
import { addDays, startOfDay } from '../lib/date'

export async function ensureSeed() {
  const flag = await db.settings.get('seeded')
  if (flag) return

  const t = (offset: number, h = 0) => startOfDay(addDays(new Date(), offset)).getTime() + h * 3600_000

  const work = await createTag('работа', '#6c8cff')
  const home = await createTag('дом', '#66bb6a')

  const p1 = await createProject({ title: 'Запуск приложения', emoji: '🚀', color: '#6c8cff' })
  await createKanbanStatus(p1, 'К выполнению', '#8b93a4')
  await createKanbanStatus(p1, 'В работе', '#ffc107')
  await createKanbanStatus(p1, 'Готово', '#66bb6a')

  const p2 = await createProject({ title: 'Личное', emoji: '🏡', color: '#66bb6a' })

  // Задача с подзадачами и чек-листом
  const parent = await createTask({
    title: 'Собрать MVP',
    projectId: p1,
    priority: 3,
    tags: [work],
    deadline: t(3),
    pinned: true,
  })
  await createTask({ title: 'Каркас и навигация', projectId: p1, parentId: parent, priority: 2, complete: false })
  await createTask({ title: 'Список задач + подзадачи', projectId: p1, parentId: parent, priority: 2 })
  await createTask({ title: 'Свойства задач', projectId: p1, parentId: parent, priority: 1 })

  const t2 = await createTask({ title: 'Написать описание для лендинга', projectId: p1, start: t(0, 10), useTime: true, priority: 2, tags: [work] })
  await addChecklistItem(t2, 'Заголовок')
  await addChecklistItem(t2, 'Подзаголовок')
  await addChecklistItem(t2, 'Кнопка призыва')

  await createTask({ title: 'Купить продукты', projectId: p2, start: t(0), tags: [home], priority: 1 })
  await createTask({ title: 'Записаться к врачу', projectId: p2, deadline: t(-1) }) // просрочено
  await createTask({ title: 'Прочитать книгу про GTD', projectId: p2, deferred: true, state: 'someday' })

  // Входящие (без проекта)
  await createTask({ title: 'Разобрать почту', start: t(0) })
  await createTask({ title: 'Идея: офлайн-режим заметок' })

  await db.settings.put({ id: 'seeded', value: true })
}

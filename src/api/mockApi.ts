import { seedBoards, seedWorkspaces } from '../mock/data'
import type {
  ActivityEvent,
  BoardDetails,
  BoardSummary,
  LoginPayload,
  PublicBoard,
  PublicTask,
  Session,
  Task,
  TaskPayload,
  TaskUpdatePayload,
  Workspace,
} from '../types'

const DB_KEY = 'taskboard-db-v1'
const LATENCY = 250
const SESSION_MS = 1000 * 60 * 20

interface Database {
  workspaces: Workspace[]
  boards: BoardDetails[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function wait() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, LATENCY)
  })
}

function buildSeedDb(): Database {
  return {
    workspaces: seedWorkspaces,
    boards: seedBoards,
  }
}

function loadDb(): Database {
  const stored = window.localStorage.getItem(DB_KEY)
  if (!stored) {
    const seeded = buildSeedDb()
    window.localStorage.setItem(DB_KEY, JSON.stringify(seeded))
    return clone(seeded)
  }

  return JSON.parse(stored) as Database
}

function saveDb(db: Database) {
  window.localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function findBoardOrThrow(db: Database, boardId: string) {
  const board = db.boards.find((entry) => entry.id === boardId)
  if (!board) {
    throw new Error('Board not found')
  }
  return board
}

function pushActivity(board: BoardDetails, type: ActivityEvent['type'], message: string) {
  const event: ActivityEvent = {
    id: `activity-${crypto.randomUUID()}`,
    boardId: board.id,
    type,
    message,
    createdAt: new Date().toISOString(),
  }

  board.activity = [event, ...board.activity].slice(0, 10)
  board.updatedAt = event.createdAt
}

function sortTasks(tasks: Task[]) {
  return tasks
    .slice()
    .sort((a, b) => a.order - b.order || a.updatedAt.localeCompare(b.updatedAt))
}

function normaliseColumnOrders(board: BoardDetails, columnId: string) {
  const ordered = sortTasks(board.tasks.filter((task) => task.columnId === columnId))
  ordered.forEach((task, index) => {
    task.order = index
  })
}

function simulateBoardUpdate() {
  const db = loadDb()
  const availableBoards = db.boards.filter((board) => board.tasks.length > 0)
  if (availableBoards.length === 0) {
    return
  }

  const board = availableBoards[Math.floor(Math.random() * availableBoards.length)]
  const task = board.tasks[Math.floor(Math.random() * board.tasks.length)]
  const column = board.columns[Math.floor(Math.random() * board.columns.length)]
  const actions = ['status', 'copy'] as const
  const action = actions[Math.floor(Math.random() * actions.length)]

  if (action === 'status' && task.columnId !== column.id) {
    task.columnId = column.id
    task.updatedAt = new Date().toISOString()
    normaliseColumnOrders(board, column.id)
    pushActivity(board, 'simulated', `${task.assignee} moved ${task.title} to ${column.title}`)
  } else {
    task.description = `${task.description.split('. ')[0]}. Synced with teammate feedback.`
    task.updatedAt = new Date().toISOString()
    pushActivity(board, 'simulated', `${task.assignee} updated ${task.title}`)
  }

  saveDb(db)
}

let simulatorStarted = false

export function startMockRealtime() {
  if (simulatorStarted) {
    return
  }

  simulatorStarted = true
  window.setInterval(() => {
    simulateBoardUpdate()
  }, 18000)
}

export async function login(payload: LoginPayload): Promise<Session> {
  await wait()

  if (!payload.email || !payload.password) {
    throw new Error('Email and password are required')
  }

  return {
    token: crypto.randomUUID(),
    user: {
      id: 'user-1',
      name: payload.email.split('@')[0] || 'Demo User',
      email: payload.email,
    },
    expiresAt: new Date(Date.now() + SESSION_MS).toISOString(),
  }
}

export async function getWorkspaces(): Promise<Workspace[]> {
  await wait()
  return clone(loadDb().workspaces)
}

export async function getBoards(workspaceId: string): Promise<BoardSummary[]> {
  await wait()
  return clone(
    loadDb()
      .boards.filter((board) => board.workspaceId === workspaceId)
      .map((board) => ({
        id: board.id,
        workspaceId: board.workspaceId,
        name: board.name,
        description: board.description,
        isPublic: board.isPublic,
        updatedAt: board.updatedAt,
      })),
  )
}

export async function getBoard(boardId: string): Promise<BoardDetails> {
  await wait()
  const board = findBoardOrThrow(loadDb(), boardId)
  board.tasks = sortTasks(board.tasks)
  return clone(board)
}

export async function createTask(payload: TaskPayload): Promise<Task> {
  await wait()
  const db = loadDb()
  const board = findBoardOrThrow(db, payload.boardId)
  const columnTasks = sortTasks(board.tasks.filter((task) => task.columnId === payload.columnId))
  const task: Task = {
    id: `task-${crypto.randomUUID()}`,
    boardId: payload.boardId,
    columnId: payload.columnId,
    title: payload.title,
    description: payload.description,
    assignee: payload.assignee,
    priority: payload.priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: columnTasks.length,
  }

  board.tasks.push(task)
  pushActivity(
    board,
    'created',
    `${task.title} was created in ${board.columns.find((col) => col.id === task.columnId)?.title ?? 'a column'}`,
  )
  saveDb(db)
  return clone(task)
}

export async function updateTask(payload: TaskUpdatePayload): Promise<Task> {
  await wait()
  const db = loadDb()
  const board = db.boards.find((entry) => entry.tasks.some((task) => task.id === payload.id))

  if (!board) {
    throw new Error('Task not found')
  }

  const task = board.tasks.find((entry) => entry.id === payload.id)
  if (!task) {
    throw new Error('Task not found')
  }

  const fromColumnId = task.columnId
  const toColumnId = payload.columnId ?? task.columnId

  Object.assign(task, payload)
  task.columnId = toColumnId
  task.updatedAt = new Date().toISOString()

  normaliseColumnOrders(board, fromColumnId)
  normaliseColumnOrders(board, toColumnId)

  if (fromColumnId !== toColumnId) {
    pushActivity(
      board,
      'moved',
      `${task.title} moved to ${board.columns.find((col) => col.id === toColumnId)?.title ?? 'a column'}`,
    )
  } else {
    pushActivity(board, 'updated', `${task.title} was updated`)
  }

  saveDb(db)
  return clone(task)
}

export async function deleteTask(taskId: string): Promise<{ id: string }> {
  await wait()
  const db = loadDb()
  const board = db.boards.find((entry) => entry.tasks.some((task) => task.id === taskId))

  if (!board) {
    throw new Error('Task not found')
  }

  const task = board.tasks.find((entry) => entry.id === taskId)
  board.tasks = board.tasks.filter((entry) => entry.id !== taskId)

  if (task) {
    normaliseColumnOrders(board, task.columnId)
    pushActivity(board, 'deleted', `${task.title} was deleted`)
  }

  saveDb(db)
  return { id: taskId }
}

export async function getPublicBoard(boardId: string): Promise<PublicBoard> {
  await wait()
  const db = loadDb()
  const board = findBoardOrThrow(db, boardId)

  if (!board.isPublic) {
    throw new Error('This board is not shared publicly')
  }

  const workspace = db.workspaces.find((entry) => entry.id === board.workspaceId)

  return clone({
    id: board.id,
    name: board.name,
    description: board.description,
    workspaceName: workspace?.name ?? 'Unknown workspace',
    updatedAt: board.updatedAt,
    columns: board.columns,
    tasks: sortTasks(board.tasks),
    activity: board.activity,
  })
}

export async function getPublicTask(taskId: string): Promise<PublicTask> {
  await wait()
  const db = loadDb()
  const board = db.boards.find(
    (entry) => entry.isPublic && entry.tasks.some((task) => task.id === taskId),
  )

  if (!board) {
    throw new Error('This task is not shared publicly')
  }

  const task = board.tasks.find((entry) => entry.id === taskId)
  const column = board.columns.find((entry) => entry.id === task?.columnId)
  const workspace = db.workspaces.find((entry) => entry.id === board.workspaceId)

  if (!task || !column) {
    throw new Error('Task not found')
  }

  return clone({
    task,
    column,
    updatedAt: task.updatedAt,
    board: {
      id: board.id,
      name: board.name,
      description: board.description,
      workspaceName: workspace?.name ?? 'Unknown workspace',
    },
  })
}

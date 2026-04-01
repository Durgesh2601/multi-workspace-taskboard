export type SessionState = 'active' | 'expired'

export interface User {
  id: string
  name: string
  email: string
}

export interface Session {
  token: string
  user: User
  expiresAt: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  memberCount: number
  theme: string
}

export interface BoardSummary {
  id: string
  workspaceId: string
  name: string
  description: string
  isPublic: boolean
  updatedAt: string
}

export interface Column {
  id: string
  boardId: string
  title: string
  order: number
}

export type TaskPriority = 'Low' | 'Medium' | 'High'

export interface Task {
  id: string
  boardId: string
  columnId: string
  title: string
  description: string
  assignee: string
  priority: TaskPriority
  updatedAt: string
  createdAt: string
  order: number
}

export interface ActivityEvent {
  id: string
  boardId: string
  type: 'created' | 'updated' | 'moved' | 'deleted' | 'simulated'
  message: string
  createdAt: string
}

export interface BoardDetails extends BoardSummary {
  columns: Column[]
  tasks: Task[]
  activity: ActivityEvent[]
}

export interface PublicBoard {
  id: string
  name: string
  description: string
  workspaceName: string
  updatedAt: string
  columns: Column[]
  tasks: Task[]
  activity: ActivityEvent[]
}

export interface PublicTask {
  task: Task
  board: {
    id: string
    name: string
    description: string
    workspaceName: string
  }
  column: Column
  updatedAt: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface TaskPayload {
  boardId: string
  columnId: string
  title: string
  description: string
  assignee: string
  priority: TaskPriority
}

export interface TaskUpdatePayload {
  id: string
  title?: string
  description?: string
  assignee?: string
  priority?: TaskPriority
  columnId?: string
  order?: number
}

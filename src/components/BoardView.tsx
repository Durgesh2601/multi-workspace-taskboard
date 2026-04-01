import {
  DndContext,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { BoardDetails, PublicBoard, Task, TaskPayload, TaskPriority } from '../types'

type TaskDraft = Omit<TaskPayload, 'boardId'>

interface BoardViewProps {
  board: BoardDetails | PublicBoard
  readOnly?: boolean
  onCreateTask?: (payload: TaskDraft) => Promise<void>
  onUpdateTask?: (
    taskId: string,
    payload: Partial<TaskDraft> & { columnId?: string; order?: number },
  ) => Promise<void>
  onDeleteTask?: (taskId: string) => Promise<void>
}

const defaultDraft: TaskDraft = {
  columnId: '',
  title: '',
  description: '',
  assignee: '',
  priority: 'Medium',
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function useBoardMap(board: BoardDetails | PublicBoard) {
  return useMemo(() => {
    const columns = board.columns.slice().sort((a, b) => a.order - b.order)
    const tasksByColumn = Object.fromEntries(
      columns.map((column) => [
        column.id,
        board.tasks
          .filter((task) => task.columnId === column.id)
          .slice()
          .sort((a, b) => a.order - b.order),
      ]),
    ) as Record<string, Task[]>

    return { columns, tasksByColumn }
  }, [board.columns, board.tasks])
}

function ColumnDropZone({ id, children }: { id: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`task-list ${isOver ? 'over' : ''}`}>
      {children}
    </div>
  )
}

function SortableTaskCard({
  task,
  readOnly,
  onEdit,
  onDelete,
}: {
  task: Task
  readOnly: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="task-card-header">
        <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
        <span className="subtle">{task.assignee}</span>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <div className="task-card-footer">
        <span className="subtle">Updated {formatTime(task.updatedAt)}</span>
        {!readOnly ? (
          <div className="task-actions">
            <button type="button" className="link-button" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="link-button danger" onClick={onDelete}>
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </article>
  )
}

function TaskForm({
  columns,
  draft,
  setDraft,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  columns: BoardDetails['columns'] | PublicBoard['columns']
  draft: TaskDraft
  setDraft: Dispatch<SetStateAction<TaskDraft>>
  onSubmit: () => void
  onCancel: () => void
  submitLabel: string
}) {
  return (
    <div className="task-form">
      <div className="task-form-grid">
        <label>
          Title
          <input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Ship launch notes"
          />
        </label>
        <label>
          Assignee
          <input
            value={draft.assignee}
            onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))}
            placeholder="Mia"
          />
        </label>
        <label>
          Status
          <select
            value={draft.columnId}
            onChange={(event) => setDraft((current) => ({ ...current, columnId: event.target.value }))}
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select
            value={draft.priority}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                priority: event.target.value as TaskPriority,
              }))
            }
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </label>
      </div>
      <label>
        Description
        <textarea
          rows={3}
          value={draft.description}
          onChange={(event) =>
            setDraft((current) => ({ ...current, description: event.target.value }))
          }
          placeholder="Add the context anyone opening this task needs."
        />
      </label>
      <div className="task-form-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="primary-button" onClick={onSubmit}>
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

export function BoardView({
  board,
  readOnly = false,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
}: BoardViewProps) {
  const { columns, tasksByColumn } = useBoardMap(board)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TaskDraft>({
    ...defaultDraft,
    columnId: columns[0]?.id ?? '',
  })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const editingTask = board.tasks.find((task) => task.id === editingTaskId) ?? null

  const handleDragEnd = async (event: DragEndEvent) => {
    if (readOnly || !onUpdateTask) {
      return
    }

    const activeTaskId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId || activeTaskId === overId) {
      return
    }

    const activeTask = board.tasks.find((task) => task.id === activeTaskId)
    if (!activeTask) {
      return
    }

    const overTask = board.tasks.find((task) => task.id === overId)
    const nextColumnId = overTask?.columnId ?? overId
    const nextColumnTasks = tasksByColumn[nextColumnId] ?? []

    if (overTask && overTask.columnId === activeTask.columnId) {
      const oldIndex = nextColumnTasks.findIndex((task) => task.id === activeTask.id)
      const newIndex = nextColumnTasks.findIndex((task) => task.id === overTask.id)
      const reordered = arrayMove(nextColumnTasks, oldIndex, newIndex)
      await Promise.all(
        reordered.map((task, index) =>
          onUpdateTask(task.id, {
            columnId: activeTask.columnId,
            order: index,
          }),
        ),
      )
      return
    }

    if (nextColumnId === activeTask.columnId && !overTask) {
      return
    }

    await onUpdateTask(activeTask.id, {
      columnId: nextColumnId,
      order: nextColumnTasks.length,
    })
  }

  const openCreateForm = () => {
    setDraft({
      ...defaultDraft,
      columnId: columns[0]?.id ?? '',
    })
    setCreateOpen(true)
    setEditingTaskId(null)
  }

  const openEditForm = (task: Task) => {
    setDraft({
      columnId: task.columnId,
      title: task.title,
      description: task.description,
      assignee: task.assignee,
      priority: task.priority,
    })
    setEditingTaskId(task.id)
    setCreateOpen(false)
  }

  const closeForms = () => {
    setCreateOpen(false)
    setEditingTaskId(null)
    setDraft({
      ...defaultDraft,
      columnId: columns[0]?.id ?? '',
    })
  }

  const submitDraft = async () => {
    if (!draft.title.trim()) {
      return
    }

    if (editingTask && onUpdateTask) {
      await onUpdateTask(editingTask.id, draft)
    } else if (onCreateTask) {
      await onCreateTask(draft)
    }

    closeForms()
  }

  return (
    <div className="board-page">
      <section className="board-header panel">
        <div>
          <p className="eyebrow">
            {'workspaceName' in board ? board.workspaceName : 'Private workspace board'}
          </p>
          <h2>{board.name}</h2>
          <p className="muted">{board.description}</p>
        </div>
        <div className="board-header-actions">
          <span className="subtle">Last synced {formatTime(board.updatedAt)}</span>
          {!readOnly ? (
            <button type="button" className="primary-button" onClick={openCreateForm}>
              Create task
            </button>
          ) : null}
        </div>
      </section>

      {createOpen ? (
        <section className="panel">
          <div className="panel-header">
            <h2>New task</h2>
          </div>
          <TaskForm
            columns={columns}
            draft={draft}
            setDraft={setDraft}
            onSubmit={submitDraft}
            onCancel={closeForms}
            submitLabel="Create task"
          />
        </section>
      ) : null}

      {editingTask ? (
        <section className="panel">
          <div className="panel-header">
            <h2>Edit task</h2>
          </div>
          <TaskForm
            columns={columns}
            draft={draft}
            setDraft={setDraft}
            onSubmit={submitDraft}
            onCancel={closeForms}
            submitLabel="Save changes"
          />
        </section>
      ) : null}

      <div className="board-layout">
        <section className="board-surface panel">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="board-columns">
              {columns.map((column) => (
                <div key={column.id} className="column-card">
                  <div className="column-header">
                    <div>
                      <h3>{column.title}</h3>
                      <span className="subtle">{tasksByColumn[column.id]?.length ?? 0} tasks</span>
                    </div>
                  </div>

                  <SortableContext
                    items={(tasksByColumn[column.id] ?? []).map((task) => task.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ColumnDropZone id={column.id}>
                      {(tasksByColumn[column.id] ?? []).map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          readOnly={readOnly}
                          onEdit={() => openEditForm(task)}
                          onDelete={() => void onDeleteTask?.(task.id)}
                        />
                      ))}
                    </ColumnDropZone>
                  </SortableContext>
                </div>
              ))}
            </div>
          </DndContext>
        </section>

        <aside className="activity-panel panel">
          <div className="panel-header">
            <h2>Recent activity</h2>
          </div>
          <div className="activity-list">
            {board.activity.length === 0 ? (
              <p className="muted">No recent activity yet.</p>
            ) : (
              board.activity.map((event) => (
                <article key={event.id} className="activity-item">
                  <p>{event.message}</p>
                  <span className="subtle">{formatTime(event.createdAt)}</span>
                </article>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}

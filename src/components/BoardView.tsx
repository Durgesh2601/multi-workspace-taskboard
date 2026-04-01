import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type DragStartEvent,
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
import { Drawer } from './Drawer'
import { Modal } from './Modal'
import type { BoardDetails, PublicBoard, Task, TaskPayload, TaskPriority } from '../types'

type TaskDraft = Omit<TaskPayload, 'boardId'>

interface BoardViewProps {
  board: BoardDetails | PublicBoard
  readOnly?: boolean
  selectedTaskId?: string | null
  onSelectTask?: (taskId: string | null) => void
  getTaskShareHref?: (task: Task) => string | undefined
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

function TaskCardContent({
  task,
  readOnly,
  onEdit,
  onDelete,
  shareHref,
}: {
  task: Task
  readOnly: boolean
  onEdit: () => void
  onDelete: () => void
  shareHref?: string
}) {
  return (
    <>
      <div className="task-card-header">
        <div className="task-card-meta">
          <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
          <span className="subtle">{task.assignee}</span>
        </div>
        {!readOnly ? <span className="drag-handle">⋮⋮</span> : null}
      </div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <div className="task-card-footer">
        <span className="subtle">Updated {formatTime(task.updatedAt)}</span>
        {!readOnly ? (
          <div className="task-actions">
            {shareHref ? (
              <a
                href={shareHref}
                className="link-button"
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Share
              </a>
            ) : null}
            <button
              type="button"
              className="link-button"
              onClick={(event) => {
                event.stopPropagation()
                onEdit()
              }}
            >
              Edit
            </button>
            <button
              type="button"
              className="link-button danger"
              onClick={(event) => {
                event.stopPropagation()
                onDelete()
              }}
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}

function SortableTaskCard({
  task,
  readOnly,
  onView,
  onEdit,
  onDelete,
  shareHref,
  dragOverlay = false,
}: {
  task: Task
  readOnly: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  shareHref?: string
  dragOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id })

  if (dragOverlay) {
    return (
      <article className="task-card dragging drag-preview">
        <TaskCardContent
          task={task}
          readOnly
          onEdit={() => undefined}
          onDelete={() => undefined}
        />
      </article>
    )
  }

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      onClick={onView}
      {...attributes}
      {...listeners}
    >
      <TaskCardContent
        task={task}
        readOnly={readOnly}
        onEdit={onEdit}
        onDelete={onDelete}
        shareHref={shareHref}
      />
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
  selectedTaskId,
  onSelectTask,
  getTaskShareHref,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
}: BoardViewProps) {
  const { columns, tasksByColumn } = useBoardMap(board)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null)
  const [activityOpen, setActivityOpen] = useState(false)
  const [activeDragTaskId, setActiveDragTaskId] = useState<string | null>(null)
  const [draft, setDraft] = useState<TaskDraft>({
    ...defaultDraft,
    columnId: columns[0]?.id ?? '',
  })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const editingTask = board.tasks.find((task) => task.id === editingTaskId) ?? null
  const deleteTask = board.tasks.find((task) => task.id === deleteTaskId) ?? null
  const activeDragTask = board.tasks.find((task) => task.id === activeDragTaskId) ?? null
  const selectedTask = board.tasks.find((task) => task.id === selectedTaskId) ?? null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragTaskId(String(event.active.id))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragTaskId(null)

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
    setDeleteTaskId(null)
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
          <div className="board-toolbar">
            <button type="button" className="secondary-button" onClick={() => setActivityOpen(true)}>
              Activity
            </button>
            {!readOnly ? (
              <button type="button" className="primary-button" onClick={openCreateForm}>
                Create task
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="board-layout">
        <section className="board-surface panel">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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
                          onView={() => onSelectTask?.(task.id)}
                          shareHref={getTaskShareHref?.(task)}
                          onEdit={() => openEditForm(task)}
                          onDelete={() => setDeleteTaskId(task.id)}
                        />
                      ))}
                    </ColumnDropZone>
                  </SortableContext>
                </div>
              ))}
            </div>
            <DragOverlay>
              {activeDragTask ? (
                <SortableTaskCard
                  task={activeDragTask}
                  readOnly
                  onView={() => undefined}
                  onEdit={() => undefined}
                  onDelete={() => undefined}
                  dragOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </section>
      </div>

      <Modal
        open={createOpen}
        title="Create task"
        onClose={closeForms}
        footer={null}
      >
        <TaskForm
          columns={columns}
          draft={draft}
          setDraft={setDraft}
          onSubmit={() => void submitDraft()}
          onCancel={closeForms}
          submitLabel="Create task"
        />
      </Modal>

      <Modal
        open={Boolean(editingTask)}
        title="Edit task"
        onClose={closeForms}
        footer={null}
      >
        <TaskForm
          columns={columns}
          draft={draft}
          setDraft={setDraft}
          onSubmit={() => void submitDraft()}
          onCancel={closeForms}
          submitLabel="Save changes"
        />
      </Modal>

      <Modal
        open={Boolean(deleteTask)}
        title="Delete task"
        onClose={() => setDeleteTaskId(null)}
        footer={
          <>
            <button type="button" className="secondary-button" onClick={() => setDeleteTaskId(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="primary-button destructive-button"
              onClick={async () => {
                if (deleteTaskId) {
                  await onDeleteTask?.(deleteTaskId)
                }
                setDeleteTaskId(null)
              }}
            >
              Delete task
            </button>
          </>
        }
      >
        <p className="muted modal-copy">
          {deleteTask
            ? `This will permanently remove "${deleteTask.title}" from the board.`
            : 'This task will be permanently removed.'}
        </p>
      </Modal>

      <Drawer open={activityOpen} title="Recent activity" onClose={() => setActivityOpen(false)}>
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
      </Drawer>

      <Modal
        open={Boolean(selectedTask)}
        title={selectedTask?.title ?? 'Task details'}
        onClose={() => onSelectTask?.(null)}
        footer={null}
      >
        {selectedTask ? (
          <div className="task-details">
            <div className="task-details-row">
              <span className={`priority-tag ${selectedTask.priority.toLowerCase()}`}>
                {selectedTask.priority}
              </span>
              <span className="subtle">{selectedTask.assignee}</span>
            </div>
            <p className="task-details-description">{selectedTask.description}</p>
            <div className="public-task-meta">
              <div>
                <span className="subtle">Status</span>
                <strong>
                  {columns.find((column) => column.id === selectedTask.columnId)?.title ?? 'Unknown'}
                </strong>
              </div>
              <div>
                <span className="subtle">Board</span>
                <strong>{board.name}</strong>
              </div>
              <div>
                <span className="subtle">Updated</span>
                <strong>{formatTime(selectedTask.updatedAt)}</strong>
              </div>
              <div>
                <span className="subtle">Created</span>
                <strong>{formatTime(selectedTask.createdAt)}</strong>
              </div>
            </div>
            {getTaskShareHref?.(selectedTask) ? (
              <div className="task-details-actions">
                <a
                  href={getTaskShareHref(selectedTask)}
                  className="secondary-button public-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open shareable link
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}

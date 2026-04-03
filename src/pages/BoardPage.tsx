import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createTask, deleteTask, getBoard, getBoards, updateTask } from '../api/mockApi'
import { BoardView } from '../components/BoardView'
import type { BoardDetails } from '../types'

function reorderTasks(current: BoardDetails, payload: {
  id: string
  title?: string
  description?: string
  assignee?: string
  priority?: 'Low' | 'Medium' | 'High'
  columnId?: string
  order?: number
}) {
  const existingTask = current.tasks.find((task) => task.id === payload.id)
  if (!existingTask) {
    return current
  }

  const now = new Date().toISOString()
  const nextTask = {
    ...existingTask,
    ...payload,
    columnId: payload.columnId ?? existingTask.columnId,
    updatedAt: now,
  }

  const remainingTasks = current.tasks.filter((task) => task.id !== payload.id)
  const targetColumnId = nextTask.columnId
  const groupedTasks = Object.fromEntries(
    current.columns.map((column) => [column.id, [] as BoardDetails['tasks']]),
  ) as Record<string, BoardDetails['tasks']>

  remainingTasks.forEach((task) => {
    groupedTasks[task.columnId].push(task)
  })

  Object.values(groupedTasks).forEach((tasks) => tasks.sort((a, b) => a.order - b.order))

  const targetTasks = groupedTasks[targetColumnId] ?? []
  const insertAt = Math.max(0, Math.min(payload.order ?? targetTasks.length, targetTasks.length))
  targetTasks.splice(insertAt, 0, nextTask)

  const nextTasks = current.columns.flatMap((column) =>
    (groupedTasks[column.id] ?? []).map((task, index) => ({
      ...task,
      order: index,
      updatedAt: task.id === nextTask.id ? now : task.updatedAt,
    })),
  )

  return {
    ...current,
    tasks: nextTasks,
    updatedAt: now,
  }
}

export function BoardPage() {
  const { boardId = '', workspaceId = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoard(boardId),
    refetchInterval: 5000,
  })

  const boardSummaryQuery = useQuery({
    queryKey: ['boards', workspaceId],
    queryFn: () => getBoards(workspaceId),
    enabled: Boolean(workspaceId),
  })

  const updateBoardCache = (updater: (current: BoardDetails) => BoardDetails) => {
    queryClient.setQueryData<BoardDetails>(['board', boardId], (current) =>
      current ? updater(current) : current,
    )
  }

  const createTaskMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] })
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: updateTask,
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['board', boardId] })
      const previous = queryClient.getQueryData<BoardDetails>(['board', boardId])

      updateBoardCache((current) => {
        return reorderTasks(current, payload)
      })

      return { previous }
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['board', boardId], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] })
    },
  })

  const activeBoardName = useMemo(
    () => boardSummaryQuery.data?.find((board) => board.id === boardId)?.name,
    [boardId, boardSummaryQuery.data],
  )

  useEffect(() => {
    if (boardQuery.data && boardQuery.data.workspaceId !== workspaceId) {
      navigate(`/app/workspace/${boardQuery.data.workspaceId}/board/${boardQuery.data.id}`, {
        replace: true,
      })
    }
  }, [boardQuery.data, navigate, workspaceId])

  useEffect(() => {
    if (boardQuery.data) {
      document.title = `${boardQuery.data.name} — Taskboard`
    }
    return () => { document.title = 'Multi-Workspace Taskboard' }
  }, [boardQuery.data])

  if (boardQuery.isLoading) {
    return <div className="state-panel">Loading board...</div>
  }

  if (boardQuery.isError || !boardQuery.data) {
    return (
      <div className="state-panel">
        <h2>We could not load this board.</h2>
        <p className="muted">Try refreshing, or switch to another workspace board.</p>
      </div>
    )
  }

  const board = boardQuery.data
  const selectedTaskId = searchParams.get('taskId')

  return (
    <>
      {boardQuery.isFetching ? (
        <div className="sync-toast">Syncing {activeBoardName ?? board.name}...</div>
      ) : null}
      <BoardView
        board={board}
        selectedTaskId={selectedTaskId}
        onSelectTask={(taskId) => {
          const nextParams = new URLSearchParams(searchParams)
          if (taskId) {
            nextParams.set('taskId', taskId)
          } else {
            nextParams.delete('taskId')
          }
          setSearchParams(nextParams, { replace: true })
        }}
        getTaskShareHref={(task) =>
          board.isPublic ? `/public/board/${board.id}?taskId=${task.id}` : undefined
        }
        onCreateTask={async (payload) => {
          await createTaskMutation.mutateAsync({
            ...payload,
            boardId,
          })
        }}
        onUpdateTask={async (taskId, payload) => {
          await updateTaskMutation.mutateAsync({
            id: taskId,
            ...payload,
          })
        }}
        onDeleteTask={async (taskId) => {
          await deleteTaskMutation.mutateAsync(taskId)
        }}
      />
    </>
  )
}

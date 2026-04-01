import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { createTask, deleteTask, getBoard, getBoards, updateTask } from '../api/mockApi'
import { BoardView } from '../components/BoardView'
import type { BoardDetails } from '../types'

export function BoardPage() {
  const { boardId = '', workspaceId = '' } = useParams()
  const navigate = useNavigate()
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
        const tasks = current.tasks.map((task) =>
          task.id === payload.id
            ? {
                ...task,
                ...payload,
                updatedAt: new Date().toISOString(),
              }
            : task,
        )

        return { ...current, tasks, updatedAt: new Date().toISOString() }
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

  return (
    <>
      {boardQuery.isFetching ? (
        <div className="sync-banner">Syncing {activeBoardName ?? board.name}...</div>
      ) : null}
      <BoardView
        board={board}
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

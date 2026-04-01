import { Navigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicTask } from '../api/mockApi'

export function PublicTaskPage() {
  const { taskId = '' } = useParams()
  const taskQuery = useQuery({
    queryKey: ['public-task', taskId],
    queryFn: () => getPublicTask(taskId),
    refetchInterval: 7000,
  })

  if (taskQuery.isLoading) {
    return <div className="state-panel">Loading shared task...</div>
  }

  if (taskQuery.isError || !taskQuery.data) {
    return (
      <div className="state-panel">
        <h1>Public task unavailable</h1>
        <p className="muted">This task may be private, removed, or the link may be invalid.</p>
      </div>
    )
  }

  return <Navigate to={`/public/board/${taskQuery.data.board.id}?taskId=${taskQuery.data.task.id}`} replace />
}

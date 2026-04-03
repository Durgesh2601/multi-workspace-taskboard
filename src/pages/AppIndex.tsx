import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBoards, getWorkspaces } from '../api/mockApi'

export function AppIndex() {
  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
  })

  const firstWsId = workspacesQuery.data?.[0]?.id ?? ''

  const boardsQuery = useQuery({
    queryKey: ['boards', firstWsId],
    queryFn: () => getBoards(firstWsId),
    enabled: Boolean(firstWsId),
  })

  if (workspacesQuery.isLoading || boardsQuery.isLoading) {
    return <div className="state-panel">Loading workspace...</div>
  }

  const boardId = boardsQuery.data?.[0]?.id
  if (firstWsId && boardId) {
    return <Navigate to={`workspace/${firstWsId}/board/${boardId}`} replace />
  }

  return (
    <div className="state-panel">
      <h2>No workspaces found</h2>
      <p className="muted">There are no boards to display yet.</p>
    </div>
  )
}

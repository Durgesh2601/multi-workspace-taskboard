import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BoardView } from '../components/BoardView'
import { getPublicBoard } from '../api/mockApi'

export function PublicBoardPage() {
  const { boardId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const boardQuery = useQuery({
    queryKey: ['public-board', boardId],
    queryFn: () => getPublicBoard(boardId),
    refetchInterval: 7000,
  })

  useEffect(() => {
    if (boardQuery.data) {
      document.title = `${boardQuery.data.name} — ${boardQuery.data.workspaceName}`
    }
    return () => { document.title = 'Multi-Workspace Taskboard' }
  }, [boardQuery.data])

  if (boardQuery.isLoading) {
    return <div className="state-panel">Loading shared board...</div>
  }

  if (boardQuery.isError || !boardQuery.data) {
    return (
      <div className="state-panel">
        <h1>Public board unavailable</h1>
        <p className="muted">
          This board may be private, removed, or the share link may be incorrect.
        </p>
      </div>
    )
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <div>
          <p className="eyebrow">Public board view</p>
          <h1>{boardQuery.data.name}</h1>
        </div>
        <Link to="/login" className="secondary-button public-link">
          Open app
        </Link>
      </header>
      <BoardView
        board={boardQuery.data}
        readOnly
        selectedTaskId={searchParams.get('taskId')}
        onSelectTask={(taskId) => {
          const nextParams = new URLSearchParams(searchParams)
          if (taskId) {
            nextParams.set('taskId', taskId)
          } else {
            nextParams.delete('taskId')
          }
          setSearchParams(nextParams, { replace: true })
        }}
        getTaskShareHref={(task) => `/public/board/${boardQuery.data.id}?taskId=${task.id}`}
      />
    </div>
  )
}

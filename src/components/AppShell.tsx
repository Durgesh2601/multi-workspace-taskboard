import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBoards, getWorkspaces } from '../api/mockApi'
import { useAuth } from '../context/AuthContext'
import { useWorkspaceContext } from '../context/WorkspaceContext'

export function AppShell() {
  const { logout, session } = useAuth()
  const { workspaceId, setWorkspaceId } = useWorkspaceContext()
  const params = useParams()
  const navigate = useNavigate()
  const activeWorkspaceId = params.workspaceId ?? workspaceId

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: getWorkspaces,
  })

  const boardsQuery = useQuery({
    queryKey: ['boards', activeWorkspaceId],
    queryFn: () => getBoards(activeWorkspaceId ?? ''),
    enabled: Boolean(activeWorkspaceId),
  })

  useEffect(() => {
    if (!activeWorkspaceId && workspacesQuery.data?.[0]) {
      setWorkspaceId(workspacesQuery.data[0].id)
      navigate('/app/workspace/ws-design/board/board-q2', { replace: true })
      return
    }

    if (params.workspaceId && params.workspaceId !== workspaceId) {
      setWorkspaceId(params.workspaceId)
    }
  }, [activeWorkspaceId, navigate, params.workspaceId, setWorkspaceId, workspaceId, workspacesQuery.data])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-panel">
          <p className="eyebrow">Multi-workspace taskboard</p>
          <h1>Team delivery, without overengineering.</h1>
          <p className="muted">
            Workspace-aware boards, simple auth, public sharing, and simulated live updates.
          </p>
        </div>

        <section className="panel">
          <div className="panel-header">
            <h2>Workspaces</h2>
            <span className="subtle">{workspacesQuery.data?.length ?? 0}</span>
          </div>

          <div className="workspace-list">
            {workspacesQuery.data?.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`workspace-item ${workspace.id === activeWorkspaceId ? 'active' : ''}`}
                onClick={() => {
                  setWorkspaceId(workspace.id)
                  const firstBoardId =
                    workspace.id === 'ws-design' ? 'board-q2' : 'board-growth'
                  navigate(`/app/workspace/${workspace.id}/board/${firstBoardId}`)
                }}
              >
                <span>
                  <strong>{workspace.name}</strong>
                  <small>
                    {workspace.memberCount} members · {workspace.theme}
                  </small>
                </span>
                <span className="workspace-pill">{workspace.slug}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Boards</h2>
            <span className="subtle">{boardsQuery.data?.length ?? 0}</span>
          </div>

          <nav className="board-nav">
            {boardsQuery.data?.map((board) => (
              <div key={board.id} className="board-row">
                <NavLink
                  to={`/app/workspace/${board.workspaceId}/board/${board.id}`}
                  className={({ isActive }) => `board-link ${isActive ? 'active' : ''}`}
                >
                  <span>{board.name}</span>
                </NavLink>
                {board.isPublic ? (
                  <Link
                    to={`/public/board/${board.id}`}
                    className="share-link"
                  >
                    Public view
                  </Link>
                ) : null}
              </div>
            ))}
          </nav>
        </section>

        <section className="panel compact">
          <p className="muted">
            Signed in as <strong>{session?.user.email}</strong>
          </p>
          <button type="button" className="secondary-button" onClick={logout}>
            Log out
          </button>
        </section>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

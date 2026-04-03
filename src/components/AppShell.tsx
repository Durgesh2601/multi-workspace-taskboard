import { useEffect } from 'react'
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getBoards, getWorkspaces } from '../api/mockApi'
import { useAuth } from '../context/AuthContext'
import { useWorkspaceContext } from '../context/WorkspaceContext'
import type { BoardSummary } from '../types'

export function AppShell() {
  const { logout, session } = useAuth()
  const { workspaceId, setWorkspaceId } = useWorkspaceContext()
  const params = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
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
    if (params.workspaceId && params.workspaceId !== workspaceId) {
      setWorkspaceId(params.workspaceId)
    }
  }, [params.workspaceId, setWorkspaceId, workspaceId])

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-sticky">
          <div className="brand-panel">
            <p className="eyebrow">Multi-workspace taskboard</p>
            <h1>Team delivery, without overengineering.</h1>
            <p className="muted">
              Workspace-aware boards, simple auth, public sharing, and simulated live updates.
            </p>
          </div>

          <section className="panel workspace-panel">
            <div className="panel-header">
              <h2>Workspaces</h2>
              <span className="subtle">{workspacesQuery.data?.length ?? 0}</span>
            </div>

            {workspacesQuery.isLoading ? (
              <p className="muted">Loading workspaces...</p>
            ) : workspacesQuery.isError ? (
              <p className="muted">Failed to load workspaces.</p>
            ) : (
              <div className="workspace-list">
                {workspacesQuery.data?.map((workspace) => (
                  <button
                    key={workspace.id}
                    type="button"
                    className={`workspace-item ${workspace.id === activeWorkspaceId ? 'active' : ''}`}
                    onClick={async () => {
                      setWorkspaceId(workspace.id)
                      let boards = queryClient.getQueryData<BoardSummary[]>(['boards', workspace.id])
                      if (!boards) {
                        boards = await queryClient.fetchQuery({
                          queryKey: ['boards', workspace.id],
                          queryFn: () => getBoards(workspace.id),
                        })
                      }
                      const firstBoard = boards?.[0]
                      if (firstBoard) {
                        navigate(`/app/workspace/${workspace.id}/board/${firstBoard.id}`)
                      }
                    }}
                  >
                    <span className="workspace-copy">
                      <strong>{workspace.name}</strong>
                      <small>
                        {workspace.memberCount} members · {workspace.theme}
                      </small>
                    </span>
                    <span className="workspace-pill">{workspace.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Boards</h2>
              <span className="subtle">{boardsQuery.data?.length ?? 0}</span>
            </div>

            {boardsQuery.isLoading ? (
              <p className="muted">Loading boards...</p>
            ) : boardsQuery.isError ? (
              <p className="muted">Failed to load boards.</p>
            ) : (
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
                      <Link to={`/public/board/${board.id}`} className="share-link">
                        Public view
                      </Link>
                    ) : null}
                  </div>
                ))}
              </nav>
            )}
          </section>

          <section className="panel compact">
            <p className="muted">
              Signed in as <strong>{session?.user.email}</strong>
            </p>
            <button type="button" className="secondary-button" onClick={logout}>
              Log out
            </button>
          </section>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}

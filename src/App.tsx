import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { LoginPage } from './pages/LoginPage'
import { BoardPage } from './pages/BoardPage'
import { PublicBoardPage } from './pages/PublicBoardPage'
import { PublicTaskPage } from './pages/PublicTaskPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/public/board/:boardId" element={<PublicBoardPage />} />
      <Route path="/public/task/:taskId" element={<PublicTaskPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="workspace/ws-design/board/board-q2" replace />} />
        <Route
          path="workspace/:workspaceId/board/:boardId"
          element={<BoardPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

# Multi-Workspace Task Board

A React + TypeScript frontend for a SaaS-style multi-workspace task management platform.

## Setup instructions

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

**Demo credentials** — any valid-looking email and password works (pre-filled on the login page).

## What is implemented

### Core requirements

- **Authentication & session handling** — mock login flow with `localStorage` session persistence, automatic expiry polling (20 min), expired-session banner on re-visit, and `ProtectedRoute` gating.
- **Multi-workspace support** — sidebar lists all workspaces, switching dynamically fetches that workspace's boards and navigates to the first board.
- **Task board** — columns and tasks displayed in a Kanban grid. Drag-and-drop (via `@dnd-kit`) for reordering within a column and moving across columns. Create, edit, and delete tasks through modal forms with inline validation (title and assignee required).
- **Simulated real-time** — a background loop mutates stored tasks every ~18s. Board queries poll every 5s with a sync toast. The activity drawer shows recent events.
- **Data fetching & synchronization** — `TanStack Query` manages all async state. `updateTask` uses optimistic cache updates with rollback on error. Create and delete invalidate caches on success.
- **Publicly shareable views** — `/public/board/:boardId` renders a read-only board without auth. `/public/task/:taskId` redirects to the board with the task detail open. Document titles are set dynamically so browser tabs and link previews show meaningful content.
- **Responsive layout** — two-column grid on desktop with a sticky sidebar, single-column reflow on smaller screens. Board columns scroll horizontally when narrow.

### Quality & resilience

- **Error boundary** — wraps the app tree; catches render errors with a recovery UI instead of a white screen.
- **Safe `localStorage`** — `try/catch` around all `JSON.parse` calls in auth and mock API; corrupt data resets gracefully.
- **Loading and error states** — workspace list, board list, board detail, and public pages all handle loading, error, and empty cases.
- **Form validation** — title and assignee are required; inline field-level error messages on submit.
- **Drawer scroll lock** — both Modal and Drawer lock body scroll when open.
- **QueryClient defaults** — `staleTime: 2000` prevents flash refetches; `retry: 1` limits retries.

## Engineering notes

### Architecture

- **React Router v6** handles private (`/app/...`) and public (`/public/...`) routes. The app shell renders once as a layout route with an `Outlet` for page content.
- **TanStack Query** owns all server-style async state: workspace lists, board summaries, board details, and public data. Mutations handle create/update/delete with cache invalidation.
- **React Context** is used only for lightweight cross-cutting state:
  - `AuthContext` — session, login/logout, expiry check.
  - `WorkspaceContext` — currently selected workspace ID (synced from URL params).
- **Mock API** (`src/api/mockApi.ts`) is a self-contained async module backed by `localStorage`. It mirrors real endpoint shapes (`getBoards`, `createTask`, `updateTask`, etc.) with artificial latency, so the UI code reads like a real backend integration.

### State management approach

| State type          | Tool                           | Rationale                                                                               |
| ------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| Server/async data   | TanStack Query                 | Cache, invalidation, refetch intervals, optimistic updates — all handled declaratively. |
| Auth session        | React Context + `localStorage` | Lightweight; no need for a state library for a single boolean-ish value.                |
| Workspace selection | React Context + URL params     | Derived from the route; context keeps sidebar in sync.                                  |
| UI-local state      | `useState`                     | Form drafts, modal open/close, drag state — all component-scoped.                       |

No Redux, Zustand, or similar. The app's state is naturally either server-owned (queries) or component-local (UI), so a global store would be over-engineering.

### Data fetching strategy

- Queries: `getWorkspaces`, `getBoards(wsId)`, `getBoard(id)`, `getPublicBoard(id)`, `getPublicTask(id)`.
- Mutations: `createTask`, `updateTask` (optimistic), `deleteTask`.
- Polling: board queries refetch every 5–7s to simulate collaborative updates. A background `setInterval` mutates the mock DB to create the illusion of other users.
- Optimistic updates: `updateTask` immediately applies the change to the query cache via `onMutate`, stores the previous snapshot, and rolls back on error via `onError`.

### Component organization

```
src/
├── api/mockApi.ts         # Mock backend — all async functions
├── mock/data.ts           # Seed data (workspaces, boards, tasks)
├── types.ts               # Shared domain types
├── context/               # Auth + Workspace providers
├── components/
│   ├── AppShell.tsx        # Authenticated layout (sidebar + outlet)
│   ├── BoardView.tsx       # Kanban board surface (shared by private & public)
│   ├── ErrorBoundary.tsx   # Top-level error catch
│   ├── Modal.tsx           # Portal-based modal
│   ├── Drawer.tsx          # Portal-based side drawer
│   └── ProtectedRoute.tsx  # Auth gate
└── pages/
    ├── AppIndex.tsx        # Dynamic redirect to first workspace board
    ├── BoardPage.tsx       # Authenticated board (queries + mutations)
    ├── LoginPage.tsx       # Demo login form
    ├── PublicBoardPage.tsx  # Read-only public board
    └── PublicTaskPage.tsx   # Public task → redirects to board with detail open
```

Pages stay thin — they wire route params to queries/mutations and delegate rendering to `BoardView`. `BoardView` is the heaviest component but is intentionally self-contained: it owns the Kanban grid, drag-and-drop, task CRUD modals, activity drawer, and task detail modal. Extracting these into separate files is a natural next step if the component grows further.

### Publicly shareable views

- Public routes (`/public/board/:id`, `/public/task/:id`) are outside the auth gate and require no login.
- `document.title` is set dynamically on public pages so browser tabs and link previews show the board/task name.
- In a production setting, if rich link previews (Open Graph tags) or search indexing were needed, these pages would move to an SSR framework (Next.js, Remix) so meta tags render server-side. For this project, the SPA approach is sufficient.

### Trade-offs and assumptions

- **Mock API over MSW/json-server** — keeps the project zero-config and self-contained. The async function signatures mirror real API calls, so swapping to a real backend would only touch the `api/` layer.
- **Client-side session expiry** — acceptable because auth is mocked. A real integration would validate tokens server-side.
- **Single CSS file** — chosen for speed and simplicity. CSS modules or a utility framework (Tailwind) would be the next step at scale.
- **No test files** — given the 1–2 day scope, I prioritized feature completeness and code quality over test coverage. If time permitted, I would add integration tests for the drag-and-drop flow and form validation using Vitest + Testing Library.
- **Drag-and-drop limited to tasks** — column reordering was not required by the spec.

## Tech stack

| Library        | Version | Purpose                |
| -------------- | ------- | ---------------------- |
| React          | 19      | UI framework           |
| TypeScript     | 5.9     | Type safety            |
| Vite           | 5       | Dev server and bundler |
| React Router   | 6       | Client-side routing    |
| TanStack Query | 5       | Async state management |
| @dnd-kit       | 6/10    | Drag-and-drop          |

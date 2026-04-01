# Multi-Workspace Task Board

A React + TypeScript + Vite implementation of the frontend assignment.

## Run locally

```bash
npm install
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## What is implemented

- Mock login flow with session persistence and expiry handling
- Private app area with workspace switching
- Workspace-aware board routing
- Columns and tasks with drag-and-drop movement
- Create, edit, and delete task flows
- Simulated real-time updates with polling
- Public read-only board page at `/public/board/:boardId`
- Responsive layout for desktop and smaller screens

## Engineering notes

### Architecture

- `React Router` handles private app routes and public shareable routes.
- `TanStack Query` owns server-style async state: workspaces, boards, board details, and public board data.
- `Context` is used only for lightweight app state:
  - auth session
  - selected workspace
- The mock API is isolated in `src/api/mockApi.ts` and persists data to `localStorage`, which keeps the UI code close to how a real backend integration would look.

### State management approach

- Server state and cache invalidation live in TanStack Query.
- Local component state handles task form drafts and temporary UI states.
- Auth state is intentionally simple because this assignment only needs a basic gated experience.

### Data fetching and synchronization

- Queries fetch workspaces, board lists, board details, and public board details.
- Mutations are used for create, update, and delete task actions.
- Board updates poll every few seconds to simulate another user making changes.
- A small mock realtime loop updates tasks in the stored dataset to make the activity feed and task board feel live.

### Component organization

- `AppShell` owns the authenticated layout and workspace navigation.
- `BoardView` is the main reusable board surface and is shared by private and public board pages.
- Pages stay thin and mostly coordinate route params, queries, and mutations.

### Trade-offs and assumptions

- I used a local mock API instead of MSW or a separate json-server to keep the project compact.
- Session expiry is time-based and handled client-side because backend auth is mocked.
- Public sharing is implemented as an unauthenticated route in the SPA. In production, if rich link previews or SEO became important, I would likely move public pages to an SSR-capable setup.
- Drag-and-drop is limited to tasks, since column reordering was not required.

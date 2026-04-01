import type { BoardDetails, Workspace } from '../types'

const now = new Date()

function minutesAgo(minutes: number) {
  return new Date(now.getTime() - minutes * 60 * 1000).toISOString()
}

export const seedWorkspaces: Workspace[] = [
  {
    id: 'ws-design',
    name: 'Northstar Design',
    slug: 'northstar-design',
    memberCount: 12,
    theme: 'Sunrise',
  },
  {
    id: 'ws-growth',
    name: 'Growth Labs',
    slug: 'growth-labs',
    memberCount: 8,
    theme: 'Forest',
  },
]

export const seedBoards: BoardDetails[] = [
  {
    id: 'board-q2',
    workspaceId: 'ws-design',
    name: 'Q2 Launch Board',
    description: 'Tracks the work required to ship the spring product refresh.',
    isPublic: true,
    updatedAt: minutesAgo(3),
    columns: [
      { id: 'col-backlog', boardId: 'board-q2', title: 'Backlog', order: 0 },
      { id: 'col-progress', boardId: 'board-q2', title: 'In Progress', order: 1 },
      { id: 'col-review', boardId: 'board-q2', title: 'Review', order: 2 },
      { id: 'col-done', boardId: 'board-q2', title: 'Done', order: 3 },
    ],
    tasks: [
      {
        id: 'task-brief',
        boardId: 'board-q2',
        columnId: 'col-backlog',
        title: 'Refresh launch brief',
        description: 'Rewrite the launch narrative for partner and customer audiences.',
        assignee: 'Mia',
        priority: 'High',
        createdAt: minutesAgo(240),
        updatedAt: minutesAgo(35),
        order: 0,
      },
      {
        id: 'task-banner',
        boardId: 'board-q2',
        columnId: 'col-progress',
        title: 'Homepage banner concepts',
        description: 'Prepare 3 visual directions and align on copy treatment.',
        assignee: 'Noah',
        priority: 'Medium',
        createdAt: minutesAgo(180),
        updatedAt: minutesAgo(12),
        order: 0,
      },
      {
        id: 'task-email',
        boardId: 'board-q2',
        columnId: 'col-review',
        title: 'Lifecycle email draft',
        description: 'Review copy and final CTA hierarchy for launch week.',
        assignee: 'Ira',
        priority: 'Medium',
        createdAt: minutesAgo(150),
        updatedAt: minutesAgo(28),
        order: 0,
      },
      {
        id: 'task-cms',
        boardId: 'board-q2',
        columnId: 'col-done',
        title: 'CMS content model cleanup',
        description: 'Remove deprecated promo blocks before publish freeze.',
        assignee: 'Kai',
        priority: 'Low',
        createdAt: minutesAgo(320),
        updatedAt: minutesAgo(65),
        order: 0,
      },
    ],
    activity: [
      {
        id: 'act-1',
        boardId: 'board-q2',
        type: 'updated',
        message: 'Noah updated Homepage banner concepts',
        createdAt: minutesAgo(12),
      },
      {
        id: 'act-2',
        boardId: 'board-q2',
        type: 'moved',
        message: 'Lifecycle email draft moved to Review',
        createdAt: minutesAgo(28),
      },
    ],
  },
  {
    id: 'board-growth',
    workspaceId: 'ws-growth',
    name: 'Experiment Pipeline',
    description: 'Weekly funnel experiments and conversion work.',
    isPublic: false,
    updatedAt: minutesAgo(18),
    columns: [
      { id: 'col-ideas', boardId: 'board-growth', title: 'Ideas', order: 0 },
      { id: 'col-ready', boardId: 'board-growth', title: 'Ready', order: 1 },
      { id: 'col-live', boardId: 'board-growth', title: 'Live', order: 2 },
      { id: 'col-archive', boardId: 'board-growth', title: 'Archive', order: 3 },
    ],
    tasks: [
      {
        id: 'task-pricing',
        boardId: 'board-growth',
        columnId: 'col-ready',
        title: 'Pricing page social proof test',
        description: 'Validate trust section placement above the fold.',
        assignee: 'Jules',
        priority: 'High',
        createdAt: minutesAgo(400),
        updatedAt: minutesAgo(18),
        order: 0,
      },
      {
        id: 'task-onboarding',
        boardId: 'board-growth',
        columnId: 'col-live',
        title: 'Onboarding CTA experiment',
        description: 'Compare guided checklist entry points for new trial users.',
        assignee: 'Zara',
        priority: 'Medium',
        createdAt: minutesAgo(260),
        updatedAt: minutesAgo(45),
        order: 0,
      },
    ],
    activity: [
      {
        id: 'act-3',
        boardId: 'board-growth',
        type: 'created',
        message: 'Pricing page social proof test was added',
        createdAt: minutesAgo(18),
      },
    ],
  },
]

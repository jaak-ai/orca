export type VoloPriority = 'low' | 'medium' | 'high' | 'critical'

export type VoloColumnType = 'not_started' | 'in_progress' | 'done' | string

export type VoloViewer = {
  id: string
  displayName: string
  email: string | null
  avatarUrl?: string
}

export type VoloConnectionStatus = {
  connected: boolean
  viewer: VoloViewer | null
  apiUrl?: string | null
  webUrl?: string | null
  credentialError?: string
  hasSavedLocalCredentials?: boolean
}

export type VoloConnectArgs = {
  apiUrl?: string
  apiToken: string
  webUrl?: string
}

export type VoloConnectResult = { ok: true; viewer: VoloViewer } | { ok: false; error: string }

export type VoloGoogleLoginResult =
  | { ok: true; viewer: VoloViewer; apiToken: string; apiUrl: string }
  | { ok: false; error: string }

export type VoloMutationResult = { ok: true } | { ok: false; error: string }

export type VoloCreateTaskResult =
  | { ok: true; id: string; taskCode: string; url: string }
  | { ok: false; error: string }

export type VoloColumn = {
  id: string
  name: string
  order: number
  color?: string
  type: VoloColumnType
}

export type VoloBoard = {
  id: string
  name: string
  prefix: string
  description?: string
  icon?: string
  columns: VoloColumn[]
}

export type VoloMember = {
  id: string
  userId: string
  name: string
  email?: string | null
  avatarUrl?: string
}

export type VoloTask = {
  id: string
  taskCode: string
  title: string
  description?: string
  url: string
  boardId: string
  boardName?: string
  boardPrefix?: string
  columnId: string
  columnName?: string
  columnType?: VoloColumnType
  columnColor?: string
  priority: VoloPriority
  assigneeId?: string | null
  assigneeName?: string | null
  inKanban: boolean
  dueDate?: string | null
  order: number
  updatedAt: string
  createdAt: string
}

export type VoloTaskFilter = 'assigned' | 'all' | 'done'

export type VoloCreateTaskArgs = {
  boardId: string
  title: string
  columnId: string
  description?: string
  priority?: VoloPriority
  assigneeId?: string | null
}

export type VoloTaskUpdate = {
  title?: string
  description?: string
  priority?: VoloPriority
  assigneeId?: string | null
}

export type VoloBoardViewPreferences = {
  /** Board the Tasks page opens on. Null until the user picks one. */
  selectedBoardId: string | null
  /** Visible column ids per board. A board absent from the map shows every column. */
  visibleColumnIdsByBoard: Record<string, string[]>
}

export const DEFAULT_VOLO_BOARD_VIEW: VoloBoardViewPreferences = {
  selectedBoardId: null,
  visibleColumnIdsByBoard: {}
}

/** Trust boundary for persisted JSON: tolerates missing/garbage input without throwing.
 *  An empty array for a board is a legitimate "no columns visible" state. */
export function normalizeVoloBoardView(value: unknown): VoloBoardViewPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { selectedBoardId: null, visibleColumnIdsByBoard: {} }
  }
  const record = value as Record<string, unknown>
  const selectedBoardId = typeof record.selectedBoardId === 'string' ? record.selectedBoardId : null
  const visibleColumnIdsByBoard: Record<string, string[]> = {}
  const rawMap = record.visibleColumnIdsByBoard
  if (typeof rawMap === 'object' && rawMap !== null && !Array.isArray(rawMap)) {
    for (const [boardId, columnIds] of Object.entries(rawMap)) {
      // Why: hand-edited JSON can carry a __proto__ key; assigning it would pollute the prototype.
      if (boardId === '__proto__' || !Array.isArray(columnIds)) {
        continue
      }
      visibleColumnIdsByBoard[boardId] = columnIds.filter(
        (id): id is string => typeof id === 'string'
      )
    }
  }
  return { selectedBoardId, visibleColumnIdsByBoard }
}

/** A board with no stored entry shows every column. */
export function isVoloColumnVisible(
  view: VoloBoardViewPreferences,
  boardId: string,
  columnId: string
): boolean {
  // Why: plain-object map; a hasOwn guard keeps inherited keys (e.g. 'constructor') from reading as entries.
  if (!Object.hasOwn(view.visibleColumnIdsByBoard, boardId)) {
    return true
  }
  return view.visibleColumnIdsByBoard[boardId].includes(columnId)
}

export const VOLO_PRIORITIES: readonly VoloPriority[] = ['low', 'medium', 'high', 'critical']

export function isVoloPriority(value: unknown): value is VoloPriority {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'critical'
}

export function isVoloTaskFilter(value: unknown): value is VoloTaskFilter {
  return value === 'assigned' || value === 'all' || value === 'done'
}

import { normalizeStoredTaskSourceContext } from './task-source-context'
import {
  DEFAULT_VOLO_WORK_QUEUE,
  emptyVoloWorkQueue,
  VOLO_WORK_QUEUE_DESCRIPTION_MAX,
  VOLO_WORK_QUEUE_MAX_ITEMS,
  type VoloWorkQueue,
  type VoloWorkQueueItem,
  type VoloWorkQueueItemStatus,
  type VoloWorkQueueState
} from './volo-work-queue'

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function normalizeItemStatus(value: unknown): VoloWorkQueueItemStatus {
  if (value === 'running' || value === 'done' || value === 'failed' || value === 'queued') {
    return value
  }
  return 'queued'
}

function normalizeQueueItem(value: unknown): VoloWorkQueueItem | null {
  if (!value || typeof value !== 'object') {
    return null
  }
  const input = value as Record<string, unknown>
  const id = asNonEmptyString(input.id)
  const taskId = asNonEmptyString(input.taskId)
  const taskCode = asNonEmptyString(input.taskCode)
  const title = asNonEmptyString(input.title)
  const url = asNonEmptyString(input.url)
  const enqueuedAt = asFiniteNumber(input.enqueuedAt)
  if (!id || !taskId || !taskCode || !title || !url || enqueuedAt === null) {
    return null
  }
  const description = asNonEmptyString(input.description)
  return {
    id,
    taskId,
    taskCode,
    title,
    url,
    ...(description ? { description: description.slice(0, VOLO_WORK_QUEUE_DESCRIPTION_MAX) } : {}),
    boardName: asNonEmptyString(input.boardName) ?? undefined,
    parallel: input.parallel === true,
    status: normalizeItemStatus(input.status),
    worktreeId: asNonEmptyString(input.worktreeId) ?? undefined,
    targetWorktreeId: asNonEmptyString(input.targetWorktreeId) ?? undefined,
    enqueuedAt,
    startedAt: asFiniteNumber(input.startedAt) ?? undefined,
    finishedAt: asFiniteNumber(input.finishedAt) ?? undefined,
    error: asNonEmptyString(input.error) ?? undefined
  }
}

function normalizeQueue(repoId: string, value: unknown): VoloWorkQueue {
  const empty = emptyVoloWorkQueue(repoId)
  if (!value || typeof value !== 'object') {
    return empty
  }
  const input = value as Record<string, unknown>
  const items = Array.isArray(input.items)
    ? input.items
        .map(normalizeQueueItem)
        .filter((item): item is VoloWorkQueueItem => item !== null)
        .slice(0, VOLO_WORK_QUEUE_MAX_ITEMS)
    : []
  return {
    repoId,
    dispatching: input.dispatching === true,
    pmEnabled: input.pmEnabled === true,
    pmWorktreeId: asNonEmptyString(input.pmWorktreeId) ?? undefined,
    sourceContext: normalizeStoredTaskSourceContext(input.sourceContext),
    items
  }
}

export function normalizeVoloWorkQueue(value: unknown): VoloWorkQueueState {
  if (!value || typeof value !== 'object') {
    return DEFAULT_VOLO_WORK_QUEUE
  }
  const input = value as Record<string, unknown>
  const raw = input.queuesByRepoId
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_VOLO_WORK_QUEUE
  }
  const queuesByRepoId: Record<string, VoloWorkQueue> = {}
  for (const [repoId, queue] of Object.entries(raw as Record<string, unknown>)) {
    const id = asNonEmptyString(repoId)
    if (!id) {
      continue
    }
    queuesByRepoId[id] = normalizeQueue(id, queue)
  }
  return { queuesByRepoId }
}

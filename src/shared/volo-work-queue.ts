import type { TaskSourceContext } from './task-source-context'
import type { VoloTask } from './volo-types'

export const VOLO_WORK_QUEUE_MAX_ITEMS = 40
export const VOLO_WORK_QUEUE_MAX_PARALLEL = 3
export const VOLO_WORK_QUEUE_LAUNCH_GRACE_MS = 90_000
export const VOLO_WORK_QUEUE_DESCRIPTION_MAX = 4_000

export type VoloWorkQueueItemStatus = 'queued' | 'running' | 'done' | 'failed'

export type VoloWorkQueueItem = {
  id: string
  taskId: string
  taskCode: string
  title: string
  url: string
  description?: string
  boardName?: string
  parallel: boolean
  status: VoloWorkQueueItemStatus
  worktreeId?: string
  /** Existing workspace the user picked; omit to create a new one. */
  targetWorktreeId?: string
  enqueuedAt: number
  startedAt?: number
  finishedAt?: number
  error?: string
}

export type VoloWorkQueue = {
  repoId: string
  dispatching: boolean
  pmEnabled: boolean
  pmWorktreeId?: string
  sourceContext: TaskSourceContext | null
  items: VoloWorkQueueItem[]
}

export type VoloWorkQueueState = {
  queuesByRepoId: Record<string, VoloWorkQueue>
}

export const DEFAULT_VOLO_WORK_QUEUE: VoloWorkQueueState = {
  queuesByRepoId: {}
}

export function emptyVoloWorkQueue(repoId: string): VoloWorkQueue {
  return {
    repoId,
    dispatching: false,
    pmEnabled: false,
    sourceContext: null,
    items: []
  }
}

export function snapshotVoloTaskForQueue(
  task: VoloTask,
  id: string,
  now: number,
  targetWorktreeId?: string
): VoloWorkQueueItem {
  const description = task.description?.trim()
  return {
    id,
    taskId: task.id,
    taskCode: task.taskCode,
    title: task.title,
    url: task.url,
    ...(description ? { description: description.slice(0, VOLO_WORK_QUEUE_DESCRIPTION_MAX) } : {}),
    boardName: task.boardName,
    parallel: false,
    status: 'queued',
    ...(targetWorktreeId ? { targetWorktreeId } : {}),
    enqueuedAt: now
  }
}

export function enqueueVoloWorkQueueItems(
  queue: VoloWorkQueue,
  tasks: readonly VoloTask[],
  now: number,
  createId: () => string,
  sourceContext?: TaskSourceContext | null,
  targetWorktreeId?: string
): VoloWorkQueue {
  const activeCodes = new Set(
    queue.items
      .filter((item) => item.status === 'queued' || item.status === 'running')
      .map((item) => item.taskCode.toUpperCase())
  )
  const nextItems = [...queue.items]
  for (const task of tasks) {
    if (nextItems.length >= VOLO_WORK_QUEUE_MAX_ITEMS) {
      break
    }
    const code = task.taskCode.trim().toUpperCase()
    if (!code || activeCodes.has(code)) {
      continue
    }
    activeCodes.add(code)
    nextItems.push(snapshotVoloTaskForQueue(task, createId(), now, targetWorktreeId))
  }
  return {
    ...queue,
    sourceContext: sourceContext ?? queue.sourceContext,
    items: nextItems
  }
}

export function voloWorkQueueItemToTask(item: VoloWorkQueueItem): VoloTask {
  const timestamp = new Date(item.enqueuedAt).toISOString()
  return {
    id: item.taskId,
    taskCode: item.taskCode,
    title: item.title,
    url: item.url,
    description: item.description,
    boardId: '',
    columnId: '',
    priority: 'medium',
    inKanban: true,
    order: 0,
    updatedAt: timestamp,
    createdAt: timestamp,
    boardName: item.boardName
  }
}

export function takeVoloWorkQueueDispatchGroup(
  queued: readonly VoloWorkQueueItem[],
  remainingSlots: number
): VoloWorkQueueItem[] {
  if (remainingSlots <= 0 || queued.length === 0) {
    return []
  }
  const first = queued[0]
  if (!first.parallel) {
    return remainingSlots > 0 ? [first] : []
  }
  const group: VoloWorkQueueItem[] = []
  for (const item of queued) {
    if (!item.parallel) {
      break
    }
    group.push(item)
    if (group.length >= remainingSlots) {
      break
    }
  }
  return group
}

export function selectVoloWorkQueueStarts(queue: VoloWorkQueue): VoloWorkQueueItem[] {
  if (!queue.dispatching) {
    return []
  }
  const queued = queue.items.filter((item) => item.status === 'queued')
  // Why: a just-started item occupies a slot before its agent hook is live.
  const occupying = queue.items.filter((item) => item.status === 'running')
  if (occupying.some((item) => !item.parallel)) {
    return []
  }
  if (occupying.length > 0 && queued[0] && !queued[0].parallel) {
    return []
  }
  const remainingSlots = VOLO_WORK_QUEUE_MAX_PARALLEL - occupying.length
  return takeVoloWorkQueueDispatchGroup(queued, remainingSlots)
}

export type VoloQueueItemVerdict = 'working' | 'complete' | 'unknown'

export function reconcileVoloWorkQueue(
  queue: VoloWorkQueue,
  verdictsByItemId: ReadonlyMap<string, VoloQueueItemVerdict>,
  now: number
): VoloWorkQueue {
  const items = queue.items.map((item) => {
    if (item.status !== 'running') {
      return item
    }
    const verdict = verdictsByItemId.get(item.id) ?? 'unknown'
    if (verdict === 'working') {
      return item
    }
    if (verdict === 'complete') {
      return { ...item, status: 'done' as const, finishedAt: now }
    }
    const startedAt = item.startedAt ?? item.enqueuedAt
    if (now - startedAt < VOLO_WORK_QUEUE_LAUNCH_GRACE_MS) {
      return item
    }
    return {
      ...item,
      status: 'done' as const,
      finishedAt: now
    }
  })
  return { ...queue, items }
}

export function setVoloWorkQueueItemParallel(
  queue: VoloWorkQueue,
  itemId: string,
  parallel: boolean
): VoloWorkQueue {
  return {
    ...queue,
    items: queue.items.map((item) => (item.id === itemId ? { ...item, parallel } : item))
  }
}

export function removeVoloWorkQueueItem(queue: VoloWorkQueue, itemId: string): VoloWorkQueue {
  return {
    ...queue,
    items: queue.items.filter((item) => item.id !== itemId || item.status === 'running')
  }
}

export function clearFinishedVoloWorkQueueItems(queue: VoloWorkQueue): VoloWorkQueue {
  return {
    ...queue,
    items: queue.items.filter((item) => item.status === 'queued' || item.status === 'running')
  }
}

export function markVoloWorkQueueItemRunning(
  queue: VoloWorkQueue,
  itemId: string,
  worktreeId: string | undefined,
  now: number
): VoloWorkQueue {
  return {
    ...queue,
    items: queue.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status: 'running',
            ...(worktreeId ? { worktreeId } : {}),
            startedAt: item.startedAt ?? now,
            error: undefined
          }
        : item
    )
  }
}

export function markVoloWorkQueueItemFailed(
  queue: VoloWorkQueue,
  itemId: string,
  error: string,
  now: number
): VoloWorkQueue {
  return {
    ...queue,
    items: queue.items.map((item) =>
      item.id === itemId ? { ...item, status: 'failed', finishedAt: now, error } : item
    )
  }
}

export function activeVoloWorkQueueCount(queue: VoloWorkQueue): number {
  return queue.items.filter((item) => item.status === 'queued' || item.status === 'running').length
}

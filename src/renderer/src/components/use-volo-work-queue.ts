import { useCallback } from 'react'
import { useAppStore } from '@/store'
import { createBrowserUuid } from '@/lib/browser-uuid'
import type { TaskSourceContext } from '../../../shared/task-source-context'
import type { VoloTask } from '../../../shared/volo-types'
import {
  DEFAULT_VOLO_WORK_QUEUE,
  activeVoloWorkQueueCount,
  clearFinishedVoloWorkQueueItems,
  emptyVoloWorkQueue,
  enqueueVoloWorkQueueItems,
  removeVoloWorkQueueItem,
  setVoloWorkQueueItemParallel,
  type VoloWorkQueue,
  type VoloWorkQueueState
} from '../../../shared/volo-work-queue'

const emptyQueuesByRepoId = new Map<string, VoloWorkQueue>()

function stableEmptyVoloWorkQueue(repoId: string): VoloWorkQueue {
  const cached = emptyQueuesByRepoId.get(repoId)
  if (cached) {
    return cached
  }
  const empty = emptyVoloWorkQueue(repoId)
  Object.freeze(empty.items)
  Object.freeze(empty)
  emptyQueuesByRepoId.set(repoId, empty)
  return empty
}

// Why: Zustand getSnapshot must reuse the same object; a fresh empty per call is React #185.
export function selectVoloRepoQueue(
  queuesByRepoId: Record<string, VoloWorkQueue> | undefined,
  repoId: string | null
): VoloWorkQueue {
  if (!repoId) {
    return stableEmptyVoloWorkQueue('')
  }
  return queuesByRepoId?.[repoId] ?? stableEmptyVoloWorkQueue(repoId)
}

function currentState(): VoloWorkQueueState {
  return useAppStore.getState().settings?.voloWorkQueue ?? DEFAULT_VOLO_WORK_QUEUE
}

function writeState(next: VoloWorkQueueState): void {
  void useAppStore.getState().updateSettings({ voloWorkQueue: next })
}

function writeRepoQueue(repoId: string, queue: VoloWorkQueue): void {
  const current = currentState()
  writeState({
    queuesByRepoId: {
      ...current.queuesByRepoId,
      [repoId]: queue
    }
  })
}

export function readVoloWorkQueue(repoId: string | null | undefined): VoloWorkQueue {
  return selectVoloRepoQueue(currentState().queuesByRepoId, repoId ?? null)
}

export function patchVoloWorkQueue(
  repoId: string,
  updater: (queue: VoloWorkQueue) => VoloWorkQueue
): VoloWorkQueue {
  const next = updater(readVoloWorkQueue(repoId))
  writeRepoQueue(repoId, next)
  return next
}

export function useVoloWorkQueue(repoId: string | null): {
  queue: VoloWorkQueue
  enqueueTasks: (
    tasks: readonly VoloTask[],
    sourceContext: TaskSourceContext | null
  ) => VoloWorkQueue
  setDispatching: (dispatching: boolean) => void
  setPmEnabled: (pmEnabled: boolean) => void
  setItemParallel: (itemId: string, parallel: boolean) => void
  removeItem: (itemId: string) => void
  clearFinished: () => void
  activeCount: number
} {
  const queue = useAppStore((state) =>
    selectVoloRepoQueue(state.settings?.voloWorkQueue?.queuesByRepoId, repoId)
  )

  const enqueueTasks = useCallback(
    (tasks: readonly VoloTask[], sourceContext: TaskSourceContext | null): VoloWorkQueue => {
      if (!repoId) {
        return emptyVoloWorkQueue('')
      }
      return patchVoloWorkQueue(repoId, (current) => ({
        ...enqueueVoloWorkQueueItems(current, tasks, Date.now(), createBrowserUuid, sourceContext),
        dispatching: true
      }))
    },
    [repoId]
  )

  const setDispatching = useCallback(
    (dispatching: boolean): void => {
      if (!repoId) {
        return
      }
      patchVoloWorkQueue(repoId, (current) => ({ ...current, dispatching }))
    },
    [repoId]
  )

  const setPmEnabled = useCallback(
    (pmEnabled: boolean): void => {
      if (!repoId) {
        return
      }
      patchVoloWorkQueue(repoId, (current) => ({
        ...current,
        pmEnabled,
        ...(pmEnabled ? {} : { pmWorktreeId: undefined })
      }))
    },
    [repoId]
  )

  const setItemParallel = useCallback(
    (itemId: string, parallel: boolean): void => {
      if (!repoId) {
        return
      }
      patchVoloWorkQueue(repoId, (current) =>
        setVoloWorkQueueItemParallel(current, itemId, parallel)
      )
    },
    [repoId]
  )

  const removeItem = useCallback(
    (itemId: string): void => {
      if (!repoId) {
        return
      }
      patchVoloWorkQueue(repoId, (current) => removeVoloWorkQueueItem(current, itemId))
    },
    [repoId]
  )

  const clearFinished = useCallback((): void => {
    if (!repoId) {
      return
    }
    patchVoloWorkQueue(repoId, clearFinishedVoloWorkQueueItems)
  }, [repoId])

  return {
    queue,
    enqueueTasks,
    setDispatching,
    setPmEnabled,
    setItemParallel,
    removeItem,
    clearFinished,
    activeCount: activeVoloWorkQueueCount(queue)
  }
}

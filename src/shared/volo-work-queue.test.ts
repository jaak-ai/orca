import { describe, expect, it } from 'vitest'
import type { VoloTask } from './volo-types'
import { normalizeVoloWorkQueue } from './volo-work-queue-normalize'
import {
  DEFAULT_VOLO_WORK_QUEUE,
  emptyVoloWorkQueue,
  enqueueVoloWorkQueueItems,
  reconcileVoloWorkQueue,
  selectVoloWorkQueueStarts,
  takeVoloWorkQueueDispatchGroup,
  VOLO_WORK_QUEUE_LAUNCH_GRACE_MS
} from './volo-work-queue'

function task(code: string, title = code): VoloTask {
  return {
    id: `id-${code}`,
    taskCode: code,
    title,
    url: `https://volo.example/${code}`,
    boardId: 'b1',
    columnId: 'c1',
    priority: 'medium',
    inKanban: true,
    order: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z'
  }
}

describe('normalizeVoloWorkQueue', () => {
  it('returns empty state for garbage', () => {
    expect(normalizeVoloWorkQueue(null)).toEqual(DEFAULT_VOLO_WORK_QUEUE)
    expect(normalizeVoloWorkQueue('nope')).toEqual(DEFAULT_VOLO_WORK_QUEUE)
  })

  it('keeps a well-formed item and drops a broken one', () => {
    const result = normalizeVoloWorkQueue({
      queuesByRepoId: {
        'repo-1': {
          repoId: 'repo-1',
          dispatching: true,
          pmEnabled: true,
          items: [
            {
              id: 'q1',
              taskId: 't1',
              taskCode: 'TO-1',
              title: 'Filters',
              url: 'https://volo.example/TO-1',
              parallel: true,
              status: 'queued',
              enqueuedAt: 10
            },
            { id: 'broken' }
          ]
        }
      }
    })
    expect(result.queuesByRepoId['repo-1']?.dispatching).toBe(true)
    expect(result.queuesByRepoId['repo-1']?.items).toHaveLength(1)
    expect(result.queuesByRepoId['repo-1']?.items[0]?.taskCode).toBe('TO-1')
  })
})

describe('enqueueVoloWorkQueueItems', () => {
  it('skips codes already queued or running', () => {
    let ids = 0
    const queued = enqueueVoloWorkQueueItems(
      emptyVoloWorkQueue('repo-1'),
      [task('TO-1'), task('TO-2')],
      1,
      () => `id-${(ids += 1)}`
    )
    const again = enqueueVoloWorkQueueItems(queued, [task('TO-1'), task('TO-3')], 2, () => 'id-3')
    expect(again.items.map((item) => item.taskCode)).toEqual(['TO-1', 'TO-2', 'TO-3'])
  })

  it('stamps a chosen workspace onto new items', () => {
    const queued = enqueueVoloWorkQueueItems(
      emptyVoloWorkQueue('repo-1'),
      [task('TO-1')],
      1,
      () => 'id-1',
      null,
      'wt-existing'
    )
    expect(queued.items[0]?.targetWorktreeId).toBe('wt-existing')
  })
})

describe('takeVoloWorkQueueDispatchGroup', () => {
  it('starts one sequential item', () => {
    const queue = enqueueVoloWorkQueueItems(
      emptyVoloWorkQueue('repo-1'),
      [task('TO-1'), task('TO-2')],
      1,
      () => 'a'
    )
    expect(takeVoloWorkQueueDispatchGroup(queue.items, 3).map((item) => item.taskCode)).toEqual([
      'TO-1'
    ])
  })

  it('starts a consecutive parallel group up to the cap', () => {
    let ids = 0
    const queued = enqueueVoloWorkQueueItems(
      emptyVoloWorkQueue('repo-1'),
      [task('TO-1'), task('TO-2'), task('TO-3')],
      1,
      () => `id-${(ids += 1)}`
    )
    const parallel = {
      ...queued,
      items: queued.items.map((item, index) => ({ ...item, parallel: index < 2 }))
    }
    expect(takeVoloWorkQueueDispatchGroup(parallel.items, 3).map((item) => item.taskCode)).toEqual([
      'TO-1',
      'TO-2'
    ])
  })
})

describe('selectVoloWorkQueueStarts', () => {
  it('starts the first queued item when idle', () => {
    const queue = {
      ...emptyVoloWorkQueue('repo-1'),
      dispatching: true,
      items: [
        {
          id: 'a',
          taskId: 't1',
          taskCode: 'TO-1',
          title: 'One',
          url: 'https://volo.example/TO-1',
          parallel: false,
          status: 'queued' as const,
          enqueuedAt: 1
        }
      ]
    }
    expect(selectVoloWorkQueueStarts(queue).map((item) => item.taskCode)).toEqual(['TO-1'])
  })

  it('starts nothing while a sequential item is live', () => {
    const queue = {
      ...emptyVoloWorkQueue('repo-1'),
      dispatching: true,
      items: [
        {
          id: 'a',
          taskId: 't1',
          taskCode: 'TO-1',
          title: 'One',
          url: 'https://volo.example/TO-1',
          parallel: false,
          status: 'running' as const,
          worktreeId: 'wt-1',
          enqueuedAt: 1,
          startedAt: 2
        },
        {
          id: 'b',
          taskId: 't2',
          taskCode: 'TO-2',
          title: 'Two',
          url: 'https://volo.example/TO-2',
          parallel: true,
          status: 'queued' as const,
          enqueuedAt: 1
        }
      ]
    }
    expect(selectVoloWorkQueueStarts(queue)).toEqual([])
  })

  it('does not start a sequential item behind a live parallel group', () => {
    const queue = {
      ...emptyVoloWorkQueue('repo-1'),
      dispatching: true,
      items: [
        {
          id: 'a',
          taskId: 't1',
          taskCode: 'TO-1',
          title: 'One',
          url: 'https://volo.example/TO-1',
          parallel: true,
          status: 'running' as const,
          worktreeId: 'wt-1',
          enqueuedAt: 1,
          startedAt: 2
        },
        {
          id: 'b',
          taskId: 't2',
          taskCode: 'TO-2',
          title: 'Two',
          url: 'https://volo.example/TO-2',
          parallel: false,
          status: 'queued' as const,
          enqueuedAt: 1
        }
      ]
    }
    expect(selectVoloWorkQueueStarts(queue)).toEqual([])
  })

  it('still starts queued work when a PM coordinator is enabled', () => {
    const queue = {
      ...emptyVoloWorkQueue('repo-1'),
      dispatching: true,
      pmEnabled: true,
      items: [
        {
          id: 'a',
          taskId: 't1',
          taskCode: 'TO-1',
          title: 'One',
          url: 'https://volo.example/TO-1',
          parallel: false,
          status: 'queued' as const,
          enqueuedAt: 1
        }
      ]
    }
    expect(selectVoloWorkQueueStarts(queue).map((item) => item.taskCode)).toEqual(['TO-1'])
  })
})

describe('reconcileVoloWorkQueue', () => {
  const running = {
    ...emptyVoloWorkQueue('repo-1'),
    dispatching: true,
    items: [
      {
        id: 'a',
        taskId: 't1',
        taskCode: 'TO-1',
        title: 'One',
        url: 'https://volo.example/TO-1',
        parallel: false,
        status: 'running' as const,
        worktreeId: 'wt-1',
        enqueuedAt: 1,
        startedAt: 10
      }
    ]
  }

  it('keeps a freshly launched item during the grace window', () => {
    const next = reconcileVoloWorkQueue(running, new Map([['a', 'unknown']]), 10 + 1_000)
    expect(next.items[0]?.status).toBe('running')
  })

  it('marks a running item done as soon as the agent turn completed', () => {
    const next = reconcileVoloWorkQueue(running, new Map([['a', 'complete']]), 11)
    expect(next.items[0]?.status).toBe('done')
  })

  it('keeps working items running even after the launch grace', () => {
    const next = reconcileVoloWorkQueue(
      running,
      new Map([['a', 'working']]),
      10 + VOLO_WORK_QUEUE_LAUNCH_GRACE_MS + 1
    )
    expect(next.items[0]?.status).toBe('running')
  })

  it('marks a running item done after grace when the agent never reported', () => {
    const next = reconcileVoloWorkQueue(
      running,
      new Map([['a', 'unknown']]),
      10 + VOLO_WORK_QUEUE_LAUNCH_GRACE_MS + 1
    )
    expect(next.items[0]?.status).toBe('done')
  })
})

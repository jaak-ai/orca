import { describe, expect, it } from 'vitest'
import { voloQueueItemVerdict } from './volo-work-queue-verdict'

const item = { worktreeId: 'wt-1', startedAt: 100, enqueuedAt: 100 }

describe('voloQueueItemVerdict', () => {
  it('treats a fresh working agent as still running', () => {
    expect(
      voloQueueItemVerdict({
        item,
        now: 150,
        entries: [
          {
            state: 'working',
            updatedAt: 140,
            evidenceObservedAt: 140,
            restoredUnconfirmed: false
          }
        ]
      })
    ).toBe('working')
  })

  it('completes as soon as a done status arrives after launch', () => {
    expect(
      voloQueueItemVerdict({
        item,
        now: 150,
        entries: [
          {
            state: 'done',
            updatedAt: 130,
            evidenceObservedAt: 130
          }
        ]
      })
    ).toBe('complete')
  })

  it('ignores a done status from before this queue item started', () => {
    expect(
      voloQueueItemVerdict({
        item,
        now: 150,
        entries: [
          {
            state: 'done',
            updatedAt: 50,
            evidenceObservedAt: 50
          }
        ]
      })
    ).toBe('unknown')
  })
})

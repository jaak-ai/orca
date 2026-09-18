import { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { collectVoloQueueVerdicts } from '@/lib/volo-work-queue-verdict'
import { notifyVoloWorkQueueTickError, tickAllVoloWorkQueues } from '@/lib/volo-work-queue-dispatch'

const GRACE_POLL_MS = 2_000

export function VoloWorkQueueDispatcher(): null {
  const dispatching = useAppStore((state) =>
    Object.values(state.settings?.voloWorkQueue?.queuesByRepoId ?? {}).some(
      (queue) => queue.dispatching
    )
  )
  const queueSignature = useAppStore((state) => {
    const queues = state.settings?.voloWorkQueue?.queuesByRepoId
    if (!queues) {
      return ''
    }
    return Object.values(queues)
      .map(
        (queue) =>
          `${queue.repoId}:${queue.dispatching ? '1' : '0'}:${queue.pmEnabled ? '1' : '0'}:${queue.items
            .map((item) => `${item.status}:${item.parallel ? 'p' : 's'}`)
            .join(',')}`
      )
      .join('|')
  })
  const verdictSignature = useAppStore((state) => {
    const queues = Object.values(state.settings?.voloWorkQueue?.queuesByRepoId ?? {})
    const now = Date.now()
    return queues
      .filter((queue) => queue.dispatching)
      .map((queue) => {
        const verdicts = collectVoloQueueVerdicts({
          items: queue.items,
          agentStatusByPaneKey: state.agentStatusByPaneKey,
          tabsByWorktree: state.tabsByWorktree,
          now
        })
        return queue.items
          .filter((item) => item.status === 'running')
          .map((item) => `${item.id}:${verdicts.get(item.id) ?? 'unknown'}`)
          .join(',')
      })
      .join('|')
  })
  const ticking = useRef(false)
  const pending = useRef(false)

  useEffect(() => {
    if (!dispatching) {
      return
    }
    const run = (): void => {
      if (ticking.current) {
        pending.current = true
        return
      }
      ticking.current = true
      void tickAllVoloWorkQueues()
        .catch(() => {
          notifyVoloWorkQueueTickError()
        })
        .finally(() => {
          ticking.current = false
          if (pending.current) {
            pending.current = false
            run()
          }
        })
    }
    run()
    const interval = window.setInterval(run, GRACE_POLL_MS)
    return () => {
      window.clearInterval(interval)
    }
  }, [dispatching, queueSignature, verdictSignature])

  return null
}

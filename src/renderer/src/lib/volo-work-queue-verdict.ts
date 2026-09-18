import {
  isFreshNonDoneAgentStatus,
  type AgentStatusEntry
} from '../../../shared/agent-status-types'
import type { VoloQueueItemVerdict, VoloWorkQueueItem } from '../../../shared/volo-work-queue'
import { resolveAgentStatusWorktreeId } from '@/lib/agent-status-worktree-attribution'

export function voloQueueItemVerdict(args: {
  item: Pick<VoloWorkQueueItem, 'worktreeId' | 'startedAt' | 'enqueuedAt'>
  entries: readonly Pick<
    AgentStatusEntry,
    | 'state'
    | 'updatedAt'
    | 'evidenceObservedAt'
    | 'mirroredEvidenceReceivedAt'
    | 'restoredUnconfirmed'
    | 'structuredHostOwned'
  >[]
  now: number
}): VoloQueueItemVerdict {
  const startedAt = args.item.startedAt ?? args.item.enqueuedAt
  const active = args.entries.some((entry) => isFreshNonDoneAgentStatus(entry, args.now))
  if (active) {
    return 'working'
  }
  const completedAfterStart = args.entries.some(
    (entry) => entry.state === 'done' && entry.updatedAt >= startedAt
  )
  if (completedAfterStart) {
    return 'complete'
  }
  return 'unknown'
}

export function collectVoloQueueVerdicts(args: {
  items: readonly VoloWorkQueueItem[]
  agentStatusByPaneKey: Record<string, AgentStatusEntry>
  tabsByWorktree: Record<string, readonly { id: string }[]>
  now: number
}): Map<string, VoloQueueItemVerdict> {
  const worktreeIdByTabId = new Map<string, string>()
  for (const [worktreeId, tabs] of Object.entries(args.tabsByWorktree)) {
    for (const tab of tabs) {
      worktreeIdByTabId.set(tab.id, worktreeId)
    }
  }
  const entriesByWorktree = new Map<string, AgentStatusEntry[]>()
  for (const entry of Object.values(args.agentStatusByPaneKey)) {
    const worktreeId = resolveAgentStatusWorktreeId(entry, worktreeIdByTabId)
    if (!worktreeId) {
      continue
    }
    const list = entriesByWorktree.get(worktreeId)
    if (list) {
      list.push(entry)
    } else {
      entriesByWorktree.set(worktreeId, [entry])
    }
  }
  const verdicts = new Map<string, VoloQueueItemVerdict>()
  for (const item of args.items) {
    if (item.status !== 'running') {
      continue
    }
    verdicts.set(
      item.id,
      voloQueueItemVerdict({
        item,
        entries: item.worktreeId ? (entriesByWorktree.get(item.worktreeId) ?? []) : [],
        now: args.now
      })
    )
  }
  return verdicts
}

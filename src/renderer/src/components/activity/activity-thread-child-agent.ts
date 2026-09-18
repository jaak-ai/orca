import type { AgentStatusEntry } from '../../../../shared/agent-status-types'
import {
  buildAgentRowLineageTree,
  resolveAgentRowParentPaneKey,
  type AgentLineageSourceRow
} from '../dashboard/agent-row-lineage-model'

type ChildAgentLineageEntry = Pick<AgentStatusEntry, 'terminalHandle' | 'orchestration'>

/** Minimal structural input: a full AgentPaneThread satisfies it (pinned by the
 *  classifier tests), and count/badge callers can feed synthetic rows uncast. */
export type ChildAgentClassifiableThread = {
  paneKey: string
  worktree?: { id: string }
  currentAgentEntry?: ChildAgentLineageEntry | null
  latestEvent?: { entry: ChildAgentLineageEntry } | null
  events?: readonly { entry: ChildAgentLineageEntry }[]
}

/** Every entry that can carry the pane's orchestration lineage, newest first. */
function candidateEntries(thread: ChildAgentClassifiableThread): ChildAgentLineageEntry[] {
  const entries: ChildAgentLineageEntry[] = []
  if (thread.currentAgentEntry) {
    entries.push(thread.currentAgentEntry)
  }
  if (thread.latestEvent?.entry) {
    entries.push(thread.latestEvent.entry)
  }
  for (const event of thread.events ?? []) {
    entries.push(event.entry)
  }
  return entries
}

function firstReportedTerminalHandle(thread: ChildAgentClassifiableThread): string | undefined {
  for (const entry of candidateEntries(thread)) {
    if (entry.terminalHandle) {
      return entry.terminalHandle
    }
  }
  return undefined
}

/**
 * Pane keys of threads that are children of another currently listed thread.
 * Delegates to the dashboard's lineage model so both surfaces classify the same
 * pane identically: a parent reference only counts while the parent thread is
 * still listed, so orphaned workers (their coordinator pane closed) and cycle
 * members are promoted to top level instead of staying hidden behind the
 * child-agent filter. Classification is sticky across a thread's older events:
 * the newest entry whose parent still resolves wins.
 */
function parentPaneKeyFromWorktreeLineage(
  thread: ChildAgentClassifiableThread,
  threads: readonly ChildAgentClassifiableThread[],
  lineageByWorktreeId?: Readonly<Record<string, { parentWorktreeId: string }>>
): string | undefined {
  const worktreeId = thread.worktree?.id
  if (!worktreeId) {
    return undefined
  }
  const parentWorktreeId = lineageByWorktreeId?.[worktreeId]?.parentWorktreeId
  if (!parentWorktreeId || parentWorktreeId === worktreeId) {
    return undefined
  }
  const parent = threads.find((candidate) => candidate.worktree?.id === parentWorktreeId)
  if (!parent || parent.paneKey === thread.paneKey) {
    return undefined
  }
  return parent.paneKey
}

export function collectChildAgentPaneKeys(
  threads: readonly ChildAgentClassifiableThread[],
  lineageByWorktreeId?: Readonly<Record<string, { parentWorktreeId: string }>>
): Set<string> {
  const baseRows: AgentLineageSourceRow[] = threads.map((thread) => ({
    paneKey: thread.paneKey,
    entry: { terminalHandle: firstReportedTerminalHandle(thread) }
  }))
  const rowsByPaneKey = new Map<string, AgentLineageSourceRow>()
  for (const row of baseRows) {
    if (!rowsByPaneKey.has(row.paneKey)) {
      rowsByPaneKey.set(row.paneKey, row)
    }
  }
  const paneKeyByTerminalHandle = new Map<string, string>()
  for (const row of baseRows) {
    if (row.entry.terminalHandle && !paneKeyByTerminalHandle.has(row.entry.terminalHandle)) {
      paneKeyByTerminalHandle.set(row.entry.terminalHandle, row.paneKey)
    }
  }

  const rows = threads.map((thread, index) => {
    const base = baseRows[index]
    for (const entry of candidateEntries(thread)) {
      if (!entry.orchestration) {
        continue
      }
      const probe: AgentLineageSourceRow = {
        paneKey: thread.paneKey,
        entry: { terminalHandle: base.entry.terminalHandle, orchestration: entry.orchestration }
      }
      if (resolveAgentRowParentPaneKey(probe, rowsByPaneKey, paneKeyByTerminalHandle)) {
        return probe
      }
    }
    const parentPaneKey = parentPaneKeyFromWorktreeLineage(thread, threads, lineageByWorktreeId)
    if (parentPaneKey) {
      return {
        paneKey: thread.paneKey,
        entry: {
          terminalHandle: base.entry.terminalHandle,
          orchestration: {
            parentPaneKey,
            taskId: parentPaneKey,
            dispatchId: parentPaneKey
          }
        }
      }
    }
    return base
  })

  return buildAgentRowLineageTree(rows).childPaneKeys
}

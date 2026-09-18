import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { launchWorkItemDirect } from '@/lib/launch-work-item-direct'
import { launchAgentInNewTab } from '@/lib/launch-agent-in-new-tab'
import { folderWorkspaceToWorktree } from '../../../shared/folder-workspace-worktree'
import {
  findVoloTaskWorkspaceAttachment,
  activateVoloTaskWorkspace
} from '@/lib/volo-task-workspace-attachment'
import { collectVoloQueueVerdicts } from '@/lib/volo-work-queue-verdict'
import {
  buildVoloLaunchableWorkItem,
  buildVoloLaunchDraftContent
} from '@/components/task-page/volo/volo-task-launch'
import { buildVoloPmLaunchableWorkItem } from '@/components/task-page/volo/volo-pm-prompt'
import {
  markVoloWorkQueueItemFailed,
  markVoloWorkQueueItemRunning,
  reconcileVoloWorkQueue,
  selectVoloWorkQueueStarts,
  voloWorkQueueItemToTask,
  type VoloWorkQueue,
  type VoloWorkQueueItem
} from '../../../shared/volo-work-queue'
import { patchVoloWorkQueue, readVoloWorkQueue } from '@/components/use-volo-work-queue'

const inFlightKeys = new Set<string>()

function currentWorktrees() {
  const state = useAppStore.getState()
  return [...state.allWorktrees(), ...state.folderWorkspaces.map(folderWorkspaceToWorktree)]
}

function currentQueueVerdicts(queue: VoloWorkQueue, now = Date.now()) {
  const state = useAppStore.getState()
  return collectVoloQueueVerdicts({
    items: queue.items,
    agentStatusByPaneKey: state.agentStatusByPaneKey,
    tabsByWorktree: state.tabsByWorktree,
    now
  })
}

async function startQueueItem(queue: VoloWorkQueue, item: VoloWorkQueueItem): Promise<void> {
  const key = `${queue.repoId}:${item.id}`
  if (inFlightKeys.has(key)) {
    return
  }
  inFlightKeys.add(key)
  const now = Date.now()
  try {
    patchVoloWorkQueue(queue.repoId, (current) =>
      markVoloWorkQueueItemRunning(current, item.id, item.worktreeId ?? item.targetWorktreeId, now)
    )
    if (item.targetWorktreeId) {
      const target = currentWorktrees().find((worktree) => worktree.id === item.targetWorktreeId)
      const defaultAgent = useAppStore.getState().settings?.defaultTuiAgent
      const agent = defaultAgent && defaultAgent !== 'blank' ? defaultAgent : null
      if (!target || !agent) {
        patchVoloWorkQueue(queue.repoId, (current) =>
          markVoloWorkQueueItemFailed(
            current,
            item.id,
            translate(
              'auto.lib.volo.workQueue.existingWorkspaceFailed',
              'Could not start this Volo task in the selected workspace.'
            ),
            now
          )
        )
        return
      }
      activateVoloTaskWorkspace(target)
      const launched = launchAgentInNewTab({
        agent,
        worktreeId: target.id,
        prompt: buildVoloLaunchDraftContent(voloWorkQueueItemToTask(item)),
        promptDelivery: 'submit-after-ready',
        launchSource: 'task_page'
      })
      if (!launched) {
        patchVoloWorkQueue(queue.repoId, (current) =>
          markVoloWorkQueueItemFailed(
            current,
            item.id,
            translate(
              'auto.lib.volo.workQueue.existingWorkspaceFailed',
              'Could not start this Volo task in the selected workspace.'
            ),
            Date.now()
          )
        )
        return
      }
      patchVoloWorkQueue(queue.repoId, (current) =>
        markVoloWorkQueueItemRunning(current, item.id, target.id, Date.now())
      )
      return
    }
    const beforeIds = new Set(currentWorktrees().map((worktree) => worktree.id))
    const started = await launchWorkItemDirect({
      item: buildVoloLaunchableWorkItem(voloWorkQueueItemToTask(item)),
      repoId: queue.repoId,
      launchSource: 'task_page',
      telemetrySource: 'sidebar',
      promptDelivery: 'submit-after-ready',
      linkedTaskSourceContext: queue.sourceContext,
      parentWorktreeId: queue.pmWorktreeId,
      openModalFallback: () => {
        patchVoloWorkQueue(queue.repoId, (current) => ({ ...current, dispatching: false }))
        toast.error(
          translate(
            'auto.lib.volo.workQueue.setupRequired',
            'Could not start automatically. Confirm workspace setup, then resume the queue.'
          )
        )
      }
    })
    const created = currentWorktrees().find((worktree) => !beforeIds.has(worktree.id))
    const launched = created ?? findVoloTaskWorkspaceAttachment(currentWorktrees(), item.taskCode)
    if (started && launched) {
      if (queue.pmWorktreeId && launched.id !== queue.pmWorktreeId) {
        void useAppStore
          .getState()
          .assignWorktreeParent(launched.id, { parentWorktreeId: queue.pmWorktreeId })
          .catch(() => undefined)
      }
      patchVoloWorkQueue(queue.repoId, (current) =>
        markVoloWorkQueueItemRunning(current, item.id, launched.id, Date.now())
      )
      return
    }
    if (!started) {
      patchVoloWorkQueue(queue.repoId, (current) =>
        markVoloWorkQueueItemFailed(
          current,
          item.id,
          translate(
            'auto.lib.volo.workQueue.launchFailed',
            'Could not start this Volo task automatically.'
          ),
          Date.now()
        )
      )
    }
  } finally {
    inFlightKeys.delete(key)
  }
}

async function ensurePmWorkspace(queue: VoloWorkQueue): Promise<void> {
  const key = `pm:${queue.repoId}`
  if (queue.pmWorktreeId || inFlightKeys.has(key)) {
    return
  }
  inFlightKeys.add(key)
  try {
    const pending = queue.items.filter(
      (item) => item.status === 'queued' || item.status === 'running'
    )
    if (pending.length === 0) {
      return
    }
    const beforeIds = new Set(currentWorktrees().map((worktree) => worktree.id))
    const started = await launchWorkItemDirect({
      item: buildVoloPmLaunchableWorkItem(pending),
      repoId: queue.repoId,
      launchSource: 'task_page',
      telemetrySource: 'sidebar',
      promptDelivery: 'submit-after-ready',
      linkedTaskSourceContext: queue.sourceContext,
      openModalFallback: () => {
        patchVoloWorkQueue(queue.repoId, (current) => ({ ...current, dispatching: false }))
        toast.error(
          translate(
            'auto.lib.volo.workQueue.setupRequired',
            'Could not start automatically. Confirm workspace setup, then resume the queue.'
          )
        )
      }
    })
    const created = currentWorktrees().find((worktree) => !beforeIds.has(worktree.id))
    if (started && created) {
      patchVoloWorkQueue(queue.repoId, (current) => ({
        ...current,
        pmWorktreeId: created.id
      }))
      revealVoloPmCoordinator(created.id)
    }
  } finally {
    inFlightKeys.delete(key)
  }
}

export async function tickVoloWorkQueue(repoId: string): Promise<void> {
  const before = readVoloWorkQueue(repoId)
  if (!before.dispatching) {
    return
  }
  const now = Date.now()
  const reconciled = reconcileVoloWorkQueue(before, currentQueueVerdicts(before, now), now)
  if (JSON.stringify(reconciled.items) !== JSON.stringify(before.items)) {
    patchVoloWorkQueue(repoId, () => reconciled)
  }
  const queue = readVoloWorkQueue(repoId)
  if (queue.pmEnabled) {
    await ensurePmWorkspace(queue)
  }
  const latest = readVoloWorkQueue(repoId)
  if (latest.pmEnabled && !latest.pmWorktreeId) {
    return
  }
  const toStart = selectVoloWorkQueueStarts(latest)
  for (const item of toStart) {
    await startQueueItem(latest, item)
  }
}

export function revealVoloPmCoordinator(pmWorktreeId: string): void {
  const worktree = currentWorktrees().find((entry) => entry.id === pmWorktreeId)
  if (worktree) {
    activateVoloTaskWorkspace(worktree)
  }
  const store = useAppStore.getState()
  store.setSidebarBody('agents')
  store.setAgentsShowChildAgents(true)
}

export async function tickAllVoloWorkQueues(): Promise<void> {
  const queues = useAppStore.getState().settings?.voloWorkQueue?.queuesByRepoId ?? {}
  for (const queue of Object.values(queues)) {
    if (queue.dispatching) {
      await tickVoloWorkQueue(queue.repoId)
    }
  }
}

export function notifyVoloWorkQueueTickError(): void {
  toast.error(
    translate(
      'auto.lib.volo.workQueue.tickFailed',
      'The Volo work queue could not dispatch the next task.'
    )
  )
}

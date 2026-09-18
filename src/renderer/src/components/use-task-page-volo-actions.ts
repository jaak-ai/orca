import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { useAppStore } from '@/store'
import { translate } from '@/i18n/i18n'
import { createBrowserUuid } from '@/lib/browser-uuid'
import { resolveVoloLaunchRepoId } from '@/components/task-page/volo/volo-task-launch'
import { resolvePreferredCreationHostScope } from '../../../shared/execution-host'
import type { VoloQueueTarget } from '@/components/task-page/volo/volo-queue-target-dialog'
import { enqueueVoloWorkQueueItems } from '../../../shared/volo-work-queue'
import { patchVoloWorkQueue } from '@/components/use-volo-work-queue'
import type { VoloTask } from '../../../shared/volo-types'
import type { TaskSourceContext } from '../../../shared/task-source-context'

export function useTaskPageVoloActions({
  voloTaskSourceContext,
  repoSelection,
  setPreferredVoloQueueRepoId
}: {
  voloTaskSourceContext: TaskSourceContext | null
  repoSelection: ReadonlySet<string>
  setPreferredVoloQueueRepoId: (repoId: string | null) => void
}) {
  const [pendingQueueTasks, setPendingQueueTasks] = useState<VoloTask[] | null>(null)
  const activeRepoId = useAppStore((state) => state.activeRepoId)
  const repos = useAppStore((state) => state.repos)
  const settings = useAppStore((state) => state.settings)
  const workspaceHostScope = useAppStore((state) => state.workspaceHostScope)
  const preferredHostId = resolvePreferredCreationHostScope(workspaceHostScope, settings)

  const handleStartVoloTasks = useCallback(
    async (tasks: readonly VoloTask[]): Promise<string[]> => {
      if (tasks.length === 0) {
        return []
      }
      if (!voloTaskSourceContext) {
        toast.error(
          translate(
            'auto.components.TaskPage.voloLinkSourceUnavailable',
            'Couldn’t link this Volo task. Reconnect Volo, then try again.'
          )
        )
        return []
      }
      setPendingQueueTasks([...tasks])
      return []
    },
    [voloTaskSourceContext]
  )

  const confirmVoloQueueTarget = useCallback(
    (target: VoloQueueTarget): void => {
      const tasks = pendingQueueTasks
      if (!tasks || tasks.length === 0 || !voloTaskSourceContext) {
        setPendingQueueTasks(null)
        return
      }
      useAppStore.getState().recordFeatureInteraction('volo-tasks')
      setPreferredVoloQueueRepoId(target.repoId)
      patchVoloWorkQueue(target.repoId, (current) => ({
        ...enqueueVoloWorkQueueItems(
          current,
          tasks,
          Date.now(),
          createBrowserUuid,
          voloTaskSourceContext,
          target.targetWorktreeId
        ),
        dispatching: true
      }))
      setPendingQueueTasks(null)
      toast.success(
        tasks.length === 1
          ? translate(
              'auto.components.TaskPage.voloQueuedOne',
              'Queued 1 Volo task. The project will take it next.'
            )
          : translate(
              'auto.components.TaskPage.voloQueuedCount',
              'Queued {{count}} Volo tasks. The project will take them in order.',
              { count: tasks.length }
            )
      )
    },
    [pendingQueueTasks, setPreferredVoloQueueRepoId, voloTaskSourceContext]
  )

  const handleUseVoloItem = useCallback(
    (task: VoloTask): void => {
      void handleStartVoloTasks([task])
    },
    [handleStartVoloTasks]
  )

  const suggestedQueueRepoId = resolveVoloLaunchRepoId(repoSelection, activeRepoId, {
    repos,
    preferredHostId
  })

  return {
    handleUseVoloItem,
    handleStartVoloTasks,
    voloLaunching: false,
    pendingQueueTasks,
    setPendingQueueTasks,
    confirmVoloQueueTarget,
    suggestedQueueRepoId
  }
}

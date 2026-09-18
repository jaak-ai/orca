import { useCallback, useState } from 'react'
import { getVoloPresets } from '@/components/task-page-localized-options'
import { shouldHideTaskPageListChrome } from '@/components/task-page-list-chrome-visibility'
import { useTaskPageVoloActions } from './use-task-page-volo-actions'
import { useTaskPageVoloFetch } from './use-task-page-volo-fetch'
import { useTaskPageVoloListState } from './use-task-page-volo-list-state'
import { useVoloWorkQueue } from './use-volo-work-queue'
import { resolveVoloLaunchRepoId } from '@/components/task-page/volo/volo-task-launch'
import { resolvePreferredCreationHostScope } from '../../../shared/execution-host'
import { useAppStore } from '@/store'
import type { TaskPageComposerActionsModel } from './use-task-page-composer-actions'
import type { VoloTask } from '../../../shared/volo-types'

export function useTaskPageVoloStage(model: TaskPageComposerActionsModel) {
  const {
    taskSource,
    voloConnected,
    settings,
    voloTaskSourceContext,
    hideTaskSource,
    closeTaskDetailPage,
    repoSelection
  } = model
  const activeRepoId = useAppStore((state) => state.activeRepoId)
  const repos = useAppStore((state) => state.repos)
  const workspaceHostScope = useAppStore((state) => state.workspaceHostScope)
  const resolvedQueueRepoId = resolveVoloLaunchRepoId(repoSelection, activeRepoId, {
    repos,
    preferredHostId: resolvePreferredCreationHostScope(workspaceHostScope, settings)
  })
  const [voloConnectOpen, setVoloConnectOpen] = useState(false)
  const voloPresets = getVoloPresets()
  const listState = useTaskPageVoloListState()
  const { moveSelectedVoloTask } = useTaskPageVoloFetch({
    taskSource,
    voloConnected,
    settings,
    voloTaskSourceContext,
    selectedVoloBoardId: listState.selectedVoloBoardId,
    setSelectedVoloBoardId: listState.setSelectedVoloBoardId,
    setVoloBoards: listState.setVoloBoards,
    setVoloBoardsLoading: listState.setVoloBoardsLoading,
    setVoloTasks: listState.setVoloTasks,
    setVoloLoading: listState.setVoloLoading,
    setVoloError: listState.setVoloError,
    activeVoloPreset: listState.activeVoloPreset,
    voloRefreshNonce: listState.voloRefreshNonce,
    setSelectedVoloTask: listState.setSelectedVoloTask
  })
  const voloQueueRepoId = listState.preferredVoloQueueRepoId ?? resolvedQueueRepoId
  const voloWorkQueue = useVoloWorkQueue(voloQueueRepoId)
  const {
    handleUseVoloItem,
    handleStartVoloTasks,
    voloLaunching,
    pendingQueueTasks,
    setPendingQueueTasks,
    confirmVoloQueueTarget,
    suggestedQueueRepoId
  } = useTaskPageVoloActions({
    voloTaskSourceContext,
    repoSelection,
    setPreferredVoloQueueRepoId: listState.setPreferredVoloQueueRepoId
  })
  const openVoloDetailPage = useCallback(
    (task: VoloTask) => {
      listState.setSelectedVoloTask(task)
    },
    [listState]
  )
  const visibleVoloColumnIds =
    listState.selectedVoloBoardId == null
      ? null
      : (listState.visibleColumnIdsByBoard[listState.selectedVoloBoardId] ?? null)
  const setVisibleVoloColumnIds = useCallback(
    (columnIds: string[] | null) => {
      if (!listState.selectedVoloBoardId) {
        return
      }
      listState.setVisibleColumnIds(listState.selectedVoloBoardId, columnIds)
    },
    [listState]
  )

  const nextModel = model as typeof model & {
    voloPresets: typeof voloPresets
    voloConnectOpen: typeof voloConnectOpen
    setVoloConnectOpen: typeof setVoloConnectOpen
    hideTaskSource: typeof hideTaskSource
    closeTaskDetailPage: typeof closeTaskDetailPage
    handleUseVoloItem: typeof handleUseVoloItem
    handleStartVoloTasks: typeof handleStartVoloTasks
    voloLaunching: typeof voloLaunching
    openVoloDetailPage: typeof openVoloDetailPage
    moveSelectedVoloTask: typeof moveSelectedVoloTask
    voloDetailSourceContext: typeof voloTaskSourceContext
    visibleVoloColumnIds: typeof visibleVoloColumnIds
    setVisibleVoloColumnIds: typeof setVisibleVoloColumnIds
    voloWorkQueue: typeof voloWorkQueue
    pendingQueueTasks: typeof pendingQueueTasks
    setPendingQueueTasks: typeof setPendingQueueTasks
    confirmVoloQueueTarget: typeof confirmVoloQueueTarget
    suggestedQueueRepoId: typeof suggestedQueueRepoId
  } & typeof listState
  Object.assign(nextModel, listState)
  nextModel.voloPresets = voloPresets
  nextModel.voloConnectOpen = voloConnectOpen
  nextModel.setVoloConnectOpen = setVoloConnectOpen
  nextModel.hideTaskSource = hideTaskSource
  nextModel.closeTaskDetailPage = closeTaskDetailPage
  nextModel.handleUseVoloItem = handleUseVoloItem
  nextModel.handleStartVoloTasks = handleStartVoloTasks
  nextModel.voloLaunching = voloLaunching
  nextModel.openVoloDetailPage = openVoloDetailPage
  nextModel.moveSelectedVoloTask = moveSelectedVoloTask
  nextModel.voloDetailSourceContext = voloTaskSourceContext
  nextModel.visibleVoloColumnIds = visibleVoloColumnIds
  nextModel.setVisibleVoloColumnIds = setVisibleVoloColumnIds
  nextModel.voloWorkQueue = voloWorkQueue
  nextModel.pendingQueueTasks = pendingQueueTasks
  nextModel.setPendingQueueTasks = setPendingQueueTasks
  nextModel.confirmVoloQueueTarget = confirmVoloQueueTarget
  nextModel.suggestedQueueRepoId = suggestedQueueRepoId
  nextModel.taskPageListChromeHidden = shouldHideTaskPageListChrome({
    taskSource,
    hasGitHubDetail: Boolean(model.dialogWorkItem),
    hasGitLabDetail: Boolean(model.gitlabDialogItem),
    hasJiraDetail: Boolean(model.selectedJiraIssue),
    hasVoloDetail: Boolean(listState.selectedVoloTask),
    hasLinearIssueDetail: Boolean(model.selectedLinearIssue),
    hasLinearProjectContext: Boolean(model.selectedLinearProject),
    hasLinearViewContext: Boolean(model.selectedLinearCustomView)
  })
  return nextModel
}

export type TaskPageVoloStageModel = ReturnType<typeof useTaskPageVoloStage>

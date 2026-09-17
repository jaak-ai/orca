import { useCallback, useState } from 'react'
import { getVoloPresets } from '@/components/task-page-localized-options'
import { useTaskPageVoloActions } from './use-task-page-volo-actions'
import { useTaskPageVoloFetch } from './use-task-page-volo-fetch'
import { useTaskPageVoloListState } from './use-task-page-volo-list-state'
import type { TaskPageComposerActionsModel } from './use-task-page-composer-actions'
import type { VoloTask } from '../../../shared/volo-types'

export function useTaskPageVoloStage(model: TaskPageComposerActionsModel) {
  const {
    taskSource,
    voloConnected,
    settings,
    voloTaskSourceContext,
    openModal,
    hideTaskSource,
    closeTaskDetailPage
  } = model
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
  const { handleUseVoloItem } = useTaskPageVoloActions({
    voloTaskSourceContext,
    openModal
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
    openVoloDetailPage: typeof openVoloDetailPage
    moveSelectedVoloTask: typeof moveSelectedVoloTask
    voloDetailSourceContext: typeof voloTaskSourceContext
    visibleVoloColumnIds: typeof visibleVoloColumnIds
    setVisibleVoloColumnIds: typeof setVisibleVoloColumnIds
  } & typeof listState
  Object.assign(nextModel, listState)
  nextModel.voloPresets = voloPresets
  nextModel.voloConnectOpen = voloConnectOpen
  nextModel.setVoloConnectOpen = setVoloConnectOpen
  nextModel.hideTaskSource = hideTaskSource
  nextModel.closeTaskDetailPage = closeTaskDetailPage
  nextModel.handleUseVoloItem = handleUseVoloItem
  nextModel.openVoloDetailPage = openVoloDetailPage
  nextModel.moveSelectedVoloTask = moveSelectedVoloTask
  nextModel.voloDetailSourceContext = voloTaskSourceContext
  nextModel.visibleVoloColumnIds = visibleVoloColumnIds
  nextModel.setVisibleVoloColumnIds = setVisibleVoloColumnIds
  return nextModel
}

export type TaskPageVoloStageModel = ReturnType<typeof useTaskPageVoloStage>

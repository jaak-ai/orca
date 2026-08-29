import { useCallback } from 'react'
import { useAppStore } from '@/store'
import {
  DEFAULT_VOLO_BOARD_VIEW,
  isVoloColumnVisible,
  type VoloBoardViewPreferences
} from '../../../../../shared/volo-types'

export type VoloBoardPreferences = {
  selectedBoardId: string | null
  visibleColumnIdsByBoard: Record<string, string[]>
  /** Persists immediately through updateSettings. */
  selectBoard: (boardId: string | null) => void
  /** null restores "every column visible" for that board. */
  setVisibleColumnIds: (boardId: string, columnIds: string[] | null) => void
  isColumnVisible: (boardId: string, columnId: string) => boolean
}

// Why: read at call time, not from a captured render value, so rapid successive writes never persist a stale sibling field.
function currentView(): VoloBoardViewPreferences {
  return useAppStore.getState().settings?.voloBoardView ?? DEFAULT_VOLO_BOARD_VIEW
}

export function useVoloBoardPreferences(): VoloBoardPreferences {
  const view = useAppStore((s) => s.settings?.voloBoardView) ?? DEFAULT_VOLO_BOARD_VIEW
  const updateSettings = useAppStore((s) => s.updateSettings)

  const selectBoard = useCallback(
    (boardId: string | null): void => {
      void updateSettings({ voloBoardView: { ...currentView(), selectedBoardId: boardId } })
    },
    [updateSettings]
  )

  const setVisibleColumnIds = useCallback(
    (boardId: string, columnIds: string[] | null): void => {
      const current = currentView()
      const visibleColumnIdsByBoard = { ...current.visibleColumnIdsByBoard }
      if (columnIds === null) {
        delete visibleColumnIdsByBoard[boardId]
      } else {
        visibleColumnIdsByBoard[boardId] = [...columnIds]
      }
      void updateSettings({ voloBoardView: { ...current, visibleColumnIdsByBoard } })
    },
    [updateSettings]
  )

  const isColumnVisible = useCallback(
    (boardId: string, columnId: string): boolean => isVoloColumnVisible(view, boardId, columnId),
    [view]
  )

  return {
    selectedBoardId: view.selectedBoardId,
    visibleColumnIdsByBoard: view.visibleColumnIdsByBoard,
    selectBoard,
    setVisibleColumnIds,
    isColumnVisible
  }
}

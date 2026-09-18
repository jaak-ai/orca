import { useCallback, useEffect, useMemo, useState } from 'react'
import type { VoloBoard, VoloTask, VoloTaskFilter } from '../../../shared/volo-types'
import { filterDisplayedVoloTasks } from '@/components/task-page/volo/volo-task-list-filter'
import { useVoloBoardPreferences } from './use-volo-board-preferences'

export function useTaskPageVoloListState() {
  const {
    selectedBoardId: selectedVoloBoardId,
    selectBoard: setSelectedVoloBoardId,
    visibleColumnIdsByBoard,
    setVisibleColumnIds,
    isColumnVisible
  } = useVoloBoardPreferences()
  const [voloBoards, setVoloBoards] = useState<VoloBoard[]>([])
  const [voloBoardsLoading, setVoloBoardsLoading] = useState(false)
  const [voloTasks, setVoloTasks] = useState<VoloTask[]>([])
  const [voloLoading, setVoloLoading] = useState(false)
  const [voloError, setVoloError] = useState<string | null>(null)
  const [voloSearchInput, setVoloSearchInput] = useState('')
  const [activeVoloPreset, setActiveVoloPreset] = useState<VoloTaskFilter>('assigned')
  const [voloRefreshNonce, setVoloRefreshNonce] = useState(0)
  const [selectedVoloTask, setSelectedVoloTask] = useState<VoloTask | null>(null)
  const [selectedVoloTaskIds, setSelectedVoloTaskIds] = useState<ReadonlySet<string>>(
    () => new Set()
  )
  const [newVoloTaskOpen, setNewVoloTaskOpen] = useState(false)
  const [preferredVoloQueueRepoId, setPreferredVoloQueueRepoId] = useState<string | null>(null)

  const selectedVoloBoard = useMemo(
    () => voloBoards.find((board) => board.id === selectedVoloBoardId) ?? null,
    [selectedVoloBoardId, voloBoards]
  )

  const displayedVoloTasks = useMemo(
    () =>
      filterDisplayedVoloTasks({
        tasks: voloTasks,
        selectedBoardId: selectedVoloBoardId,
        view: { selectedBoardId: selectedVoloBoardId, visibleColumnIdsByBoard },
        search: voloSearchInput
      }),
    [selectedVoloBoardId, visibleColumnIdsByBoard, voloSearchInput, voloTasks]
  )

  useEffect(() => {
    if (activeVoloPreset === 'assigned') {
      return
    }
    if (selectedVoloBoardId) {
      return
    }
    const firstBoardId = voloBoards[0]?.id
    if (firstBoardId) {
      setSelectedVoloBoardId(firstBoardId)
    }
  }, [activeVoloPreset, selectedVoloBoardId, setSelectedVoloBoardId, voloBoards])

  useEffect(() => {
    const visibleIds = new Set(displayedVoloTasks.map((task) => task.id))
    setSelectedVoloTaskIds((current) => {
      let changed = false
      const next = new Set<string>()
      for (const id of current) {
        if (visibleIds.has(id)) {
          next.add(id)
        } else {
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [displayedVoloTasks])

  const toggleVoloTaskSelected = useCallback((taskId: string, selected: boolean): void => {
    setSelectedVoloTaskIds((current) => {
      const next = new Set(current)
      if (selected) {
        next.add(taskId)
      } else {
        next.delete(taskId)
      }
      return next
    })
  }, [])

  const setAllDisplayedVoloTasksSelected = useCallback(
    (selected: boolean): void => {
      setSelectedVoloTaskIds(
        selected ? new Set(displayedVoloTasks.map((task) => task.id)) : new Set()
      )
    },
    [displayedVoloTasks]
  )

  const clearVoloTaskSelection = useCallback((taskIds: readonly string[]): void => {
    setSelectedVoloTaskIds((current) => {
      if (taskIds.length === 0) {
        return current
      }
      const remove = new Set(taskIds)
      const next = new Set<string>()
      for (const id of current) {
        if (!remove.has(id)) {
          next.add(id)
        }
      }
      return next
    })
  }, [])

  return {
    voloBoards,
    setVoloBoards,
    voloBoardsLoading,
    setVoloBoardsLoading,
    selectedVoloBoardId,
    setSelectedVoloBoardId,
    visibleColumnIdsByBoard,
    setVisibleColumnIds,
    isColumnVisible,
    selectedVoloBoard,
    voloTasks,
    setVoloTasks,
    voloLoading,
    setVoloLoading,
    voloError,
    setVoloError,
    voloSearchInput,
    setVoloSearchInput,
    activeVoloPreset,
    setActiveVoloPreset,
    voloRefreshNonce,
    setVoloRefreshNonce,
    selectedVoloTask,
    setSelectedVoloTask,
    selectedVoloTaskIds,
    toggleVoloTaskSelected,
    setAllDisplayedVoloTasksSelected,
    clearVoloTaskSelection,
    displayedVoloTasks,
    newVoloTaskOpen,
    setNewVoloTaskOpen,
    preferredVoloQueueRepoId,
    setPreferredVoloQueueRepoId
  }
}

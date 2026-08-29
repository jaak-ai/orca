import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { voloListBoards, voloListTasks, voloMoveTask } from '@/runtime/runtime-volo-client'
import type { GlobalSettings } from '../../../../../shared/global-settings-types'
import type { TaskProvider } from '../../../../../shared/task-providers'
import type { TaskSourceContext } from '../../../../../shared/task-source-context'
import type { VoloBoard, VoloTask, VoloTaskFilter } from '../../../../../shared/volo-types'

export function useTaskPageVoloFetch({
  taskSource,
  voloConnected,
  settings,
  voloTaskSourceContext,
  selectedVoloBoardId,
  setSelectedVoloBoardId,
  setVoloBoards,
  setVoloBoardsLoading,
  setVoloTasks,
  setVoloLoading,
  setVoloError,
  activeVoloPreset,
  voloRefreshNonce,
  setSelectedVoloTask
}: {
  taskSource: TaskProvider
  voloConnected: boolean
  settings: GlobalSettings | null
  voloTaskSourceContext: TaskSourceContext | null
  selectedVoloBoardId: string | null
  setSelectedVoloBoardId: (boardId: string | null) => void
  setVoloBoards: Dispatch<SetStateAction<VoloBoard[]>>
  setVoloBoardsLoading: Dispatch<SetStateAction<boolean>>
  setVoloTasks: Dispatch<SetStateAction<VoloTask[]>>
  setVoloLoading: Dispatch<SetStateAction<boolean>>
  setVoloError: Dispatch<SetStateAction<string | null>>
  activeVoloPreset: VoloTaskFilter
  voloRefreshNonce: number
  setSelectedVoloTask: Dispatch<SetStateAction<VoloTask | null>>
}): {
  moveSelectedVoloTask: (task: VoloTask, columnId: string) => Promise<void>
} {
  const runtimeSettings = voloTaskSourceContext ?? settings
  const selectedVoloBoardIdRef = useRef(selectedVoloBoardId)
  selectedVoloBoardIdRef.current = selectedVoloBoardId

  useEffect(() => {
    if (taskSource !== 'volo' || !voloConnected) {
      return
    }
    let cancelled = false
    setVoloBoardsLoading(true)
    void voloListBoards(runtimeSettings)
      .then((boards) => {
        if (cancelled) {
          return
        }
        setVoloBoards(boards)
        // Why: selectBoard is not a functional setter; a ref avoids refetching boards on selection change.
        const current = selectedVoloBoardIdRef.current
        const next =
          current && boards.some((board) => board.id === current)
            ? current
            : (boards[0]?.id ?? null)
        if (next !== current) {
          setSelectedVoloBoardId(next)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setVoloError(error instanceof Error ? error.message : 'Could not load Volo boards.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setVoloBoardsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [
    runtimeSettings,
    setSelectedVoloBoardId,
    setVoloBoards,
    setVoloBoardsLoading,
    setVoloError,
    taskSource,
    voloConnected,
    voloRefreshNonce
  ])

  // Why: column visibility is a client filter; it must not appear in these deps or toggles refetch.
  useEffect(() => {
    if (taskSource !== 'volo' || !voloConnected) {
      return
    }
    // Why: assigned is cross-board and can load with no selection; all/done wait for a board.
    if (activeVoloPreset !== 'assigned' && !selectedVoloBoardId) {
      return
    }
    let cancelled = false
    setVoloLoading(true)
    setVoloError(null)
    void voloListTasks(runtimeSettings, selectedVoloBoardId ?? '', activeVoloPreset)
      .then((tasks) => {
        if (cancelled) {
          return
        }
        setVoloTasks(tasks)
        setSelectedVoloTask((current) =>
          current ? (tasks.find((task) => task.id === current.id) ?? current) : current
        )
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setVoloError(error instanceof Error ? error.message : 'Could not load Volo tasks.')
          setVoloTasks([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setVoloLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [
    activeVoloPreset,
    runtimeSettings,
    selectedVoloBoardId,
    setSelectedVoloTask,
    setVoloError,
    setVoloLoading,
    setVoloTasks,
    taskSource,
    voloConnected,
    voloRefreshNonce
  ])

  return {
    moveSelectedVoloTask: async (task, columnId) => {
      const result = await voloMoveTask(runtimeSettings, task.boardId, task.id, columnId)
      if (!result.ok) {
        throw new Error(result.error)
      }
      setSelectedVoloTask((current) =>
        current?.id === task.id ? { ...current, columnId } : current
      )
    }
  }
}

import type { VoloBoardViewPreferences, VoloTask } from '../../../../../shared/volo-types'
import { filterVoloTasksByVisibleColumns } from './volo-column-visibility'

export const VOLO_ALL_BOARDS_VALUE = '__all__'

function voloTaskMatchesSearch(task: VoloTask, query: string): boolean {
  const fields = [
    task.taskCode,
    task.title,
    task.description,
    task.boardName,
    task.boardPrefix,
    task.columnName,
    task.assigneeName
  ]
  return fields.some((value) => value?.toLowerCase().includes(query))
}

export function filterDisplayedVoloTasks(args: {
  tasks: readonly VoloTask[]
  selectedBoardId: string | null
  view: VoloBoardViewPreferences
  search: string
}): VoloTask[] {
  const boardScoped = args.selectedBoardId
    ? args.tasks.filter((task) => task.boardId === args.selectedBoardId)
    : args.tasks
  const columnFiltered = filterVoloTasksByVisibleColumns(boardScoped, args.view)
  const query = args.search.trim().toLowerCase()
  if (!query) {
    return columnFiltered
  }
  return columnFiltered.filter((task) => voloTaskMatchesSearch(task, query))
}

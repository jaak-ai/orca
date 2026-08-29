import {
  isVoloColumnVisible,
  type VoloBoardViewPreferences,
  type VoloTask
} from '../../../../../shared/volo-types'

export function filterVoloTasksByVisibleColumns(
  tasks: readonly VoloTask[],
  view: VoloBoardViewPreferences
): VoloTask[] {
  return tasks.filter((task) => isVoloColumnVisible(view, task.boardId, task.columnId))
}

import { describe, expect, it } from 'vitest'
import { DEFAULT_VOLO_BOARD_VIEW, type VoloTask } from '../../../../../shared/volo-types'
import { filterDisplayedVoloTasks } from './volo-task-list-filter'

function task(
  overrides: Pick<VoloTask, 'id' | 'boardId' | 'columnId'> & Partial<VoloTask>
): VoloTask {
  return {
    taskCode: overrides.id,
    title: overrides.id,
    url: 'https://volo.example/t',
    priority: 'medium',
    inKanban: true,
    order: 0,
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

const todo = task({
  id: 't-todo',
  boardId: 'board-a',
  columnId: 'col-todo',
  taskCode: 'TO-1',
  title: 'Fix filters',
  boardName: 'Orca',
  boardPrefix: 'TO',
  columnName: 'Todo',
  assigneeName: 'Javi'
})
const doing = task({
  id: 't-doing',
  boardId: 'board-a',
  columnId: 'col-doing',
  taskCode: 'TO-2',
  title: 'Start work',
  boardName: 'Orca',
  columnName: 'Doing'
})
const otherBoard = task({
  id: 't-other',
  boardId: 'board-b',
  columnId: 'col-inbox',
  taskCode: 'INF-9',
  title: 'Cluster smoke',
  boardName: 'Infra',
  columnName: 'Inbox',
  assigneeName: 'Ops'
})

describe('filterDisplayedVoloTasks', () => {
  it('keeps every board when no board is selected', () => {
    expect(
      filterDisplayedVoloTasks({
        tasks: [todo, doing, otherBoard],
        selectedBoardId: null,
        view: DEFAULT_VOLO_BOARD_VIEW,
        search: ''
      })
    ).toEqual([todo, doing, otherBoard])
  })

  it('scopes assigned tasks to the selected board', () => {
    expect(
      filterDisplayedVoloTasks({
        tasks: [todo, doing, otherBoard],
        selectedBoardId: 'board-a',
        view: DEFAULT_VOLO_BOARD_VIEW,
        search: ''
      })
    ).toEqual([todo, doing])
  })

  it('applies column visibility after the board scope', () => {
    expect(
      filterDisplayedVoloTasks({
        tasks: [todo, doing, otherBoard],
        selectedBoardId: 'board-a',
        view: {
          selectedBoardId: 'board-a',
          visibleColumnIdsByBoard: { 'board-a': ['col-doing'] }
        },
        search: ''
      })
    ).toEqual([doing])
  })

  it('does not let another board’s column prefs hide All-boards tasks', () => {
    expect(
      filterDisplayedVoloTasks({
        tasks: [todo, otherBoard],
        selectedBoardId: null,
        view: {
          selectedBoardId: null,
          visibleColumnIdsByBoard: { 'board-a': ['col-doing'] }
        },
        search: ''
      })
    ).toEqual([otherBoard])
  })

  it('searches code, title, board, column, and assignee', () => {
    const tasks = [todo, doing, otherBoard]
    const view = DEFAULT_VOLO_BOARD_VIEW
    expect(
      filterDisplayedVoloTasks({ tasks, selectedBoardId: null, view, search: 'infra' }).map(
        (item) => item.id
      )
    ).toEqual(['t-other'])
    expect(
      filterDisplayedVoloTasks({ tasks, selectedBoardId: null, view, search: 'javi' }).map(
        (item) => item.id
      )
    ).toEqual(['t-todo'])
    expect(
      filterDisplayedVoloTasks({ tasks, selectedBoardId: null, view, search: 'doing' }).map(
        (item) => item.id
      )
    ).toEqual(['t-doing'])
    expect(
      filterDisplayedVoloTasks({ tasks, selectedBoardId: 'board-a', view, search: 'cluster' })
    ).toEqual([])
  })

  it('does not mutate the input list', () => {
    const tasks = [todo, otherBoard]
    filterDisplayedVoloTasks({
      tasks,
      selectedBoardId: 'board-a',
      view: DEFAULT_VOLO_BOARD_VIEW,
      search: 'missing'
    })
    expect(tasks).toEqual([todo, otherBoard])
  })
})

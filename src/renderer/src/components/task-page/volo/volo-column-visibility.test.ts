import { describe, expect, it } from 'vitest'
import { DEFAULT_VOLO_BOARD_VIEW, type VoloTask } from '../../../../../shared/volo-types'
import { filterVoloTasksByVisibleColumns } from './volo-column-visibility'

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

describe('filterVoloTasksByVisibleColumns', () => {
  const todo = task({ id: 't-todo', boardId: 'board-a', columnId: 'col-todo' })
  const doing = task({ id: 't-doing', boardId: 'board-a', columnId: 'col-doing' })
  const done = task({ id: 't-done', boardId: 'board-a', columnId: 'col-done' })
  const otherBoard = task({ id: 't-other', boardId: 'board-b', columnId: 'col-inbox' })

  it('keeps every task when no board has a stored column preference', () => {
    expect(
      filterVoloTasksByVisibleColumns([todo, doing, done, otherBoard], DEFAULT_VOLO_BOARD_VIEW)
    ).toEqual([todo, doing, done, otherBoard])
  })

  it('keeps only the stored columns for a board and leaves other boards unfiltered', () => {
    expect(
      filterVoloTasksByVisibleColumns([todo, doing, done, otherBoard], {
        selectedBoardId: 'board-a',
        visibleColumnIdsByBoard: { 'board-a': ['col-doing', 'col-done'] }
      })
    ).toEqual([doing, done, otherBoard])
  })

  it('hides every task on a board whose stored list is empty', () => {
    expect(
      filterVoloTasksByVisibleColumns([todo, doing, otherBoard], {
        selectedBoardId: 'board-a',
        visibleColumnIdsByBoard: { 'board-a': [] }
      })
    ).toEqual([otherBoard])
  })

  it('applies per-board visibility so assigned tasks from other boards stay visible', () => {
    const assignedOnB = task({ id: 't-assigned-b', boardId: 'board-b', columnId: 'col-review' })
    expect(
      filterVoloTasksByVisibleColumns([todo, doing, assignedOnB], {
        selectedBoardId: 'board-a',
        visibleColumnIdsByBoard: { 'board-a': ['col-todo'] }
      })
    ).toEqual([todo, assignedOnB])
  })

  it('does not mutate the input list', () => {
    const tasks = [todo, doing]
    const filtered = filterVoloTasksByVisibleColumns(tasks, {
      selectedBoardId: 'board-a',
      visibleColumnIdsByBoard: { 'board-a': ['col-todo'] }
    })
    expect(filtered).toEqual([todo])
    expect(tasks).toEqual([todo, doing])
  })
})

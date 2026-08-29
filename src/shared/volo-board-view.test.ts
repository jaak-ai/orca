import { describe, expect, it } from 'vitest'
import { DEFAULT_VOLO_BOARD_VIEW, isVoloColumnVisible, normalizeVoloBoardView } from './volo-types'

describe('normalizeVoloBoardView', () => {
  it('returns the default shape for undefined, null, and non-object input', () => {
    for (const value of [undefined, null, 42, 'board', true, ['b1']]) {
      expect(normalizeVoloBoardView(value)).toEqual({
        selectedBoardId: null,
        visibleColumnIdsByBoard: {}
      })
    }
  })

  it('never returns the shared default constant', () => {
    expect(normalizeVoloBoardView(undefined)).not.toBe(DEFAULT_VOLO_BOARD_VIEW)
  })

  it('drops a non-string selectedBoardId', () => {
    expect(normalizeVoloBoardView({ selectedBoardId: 7 }).selectedBoardId).toBeNull()
    expect(normalizeVoloBoardView({ selectedBoardId: 'b1' }).selectedBoardId).toBe('b1')
  })

  it('replaces a non-object visibleColumnIdsByBoard with an empty map', () => {
    for (const map of [null, 3, 'x', ['c1']]) {
      expect(
        normalizeVoloBoardView({ selectedBoardId: 'b1', visibleColumnIdsByBoard: map })
      ).toEqual({ selectedBoardId: 'b1', visibleColumnIdsByBoard: {} })
    }
  })

  it('drops board entries whose value is not an array and filters non-string ids', () => {
    const result = normalizeVoloBoardView({
      visibleColumnIdsByBoard: {
        good: ['c1', 'c2'],
        mixed: ['c1', 7, null, 'c2'],
        bad: 'c1',
        alsoBad: { c1: true }
      }
    })
    expect(result.visibleColumnIdsByBoard).toEqual({
      good: ['c1', 'c2'],
      mixed: ['c1', 'c2']
    })
  })

  it('preserves an empty array as "no columns visible", not "all"', () => {
    const result = normalizeVoloBoardView({ visibleColumnIdsByBoard: { b1: [] } })
    expect(result.visibleColumnIdsByBoard).toEqual({ b1: [] })
    expect(isVoloColumnVisible(result, 'b1', 'c1')).toBe(false)
  })

  it('ignores a __proto__ board key without polluting Object.prototype', () => {
    const result = normalizeVoloBoardView(
      JSON.parse('{"visibleColumnIdsByBoard":{"__proto__":["c1"]}}')
    )
    expect(result.visibleColumnIdsByBoard).toEqual({})
    expect(({} as Record<string, unknown>)['c1']).toBeUndefined()
  })
})

describe('isVoloColumnVisible', () => {
  const view = normalizeVoloBoardView({
    visibleColumnIdsByBoard: { b1: ['c1', 'c2'], empty: [] }
  })

  it('shows every column for a board without a stored entry', () => {
    expect(isVoloColumnVisible(view, 'unknown-board', 'anything')).toBe(true)
  })

  it('shows only listed columns for a board with an entry', () => {
    expect(isVoloColumnVisible(view, 'b1', 'c1')).toBe(true)
    expect(isVoloColumnVisible(view, 'b1', 'c3')).toBe(false)
  })

  it('hides every column for a board stored with an empty array', () => {
    expect(isVoloColumnVisible(view, 'empty', 'c1')).toBe(false)
  })

  it('treats inherited object keys as "no entry"', () => {
    expect(isVoloColumnVisible(view, 'constructor', 'c1')).toBe(true)
  })
})

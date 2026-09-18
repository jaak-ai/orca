// @vitest-environment happy-dom

import React, { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoverableRenderErrorBoundary } from './error-boundaries/RecoverableRenderErrorBoundary'
import { useAppStore } from '@/store'
import { emptyVoloWorkQueue, enqueueVoloWorkQueueItems } from '../../../shared/volo-work-queue'
import { selectVoloRepoQueue, useVoloWorkQueue } from './use-volo-work-queue'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Probe({ repoId }: { repoId: string | null }): React.JSX.Element {
  const { queue, activeCount } = useVoloWorkQueue(repoId)
  return (
    <div>{`${queue.repoId}:${queue.items.length}:${String(queue.dispatching)}:${activeCount}`}</div>
  )
}

describe('useVoloWorkQueue selector stability', () => {
  let container: HTMLDivElement
  let root: Root
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState(), true)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    consoleError.mockRestore()
    useAppStore.setState(useAppStore.getInitialState(), true)
  })

  it('reuses the same empty snapshot when the repo has no stored queue', () => {
    expect(selectVoloRepoQueue({}, 'repo-1')).toBe(selectVoloRepoQueue(undefined, 'repo-1'))
    expect(selectVoloRepoQueue({}, null)).toBe(selectVoloRepoQueue(undefined, null))
    expect(selectVoloRepoQueue({}, 'repo-1')).not.toBe(selectVoloRepoQueue({}, 'repo-2'))
  })

  it('returns the stored queue object when one exists', () => {
    const stored = { ...emptyVoloWorkQueue('repo-1'), dispatching: true }
    expect(selectVoloRepoQueue({ 'repo-1': stored }, 'repo-1')).toBe(stored)
  })

  it('copies a frozen empty snapshot instead of mutating it', () => {
    const empty = selectVoloRepoQueue({}, 'repo-enqueue')
    const next = enqueueVoloWorkQueueItems(
      empty,
      [
        {
          id: 't1',
          taskCode: 'TO-1',
          title: 'One',
          url: 'https://volo.example/TO-1',
          boardId: 'b1',
          columnId: 'c1',
          priority: 'medium',
          inKanban: true,
          order: 0,
          updatedAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      1,
      () => 'q1'
    )
    expect(empty.items).toEqual([])
    expect(next).not.toBe(empty)
    expect(next.items).toHaveLength(1)
  })

  it('does not throw React #185 when Tasks mounts with no stored Volo queue', () => {
    act(() => {
      root.render(
        <RecoverableRenderErrorBoundary
          boundaryId="page.tasks"
          surface="page"
          reportAsCrash={false}
          title="The page hit an error."
          description="Retry the page."
        >
          <Probe repoId="repo-missing" />
        </RecoverableRenderErrorBoundary>
      )
    })

    expect(container.textContent).toBe('repo-missing:0:false:0')
    expect(
      consoleError.mock.calls.find(
        ([message, error]) =>
          message === '[page.tasks] render crash contained by boundary' &&
          error instanceof Error &&
          (error.message.includes('Maximum update depth exceeded') ||
            error.message.includes('Minified React error #185'))
      )
    ).toBeUndefined()

    act(() => {
      useAppStore.setState({
        agentStatusEpoch: useAppStore.getState().agentStatusEpoch + 1
      })
    })
    expect(container.textContent).toBe('repo-missing:0:false:0')
  })

  it('keeps a null repoId snapshot stable across unrelated store writes', () => {
    act(() => {
      root.render(<Probe repoId={null} />)
    })
    expect(container.textContent).toBe(':0:false:0')

    act(() => {
      useAppStore.setState({
        agentStatusEpoch: useAppStore.getState().agentStatusEpoch + 1
      })
    })
    expect(container.textContent).toBe(':0:false:0')
  })
})

import { describe, expect, it } from 'vitest'
import {
  buildVoloDirectCreateWorktreeOptions,
  getDirectLaunchWorkspaceSeedName
} from './launch-work-item-direct-linked'
import type { LaunchableWorkItem } from './launch-work-item-direct-types'

const voloItem: LaunchableWorkItem = {
  provider: 'volo',
  type: 'issue',
  number: null,
  title: 'Ship the filter',
  url: 'https://volo.example/TO-433',
  voloIdentifier: 'TO-433'
}

describe('getDirectLaunchWorkspaceSeedName', () => {
  it('keeps Linear seeds on the Linear identifier path', () => {
    expect(
      getDirectLaunchWorkspaceSeedName(
        {
          type: 'issue',
          number: null,
          title: 'Ship Linear parity',
          url: 'https://linear.app/acme/issue/ENG-42/ship-linear-parity',
          linearIdentifier: 'ENG-42'
        },
        null
      )
    ).toBe('eng-42-ship-linear-parity')
  })

  it('seeds Volo workspaces from the task code', () => {
    expect(getDirectLaunchWorkspaceSeedName(voloItem, { seedName: 'ignored' })).toBe(
      'to-433-ship-the-filter'
    )
  })

  it('uses an explicit workspace seed when present', () => {
    expect(
      getDirectLaunchWorkspaceSeedName(
        { ...voloItem, workspaceSeed: 'volo-pm-queue' },
        { seedName: 'ignored' }
      )
    ).toBe('volo-pm-queue')
  })
})

describe('buildVoloDirectCreateWorktreeOptions', () => {
  it('returns nothing for GitHub launches so positional createWorktree args stay exact', () => {
    expect(
      buildVoloDirectCreateWorktreeOptions({
        type: 'issue',
        number: 42,
        title: 'Fix',
        url: 'https://github.com/acme/repo/issues/42'
      })
    ).toBeUndefined()
  })

  it('attaches the Volo linked item only when a task code is present', () => {
    expect(
      buildVoloDirectCreateWorktreeOptions(voloItem, {
        kind: 'task-source',
        provider: 'volo',
        projectId: 'proj-1',
        hostId: 'local'
      })
    ).toEqual({
      linkedWorkItem: {
        provider: 'volo',
        type: 'issue',
        number: 0,
        title: 'Ship the filter',
        url: 'https://volo.example/TO-433',
        voloIdentifier: 'TO-433'
      },
      linkedTaskSourceContext: {
        kind: 'task-source',
        provider: 'volo',
        projectId: 'proj-1',
        hostId: 'local'
      }
    })
  })

  it('nests Volo workers under a PM parent worktree', () => {
    expect(buildVoloDirectCreateWorktreeOptions(voloItem, null, 'pm-wt')).toMatchObject({
      parentWorktreeId: 'pm-wt',
      linkedWorkItem: { voloIdentifier: 'TO-433' }
    })
  })
})

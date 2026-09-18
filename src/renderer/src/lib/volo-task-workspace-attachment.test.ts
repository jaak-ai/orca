import { describe, expect, it } from 'vitest'
import type { Worktree } from '../../../shared/worktree/types'
import {
  findVoloTaskWorkspaceAttachment,
  listActiveWorkspacesForRepo
} from './volo-task-workspace-attachment'

function worktree(overrides: Partial<Worktree> & Pick<Worktree, 'id'>): Worktree {
  return {
    repoId: 'repo-1',
    displayName: overrides.id,
    comment: '',
    path: `/repo/${overrides.id}`,
    head: 'abc',
    branch: 'main',
    isBare: false,
    isMainWorktree: false,
    isArchived: false,
    isUnread: false,
    isPinned: false,
    sortOrder: 0,
    lastActivityAt: 1,
    createdAt: 1,
    linkedIssue: null,
    linkedPR: null,
    linkedLinearIssue: null,
    linkedGitLabMR: null,
    linkedGitLabIssue: null,
    linkedBitbucketPR: null,
    linkedAzureDevOpsPR: null,
    linkedGiteaPR: null,
    ...overrides
  }
}

describe('findVoloTaskWorkspaceAttachment', () => {
  it('matches the most recently active workspace for a Volo id', () => {
    const older = worktree({
      id: 'older',
      lastActivityAt: 10,
      linkedWorkItem: {
        provider: 'volo',
        type: 'issue',
        number: 0,
        title: 'Filters',
        url: 'https://volo.example/TO-1',
        voloIdentifier: 'to-1'
      }
    })
    const newer = worktree({
      id: 'newer',
      lastActivityAt: 20,
      linkedWorkItem: {
        provider: 'volo',
        type: 'issue',
        number: 0,
        title: 'Filters',
        url: 'https://volo.example/TO-1',
        voloIdentifier: 'TO-1'
      }
    })
    const other = worktree({
      id: 'other',
      lastActivityAt: 30,
      linkedWorkItem: {
        provider: 'volo',
        type: 'issue',
        number: 0,
        title: 'Other',
        url: 'https://volo.example/TO-2',
        voloIdentifier: 'TO-2'
      }
    })
    const archived = worktree({
      id: 'archived',
      isArchived: true,
      lastActivityAt: 40,
      linkedWorkItem: {
        provider: 'volo',
        type: 'issue',
        number: 0,
        title: 'Filters',
        url: 'https://volo.example/TO-1',
        voloIdentifier: 'TO-1'
      }
    })

    expect(findVoloTaskWorkspaceAttachment([archived, older, other, newer], 'TO-1')?.id).toBe(
      'newer'
    )
  })

  it('returns null when the identifier is missing', () => {
    expect(findVoloTaskWorkspaceAttachment([], '  ')).toBeNull()
  })
})

describe('listActiveWorkspacesForRepo', () => {
  it('lists non-archived workspaces for the repo by recent activity', () => {
    const listed = listActiveWorkspacesForRepo(
      [
        worktree({ id: 'old', repoId: 'repo-1', displayName: 'Older', lastActivityAt: 1 }),
        worktree({ id: 'new', repoId: 'repo-1', displayName: 'Newer', lastActivityAt: 9 }),
        worktree({ id: 'other', repoId: 'repo-2', displayName: 'Other', lastActivityAt: 20 }),
        worktree({
          id: 'archived',
          repoId: 'repo-1',
          displayName: 'Gone',
          isArchived: true,
          lastActivityAt: 30
        })
      ],
      'repo-1'
    )
    expect(listed.map((entry) => entry.id)).toEqual(['new', 'old'])
  })
})

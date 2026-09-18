import type { Worktree } from '../../../shared/worktree/types'
import { parseWorkspaceKey } from '../../../shared/workspace-scope'
import {
  activateAndRevealFolderWorkspace,
  activateAndRevealWorktree
} from '@/lib/worktree-activation'

export function normalizeVoloIdentifier(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.toUpperCase() : null
}

export function findVoloTaskWorkspaceAttachment(
  worktrees: readonly Worktree[],
  voloIdentifier: string | null | undefined
): Worktree | null {
  const identifier = normalizeVoloIdentifier(voloIdentifier)
  if (!identifier) {
    return null
  }

  let best: Worktree | null = null
  for (const worktree of worktrees) {
    if (worktree.isArchived) {
      continue
    }
    if (normalizeVoloIdentifier(worktree.linkedWorkItem?.voloIdentifier) !== identifier) {
      continue
    }
    if (!best || worktree.lastActivityAt > best.lastActivityAt) {
      best = worktree
    }
  }
  return best
}

export function listActiveWorkspacesForRepo(
  worktrees: readonly Worktree[],
  repoId: string
): { id: string; label: string }[] {
  return worktrees
    .filter((worktree) => worktree.repoId === repoId && !worktree.isArchived)
    .slice()
    .sort((left, right) => right.lastActivityAt - left.lastActivityAt)
    .map((worktree) => ({
      id: worktree.id,
      label:
        worktree.displayName.trim() ||
        worktree.branch.replace(/^refs\/heads\//, '') ||
        worktree.path
    }))
}

export function activateVoloTaskWorkspace(worktree: Worktree): boolean {
  const workspaceScope = parseWorkspaceKey(worktree.id)
  const activation =
    workspaceScope?.type === 'folder'
      ? activateAndRevealFolderWorkspace(
          workspaceScope.folderWorkspaceId,
          worktree.hostId ? { executionHostId: worktree.hostId } : undefined
        )
      : activateAndRevealWorktree(
          worktree.id,
          worktree.hostId ? { executionHostId: worktree.hostId } : {}
        )
  return activation !== false
}

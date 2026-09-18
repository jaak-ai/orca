import type { CreateWorktreeCallOptions } from '@/store/slices/worktrees/create/worktree-create-payload'
import type { TaskSourceContext } from '../../../shared/task-source-context'
import {
  getLinearIssueWorkspaceName,
  getLinkedWorkItemWorkspaceName
} from '../../../shared/workspace-name'
import type { LaunchableWorkItem } from './launch-work-item-direct-types'

export function getDirectLaunchWorkspaceSeedName(
  item: LaunchableWorkItem,
  workspaceIntentName: { seedName: string } | null
): string {
  if (item.workspaceSeed?.trim()) {
    return item.workspaceSeed.trim()
  }
  if (item.linearIdentifier) {
    return getLinearIssueWorkspaceName({
      identifier: item.linearIdentifier,
      title: item.title
    })
  }
  if (item.voloIdentifier) {
    return (
      getLinkedWorkItemWorkspaceName({
        type: item.type,
        number: item.number ?? 0,
        title: item.title,
        provider: 'volo',
        voloIdentifier: item.voloIdentifier
      })?.seedName ?? ''
    )
  }
  return workspaceIntentName?.seedName ?? ''
}

export function buildVoloDirectCreateWorktreeOptions(
  item: LaunchableWorkItem,
  linkedTaskSourceContext?: TaskSourceContext | null,
  parentWorktreeId?: string
): CreateWorktreeCallOptions | undefined {
  const voloIdentifier = item.voloIdentifier?.trim()
  const parentId = parentWorktreeId?.trim()
  if (!voloIdentifier && !parentId) {
    return undefined
  }
  return {
    ...(voloIdentifier
      ? {
          linkedWorkItem: {
            provider: 'volo' as const,
            type: item.type,
            number: item.number ?? 0,
            title: item.title,
            url: item.url,
            voloIdentifier
          }
        }
      : {}),
    ...(linkedTaskSourceContext ? { linkedTaskSourceContext } : {}),
    ...(parentId ? { parentWorktreeId: parentId } : {})
  }
}

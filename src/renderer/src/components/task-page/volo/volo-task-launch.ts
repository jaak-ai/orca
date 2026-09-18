import { buildContainedLinkedContextBlock } from '@/lib/linked-work-item-context'
import type { LaunchableWorkItem } from '@/lib/launch-work-item-direct-types'
import type { LinkedWorkItemSummary } from '@/lib/new-workspace'
import type { VoloTask } from '../../../../../shared/volo-types'
import { getRepoExecutionHostId, type ExecutionHostId } from '../../../../../shared/execution-host'
import type { Repo } from '../../../../../shared/repo-types'

export function resolveVoloLaunchRepoId(
  selectedRepoIds: ReadonlySet<string>,
  activeRepoId: string | null | undefined,
  options?: {
    repos?: readonly Pick<Repo, 'id' | 'connectionId' | 'executionHostId'>[]
    preferredHostId?: ExecutionHostId
  }
): string | null {
  if (selectedRepoIds.size === 0) {
    return null
  }
  const preferredHostId = options?.preferredHostId
  const repos = options?.repos
  if (preferredHostId && repos && repos.length > 0) {
    const onPreferredHost: string[] = []
    for (const repoId of selectedRepoIds) {
      const repo = repos.find((entry) => entry.id === repoId)
      if (repo && getRepoExecutionHostId(repo) === preferredHostId) {
        onPreferredHost.push(repoId)
      }
    }
    if (onPreferredHost.length === 1) {
      return onPreferredHost[0] ?? null
    }
    if (onPreferredHost.length > 1) {
      if (activeRepoId && onPreferredHost.includes(activeRepoId)) {
        return activeRepoId
      }
      return onPreferredHost[0] ?? null
    }
  }
  if (selectedRepoIds.size === 1) {
    return selectedRepoIds.values().next().value ?? null
  }
  if (activeRepoId && selectedRepoIds.has(activeRepoId)) {
    return activeRepoId
  }
  return selectedRepoIds.values().next().value ?? null
}

export function buildVoloLinkedWorkItem(task: VoloTask): LinkedWorkItemSummary {
  return {
    type: 'issue',
    provider: 'volo',
    number: 0,
    title: `${task.taskCode} ${task.title}`,
    url: task.url,
    voloIdentifier: task.taskCode
  }
}

export function buildVoloLaunchDraftContent(task: VoloTask): string {
  const trusted = `Complete this Volo task: ${task.taskCode}`
  const url = task.url.trim()
  const description = task.description?.trim() ?? ''
  const untrusted = buildContainedLinkedContextBlock({
    provider: 'volo',
    version: 1,
    renderedText: [
      `Title: ${task.title}`,
      ...(description ? ['Description:', description] : [])
    ].join('\n')
  })
  return `${[trusted, url, untrusted].filter(Boolean).join('\n\n')}\n`
}

export function buildVoloLaunchableWorkItem(task: VoloTask): LaunchableWorkItem {
  return {
    provider: 'volo',
    type: 'issue',
    number: null,
    title: task.title,
    url: task.url,
    voloIdentifier: task.taskCode,
    pasteContent: buildVoloLaunchDraftContent(task)
  }
}

import { buildContainedLinkedContextBlock } from '@/lib/linked-work-item-context'
import type { LaunchableWorkItem } from '@/lib/launch-work-item-direct-types'
import type { VoloWorkQueueItem } from '../../../../../shared/volo-work-queue'

export function buildVoloPmQueueDraftContent(items: readonly VoloWorkQueueItem[]): string {
  const pending = items.filter((item) => item.status === 'queued' || item.status === 'running')
  const codes = pending.map((item) => item.taskCode)
  const parallelCodes = pending.filter((item) => item.parallel).map((item) => item.taskCode)
  const trusted = [
    'You are the project manager coordinating this Volo queue in Orca.',
    'You appear in the Agents panel. Worker agents are your children.',
    'Do not implement the tasks yourself. Review, unblock, and decide sequencing.',
    'Orca starts workers in order. Parallel only when the user marked it or the work is independent.',
    'If two tasks share files or an unfinished spec, keep them sequential.',
    parallelCodes.length > 0
      ? `The user marked these as allowed to run in parallel: ${parallelCodes.join(', ')}.`
      : null,
    codes.length > 0 ? `Queue order: ${codes.join(', ')}.` : 'The queue is empty.'
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n')
  const untrusted = buildContainedLinkedContextBlock({
    provider: 'volo',
    version: 1,
    renderedText: pending
      .map((item) =>
        [`${item.taskCode}`, `Title: ${item.title}`, `URL: ${item.url}`, item.description ?? '']
          .filter(Boolean)
          .join('\n')
      )
      .join('\n\n')
  })
  return `${[trusted, untrusted].filter(Boolean).join('\n\n')}\n`
}

export function buildVoloPmLaunchableWorkItem(
  items: readonly VoloWorkQueueItem[]
): LaunchableWorkItem {
  return {
    provider: 'volo',
    type: 'issue',
    number: null,
    title: 'Volo PM',
    url: items[0]?.url ?? '',
    workspaceSeed: 'volo-pm-queue',
    pasteContent: buildVoloPmQueueDraftContent(items)
  }
}

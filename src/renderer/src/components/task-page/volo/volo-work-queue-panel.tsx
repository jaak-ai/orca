import type { JSX } from 'react'
import { LoaderCircle, Pause, Play, X } from 'lucide-react'
import { revealVoloPmCoordinator } from '@/lib/volo-work-queue-dispatch'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { translate } from '@/i18n/i18n'
import { cn } from '@/lib/utils'
import type { VoloWorkQueue, VoloWorkQueueItem } from '../../../../../shared/volo-work-queue'

export function VoloWorkQueuePanel({
  queue,
  setDispatching,
  setPmEnabled,
  setItemParallel,
  removeItem,
  clearFinished
}: {
  queue: VoloWorkQueue
  setDispatching: (dispatching: boolean) => void
  setPmEnabled: (pmEnabled: boolean) => void
  setItemParallel: (itemId: string, parallel: boolean) => void
  removeItem: (itemId: string) => void
  clearFinished: () => void
}): JSX.Element | null {
  if (queue.items.length === 0) {
    return null
  }
  const waiting = queue.items.filter((item) => item.status === 'queued').length
  const running = queue.items.filter((item) => item.status === 'running').length
  const finished = queue.items.filter(
    (item) => item.status === 'done' || item.status === 'failed'
  ).length

  return (
    <div className="rounded-md border border-border/50 bg-muted/50 px-3 py-2 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {translate('auto.components.TaskPage.voloWorkQueue', 'Work queue')}
          <span className="ml-2 font-normal normal-case tracking-normal">
            {waiting} {translate('auto.components.TaskPage.voloQueueWaiting', 'waiting')}
            {running > 0
              ? ` · ${running} ${translate('auto.components.TaskPage.voloQueueRunning', 'running')}`
              : ''}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-foreground">
            <Switch
              checked={queue.pmEnabled}
              onCheckedChange={(checked) => setPmEnabled(checked === true)}
              aria-label={translate('auto.components.TaskPage.voloPmParallel', 'PM in Agents')}
            />
            {translate('auto.components.TaskPage.voloPmParallel', 'PM in Agents')}
          </label>
          {queue.pmWorktreeId ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (queue.pmWorktreeId) {
                  revealVoloPmCoordinator(queue.pmWorktreeId)
                }
              }}
            >
              {translate('auto.components.TaskPage.voloViewPmInAgents', 'View PM')}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant={queue.dispatching ? 'outline' : 'default'}
            className="gap-1.5"
            onClick={() => setDispatching(!queue.dispatching)}
          >
            {queue.dispatching ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {queue.dispatching
              ? translate('auto.components.TaskPage.voloPauseQueue', 'Pause')
              : translate('auto.components.TaskPage.voloStartQueue', 'Start queue')}
          </Button>
          {finished > 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={clearFinished}>
              {translate('auto.components.TaskPage.voloClearFinished', 'Clear finished')}
            </Button>
          ) : null}
        </div>
      </div>
      <div className="mt-2 max-h-40 overflow-y-auto scrollbar-sleek divide-y divide-border/50">
        {queue.items.map((item) => (
          <QueueRow
            key={item.id}
            item={item}
            setItemParallel={setItemParallel}
            removeItem={removeItem}
          />
        ))}
      </div>
    </div>
  )
}

function QueueRow({
  item,
  setItemParallel,
  removeItem
}: {
  item: VoloWorkQueueItem
  setItemParallel: (itemId: string, parallel: boolean) => void
  removeItem: (itemId: string) => void
}): JSX.Element {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-foreground">
          <span className="font-medium text-muted-foreground">{item.taskCode}</span>
          <span className="mx-2 text-muted-foreground/60">·</span>
          {item.title}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
          {item.status === 'queued' || item.status === 'running' ? (
            <label className="flex items-center gap-1">
              <Checkbox
                checked={item.parallel}
                disabled={item.status === 'running'}
                onCheckedChange={(checked) => setItemParallel(item.id, checked === true)}
              />
              {translate('auto.components.TaskPage.voloQueueParallel', 'Parallel')}
            </label>
          ) : null}
        </div>
      </div>
      {item.status === 'running' ? (
        <LoaderCircle className="mt-1 size-3.5 shrink-0 animate-spin text-muted-foreground" />
      ) : item.status !== 'queued' ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => removeItem(item.id)}
          aria-label={translate('auto.components.TaskPage.voloQueueRemove', 'Remove from queue')}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

function statusLabel(status: VoloWorkQueueItem['status']): string {
  if (status === 'running') {
    return translate('auto.components.TaskPage.voloQueueStatusRunning', 'Running')
  }
  if (status === 'done') {
    return translate('auto.components.TaskPage.voloQueueStatusDone', 'Done')
  }
  if (status === 'failed') {
    return translate('auto.components.TaskPage.voloQueueStatusFailed', 'Failed')
  }
  return translate('auto.components.TaskPage.voloQueueStatusWaiting', 'Waiting')
}

function statusClass(status: VoloWorkQueueItem['status']): string {
  return cn(
    status === 'failed' && 'text-destructive',
    status === 'running' && 'text-foreground',
    (status === 'queued' || status === 'done') && 'text-muted-foreground'
  )
}

import React from 'react'
import { LoaderCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { VoloIcon } from '@/components/icons/VoloIcon'
import { translate } from '@/i18n/i18n'
import { formatRelativeTime } from '@/components/task-page-source-context'
import { VoloTaskWorkspace } from './volo-task-workspace'
import type { VoloBoard, VoloTask } from '../../../../../shared/volo-types'
import type { TaskProvider } from '../../../../../shared/task-providers'
import type { TaskSourceContext } from '../../../../../shared/task-source-context'
import { cn } from '@/lib/utils'

export type VoloTaskListHostProps = {
  voloStatusReady: boolean
  voloConnected: boolean
  setVoloConnectOpen: (open: boolean) => void
  hideTaskSource: (provider: TaskProvider, label: string) => void
  voloLoading: boolean
  voloError: string | null
  voloTasks: readonly VoloTask[]
  displayedVoloTasks: readonly VoloTask[]
  voloSearchInput: string
  selectedVoloTask: VoloTask | null
  selectedVoloBoard: VoloBoard | null
  selectedVoloTaskIds: ReadonlySet<string>
  toggleVoloTaskSelected: (taskId: string, selected: boolean) => void
  setAllDisplayedVoloTasksSelected: (selected: boolean) => void
  clearVoloTaskSelection: (taskIds: readonly string[]) => void
  openVoloDetailPage: (task: VoloTask) => void
  handleUseVoloItem: (task: VoloTask) => void
  handleStartVoloTasks: (tasks: readonly VoloTask[]) => Promise<string[]>
  voloLaunching: boolean
  closeTaskDetailPage: () => void
  voloDetailSourceContext: TaskSourceContext | null
  onMoveVoloTask: (task: VoloTask, columnId: string) => Promise<void>
}

function columnTone(type: string | undefined): string {
  if (type === 'done') {
    return 'text-muted-foreground'
  }
  if (type === 'in_progress') {
    return 'text-foreground'
  }
  return 'text-muted-foreground'
}

export function VoloTaskListHost({
  voloStatusReady,
  voloConnected,
  setVoloConnectOpen,
  hideTaskSource,
  voloLoading,
  voloError,
  voloTasks,
  displayedVoloTasks,
  voloSearchInput,
  selectedVoloTask,
  selectedVoloBoard,
  selectedVoloTaskIds,
  toggleVoloTaskSelected,
  setAllDisplayedVoloTasksSelected,
  clearVoloTaskSelection,
  openVoloDetailPage,
  handleUseVoloItem,
  handleStartVoloTasks,
  voloLaunching,
  closeTaskDetailPage,
  voloDetailSourceContext,
  onMoveVoloTask
}: VoloTaskListHostProps): React.JSX.Element {
  if (!voloStatusReady) {
    return (
      <div className="mt-4 flex items-center justify-center py-14">
        <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!voloConnected) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center rounded-md border border-border/50 bg-muted/50 px-6 py-14 text-center shadow-sm">
        <VoloIcon className="mb-4 size-8 text-muted-foreground/60" />
        <p className="text-base font-medium text-foreground">
          {translate('auto.components.TaskPage.voloConnectTitle', 'Connect Volo')}
        </p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {translate(
            'auto.components.TaskPage.voloConnectBody',
            'Browse boards, create tasks, and start workspaces from Volo without leaving Orca.'
          )}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <Button onClick={() => setVoloConnectOpen(true)}>
            {translate('auto.components.TaskPage.voloConnectButton', 'Connect Volo')}
          </Button>
          <Button variant="outline" onClick={() => hideTaskSource('volo', 'Volo')}>
            {translate('auto.components.TaskPage.voloHide', 'Hide Volo')}
          </Button>
        </div>
      </div>
    )
  }

  const selectedCount = displayedVoloTasks.filter((task) => selectedVoloTaskIds.has(task.id)).length
  const allVisibleSelected =
    displayedVoloTasks.length > 0 && selectedCount === displayedVoloTasks.length
  const someVisibleSelected = selectedCount > 0 && !allVisibleSelected

  return (
    <div className="flex min-h-0 max-h-full flex-col overflow-hidden rounded-md rounded-t-none border border-t-0 border-border/50 bg-background shadow-sm">
      <div className="flex h-10 flex-none items-center justify-between gap-3 border-b border-border/50 bg-muted/35 px-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <Checkbox
            checked={allVisibleSelected ? true : someVisibleSelected ? 'indeterminate' : false}
            disabled={displayedVoloTasks.length === 0 || voloLaunching}
            onCheckedChange={(checked) => setAllDisplayedVoloTasksSelected(checked === true)}
            aria-label={translate(
              'auto.components.TaskPage.voloSelectAllTasks',
              'Select all visible Volo tasks'
            )}
          />
          <span>{translate('auto.components.TaskPage.voloTasksHeader', 'Volo tasks')}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {selectedCount > 0 ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              disabled={voloLaunching}
              onClick={() => {
                const selectedTasks = displayedVoloTasks.filter((task) =>
                  selectedVoloTaskIds.has(task.id)
                )
                void handleStartVoloTasks(selectedTasks).then((completedIds) => {
                  clearVoloTaskSelection(completedIds)
                })
              }}
            >
              {voloLaunching ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {selectedCount === 1
                ? translate('auto.components.TaskPage.voloQueueSelectedOne', 'Queue 1 task')
                : translate(
                    'auto.components.TaskPage.voloQueueSelectedMany',
                    'Queue {{count}} tasks',
                    { count: selectedCount }
                  )}
            </Button>
          ) : null}
          <div className="text-[11px] text-muted-foreground">
            {displayedVoloTasks.length} {translate('auto.components.TaskPage.b7bae28b6a', 'shown')}
          </div>
        </div>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto scrollbar-sleek"
        style={{ scrollbarGutter: 'stable' }}
      >
        {voloError ? (
          <div className="border-b border-border px-4 py-4 text-sm text-destructive">
            {voloError}
          </div>
        ) : null}
        {voloLoading && voloTasks.length === 0 ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="px-3 py-3">
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
                <div className="mt-2 h-3 w-3/5 animate-pulse rounded bg-muted/60" />
              </div>
            ))}
          </div>
        ) : null}
        {!voloLoading && displayedVoloTasks.length === 0 && !voloError ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-medium text-foreground">
              {translate('auto.components.TaskPage.voloEmptyTitle', 'No Volo tasks found')}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {voloSearchInput
                ? translate(
                    'auto.components.TaskPage.voloEmptySearch',
                    'Try a different search query.'
                  )
                : translate(
                    'auto.components.TaskPage.voloEmptyPreset',
                    'No tasks match the selected board and filter.'
                  )}
            </p>
          </div>
        ) : null}
        <div className="divide-y divide-border/50">
          {displayedVoloTasks.map((task) => {
            const selected = selectedVoloTask?.id === task.id
            const checked = selectedVoloTaskIds.has(task.id)
            return (
              <div
                key={task.id}
                className={cn(
                  'flex w-full items-start gap-3 px-3 py-3 transition',
                  selected ? 'bg-accent' : 'hover:bg-accent'
                )}
              >
                <Checkbox
                  className="mt-1"
                  checked={checked}
                  disabled={voloLaunching}
                  onCheckedChange={(value) => toggleVoloTaskSelected(task.id, value === true)}
                  aria-label={translate(
                    'auto.components.TaskPage.voloSelectTask',
                    'Select {{code}}',
                    { code: task.taskCode }
                  )}
                />
                <button
                  type="button"
                  onClick={() => openVoloDetailPage(task)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-sm text-foreground">
                    <span className="font-medium text-muted-foreground">{task.taskCode}</span>
                    <span className="mx-2 text-muted-foreground/60">·</span>
                    {task.title}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {!selectedVoloBoard && task.boardName ? <span>{task.boardName}</span> : null}
                    <span className={columnTone(task.columnType)}>{task.columnName ?? '—'}</span>
                    {task.assigneeName ? <span>{task.assigneeName}</span> : null}
                    <span>{task.priority}</span>
                    <span>{formatRelativeTime(task.updatedAt)}</span>
                  </div>
                </button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={voloLaunching}
                  onClick={() => handleUseVoloItem(task)}
                >
                  {translate('auto.components.TaskPage.voloQueueTask', 'Queue')}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
      <VoloTaskWorkspace
        task={selectedVoloTask}
        board={selectedVoloBoard}
        onUse={handleUseVoloItem}
        launching={voloLaunching}
        onClose={closeTaskDetailPage}
        onMove={onMoveVoloTask}
        sourceContext={voloDetailSourceContext}
      />
    </div>
  )
}

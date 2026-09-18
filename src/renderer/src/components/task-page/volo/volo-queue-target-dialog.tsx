import { useEffect, useMemo, useState, type JSX } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { translate } from '@/i18n/i18n'
import { useAppStore } from '@/store'
import { folderWorkspaceToWorktree } from '../../../../../shared/folder-workspace-worktree'
import { listActiveWorkspacesForRepo } from '@/lib/volo-task-workspace-attachment'
import { resolveVoloLaunchRepoId } from './volo-task-launch'
import type { Repo } from '../../../../../shared/repo-types'
import type { VoloTask } from '../../../../../shared/volo-types'

export const VOLO_NEW_WORKSPACE_VALUE = '__new__'

export type VoloQueueTarget = {
  repoId: string
  targetWorktreeId?: string
}

export function VoloQueueTargetDialog({
  open,
  tasks,
  repos,
  suggestedRepoId,
  onOpenChange,
  onConfirm
}: {
  open: boolean
  tasks: readonly VoloTask[]
  repos: readonly Repo[]
  suggestedRepoId: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: (target: VoloQueueTarget) => void
}): JSX.Element {
  const worktreesByRepo = useAppStore((state) => state.worktreesByRepo)
  const folderWorkspaces = useAppStore((state) => state.folderWorkspaces)
  const [repoId, setRepoId] = useState<string | null>(suggestedRepoId)
  const [workspaceValue, setWorkspaceValue] = useState(VOLO_NEW_WORKSPACE_VALUE)

  const workspaces = useMemo(() => {
    if (!repoId) {
      return []
    }
    const git = worktreesByRepo[repoId] ?? []
    const folders = folderWorkspaces.map(folderWorkspaceToWorktree)
    return listActiveWorkspacesForRepo([...git, ...folders], repoId)
  }, [folderWorkspaces, repoId, worktreesByRepo])

  useEffect(() => {
    if (!open) {
      return
    }
    const nextRepo =
      suggestedRepoId && repos.some((repo) => repo.id === suggestedRepoId)
        ? suggestedRepoId
        : (repos[0]?.id ?? null)
    setRepoId(nextRepo)
    setWorkspaceValue(VOLO_NEW_WORKSPACE_VALUE)
  }, [open, repos, suggestedRepoId])

  useEffect(() => {
    if (
      workspaceValue !== VOLO_NEW_WORKSPACE_VALUE &&
      !workspaces.some((workspace) => workspace.id === workspaceValue)
    ) {
      setWorkspaceValue(VOLO_NEW_WORKSPACE_VALUE)
    }
  }, [workspaceValue, workspaces])

  const canConfirm = Boolean(repoId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {translate('auto.components.TaskPage.voloQueueTargetTitle', 'Queue to workspace')}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {tasks.length === 1
              ? translate(
                  'auto.components.TaskPage.voloQueueTargetOne',
                  'Choose the project and workspace for {{code}}.',
                  { code: tasks[0]?.taskCode ?? '' }
                )
              : translate(
                  'auto.components.TaskPage.voloQueueTargetMany',
                  'Choose the project and workspace for these {{count}} tasks.',
                  { count: tasks.length }
                )}
          </p>
          {tasks.length > 1 ? (
            <p className="truncate text-xs text-muted-foreground">
              {tasks.map((task) => task.taskCode).join(', ')}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label>{translate('auto.components.TaskPage.voloQueueProject', 'Project')}</Label>
            <Select
              value={repoId ?? undefined}
              onValueChange={(value) => {
                setRepoId(value)
                setWorkspaceValue(VOLO_NEW_WORKSPACE_VALUE)
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={translate(
                    'auto.components.TaskPage.voloQueueSelectProject',
                    'Select a project'
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                {repos.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{translate('auto.components.TaskPage.voloQueueWorkspace', 'Workspace')}</Label>
            <Select value={workspaceValue} onValueChange={setWorkspaceValue} disabled={!repoId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VOLO_NEW_WORKSPACE_VALUE}>
                  {translate('auto.components.TaskPage.voloQueueNewWorkspace', 'New workspace')}
                </SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {translate('auto.components.TaskPage.voloQueueCancel', 'Cancel')}
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              if (!repoId) {
                return
              }
              onConfirm({
                repoId,
                ...(workspaceValue === VOLO_NEW_WORKSPACE_VALUE
                  ? {}
                  : { targetWorktreeId: workspaceValue })
              })
            }}
          >
            {translate('auto.components.TaskPage.voloQueueConfirm', 'Queue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function suggestedVoloQueueRepoId(
  repoIds: ReadonlySet<string>,
  activeRepoId: string | null | undefined
): string | null {
  return resolveVoloLaunchRepoId(repoIds, activeRepoId)
}

import type { TaskPageVoloStageModel } from '../use-task-page-volo-stage'
import { VoloConnectDialog } from '@/components/volo-connect-dialog'
import { NewVoloTaskDialog } from './volo/new-volo-task-dialog'
import { VoloQueueTargetDialog } from './volo/volo-queue-target-dialog'
import { TaskPageFrame } from './Frame'
import { TaskPageGitHubIssueDialog } from './github/IssueDialog'
import { TaskPageLinearProjectDialog } from './linear/ProjectDialog'
import { TaskPageLinearIssueDialog } from './linear/IssueDialog'
import { TaskPageJiraIssueDialog } from './jira/IssueDialog'
import { TaskPageGitLabDialog } from './gitlab/Dialog'
import { TaskPageLinearConnectDialog } from './linear/ConnectDialog'
import { TaskPageJiraConnectDialog } from './jira/ConnectDialog'
export function TaskPageSurface({ model }: { model: TaskPageVoloStageModel }): React.JSX.Element {
  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden bg-background text-foreground">
      <TaskPageFrame model={model} />

      <TaskPageGitHubIssueDialog model={model} />

      <TaskPageLinearProjectDialog model={model} />

      <TaskPageLinearIssueDialog model={model} />

      <TaskPageJiraIssueDialog model={model} />

      <TaskPageGitLabDialog model={model} />

      <TaskPageLinearConnectDialog model={model} />

      <TaskPageJiraConnectDialog model={model} />

      <VoloConnectDialog open={model.voloConnectOpen} onOpenChange={model.setVoloConnectOpen} />
      <NewVoloTaskDialog
        open={model.newVoloTaskOpen}
        onOpenChange={model.setNewVoloTaskOpen}
        board={model.selectedVoloBoard}
        sourceContext={model.voloDetailSourceContext}
        onCreated={() => model.setVoloRefreshNonce((value) => value + 1)}
      />
      <VoloQueueTargetDialog
        open={Boolean(model.pendingQueueTasks && model.pendingQueueTasks.length > 0)}
        tasks={model.pendingQueueTasks ?? []}
        repos={model.eligibleRepos}
        suggestedRepoId={model.suggestedQueueRepoId}
        onOpenChange={(open) => {
          if (!open) {
            model.setPendingQueueTasks(null)
          }
        }}
        onConfirm={model.confirmVoloQueueTarget}
      />
    </div>
  )
}

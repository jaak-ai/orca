import type { TaskPageVoloStageModel } from '../use-task-page-volo-stage'
import { VoloTaskListHost } from './volo/volo-task-list-host'
import PullRequestPage from '@/components/PullRequestPage'
import GitHubItemDialog from '@/components/GitHubItemDialog'
import ProjectViewWrapper from '@/components/github-project/ProjectViewWrapper'
import { TaskPageGitHubList } from './github/List'
import { TaskPageGitLabTodoList } from './gitlab/TodoList'
import { TaskPageGitLabItemList } from './gitlab/ItemList'
import { TaskPageJiraContent } from './jira/Content'
export function TaskPageContent({
  model
}: {
  model: TaskPageVoloStageModel
}): React.JSX.Element | null {
  const {
    repoSelection,
    taskSource,
    githubMode,
    gitlabView,
    dialogInitialTab,
    dialogWorkItem,
    dialogRepoPath,
    dialogSourceContext,
    setDialogWorkItem,
    handleDialogReviewRequestsChange,
    closeTaskDetailPage,
    handleUseWorkItem
  } = model
  return taskSource === 'github' && dialogWorkItem ? (
    dialogWorkItem.type === 'pr' ? (
      <PullRequestPage
        workItem={dialogWorkItem}
        initialTab={dialogInitialTab}
        repoPath={dialogRepoPath}
        repoId={dialogWorkItem.repoId}
        sourceContext={dialogSourceContext}
        backLabel="Pull requests"
        onUse={(item) => {
          setDialogWorkItem(null)
          handleUseWorkItem(item)
        }}
        onReviewRequestsChange={handleDialogReviewRequestsChange}
        onClose={closeTaskDetailPage}
      />
    ) : (
      <GitHubItemDialog
        workItem={dialogWorkItem}
        initialTab={dialogInitialTab}
        repoPath={dialogRepoPath}
        repoId={dialogWorkItem.repoId}
        sourceContext={dialogSourceContext}
        backLabel="GitHub list"
        onUse={(item) => {
          setDialogWorkItem(null)
          handleUseWorkItem(item)
        }}
        onReviewRequestsChange={handleDialogReviewRequestsChange}
        onClose={closeTaskDetailPage}
      />
    )
  ) : taskSource === 'github' && githubMode === 'project' ? (
    <div className="mt-3 flex min-h-0 min-w-0 max-h-full flex-col overflow-hidden rounded-md border border-border/50 bg-muted/50 shadow-sm">
      <ProjectViewWrapper selectedRepoIds={repoSelection} />
    </div>
  ) : taskSource === 'github' ? (
    // Why: bottom of the joined GitHub list card — flush under the filter
    // chrome (no gap, no top border/radius) so toolbar + table read as one.
    <TaskPageGitHubList model={model} />
  ) : taskSource === 'gitlab' && gitlabView === 'todos' ? (
    <TaskPageGitLabTodoList model={model} />
  ) : taskSource === 'gitlab' ? (
    <TaskPageGitLabItemList model={model} />
  ) : taskSource === 'volo' ? (
    <VoloTaskListHost
      voloStatusReady={model.voloStatusReady}
      voloConnected={model.voloConnected}
      setVoloConnectOpen={model.setVoloConnectOpen}
      hideTaskSource={model.hideTaskSource}
      voloLoading={model.voloLoading}
      voloError={model.voloError}
      voloTasks={model.voloTasks}
      displayedVoloTasks={model.displayedVoloTasks}
      voloSearchInput={model.voloSearchInput}
      selectedVoloTask={model.selectedVoloTask}
      selectedVoloBoard={model.selectedVoloBoard}
      openVoloDetailPage={model.openVoloDetailPage}
      selectedVoloTaskIds={model.selectedVoloTaskIds}
      toggleVoloTaskSelected={model.toggleVoloTaskSelected}
      setAllDisplayedVoloTasksSelected={model.setAllDisplayedVoloTasksSelected}
      clearVoloTaskSelection={model.clearVoloTaskSelection}
      handleUseVoloItem={model.handleUseVoloItem}
      handleStartVoloTasks={model.handleStartVoloTasks}
      voloLaunching={model.voloLaunching}
      closeTaskDetailPage={model.closeTaskDetailPage}
      voloDetailSourceContext={model.voloDetailSourceContext}
      onMoveVoloTask={model.moveSelectedVoloTask}
    />
  ) : (
    <TaskPageJiraContent model={model} />
  )
}

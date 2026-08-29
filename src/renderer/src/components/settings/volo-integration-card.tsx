import { useEffect, useState } from 'react'
import { CheckCircle2, LoaderCircle, Unlink } from 'lucide-react'
import { VoloConnectDialog } from '@/components/volo-connect-dialog'
import { VoloIcon } from '@/components/icons/VoloIcon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useMountedRef } from '@/hooks/useMountedRef'
import {
  getProviderRuntimeContextKey,
  hasRemoteProviderRuntime
} from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'
import { IntegrationCardDetails, IntegrationCardShell } from './integration-card-shell'
import { useIntegrationSubordinateRowClass } from './integration-card-presentation'
import { getProviderAccountScope } from './provider-account-scope'
import { ProviderHostScopeControl } from './ProviderHostScopeControl'
import { VOLO_INTEGRATION_SECTION_ID } from './task-provider-integration-section-ids'
import { translate } from '@/i18n/i18n'
import { useVoloBoardPreferences } from '@/components/task-page/hooks/use-volo-board-preferences'
import { voloListBoards, type RuntimeVoloSettings } from '@/runtime/runtime-volo-client'
import { getVoloRuntimeTarget } from '@/runtime/runtime-volo-target'
import type { VoloBoard } from '../../../../shared/volo-types'

export function VoloIntegrationCard(): React.JSX.Element {
  const voloStatus = useAppStore((s) => s.voloStatus)
  const voloStatusChecked = useAppStore((s) => s.voloStatusChecked)
  const voloStatusContextKey = useAppStore((s) => s.voloStatusContextKey)
  const checkVoloConnection = useAppStore((s) => s.checkVoloConnection)
  const disconnectVolo = useAppStore((s) => s.disconnectVolo)
  const testVoloConnection = useAppStore((s) => s.testVoloConnection)
  const settings = useAppStore((s) => s.settings)
  const mountedRef = useMountedRef()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testOk, setTestOk] = useState<boolean | null>(null)

  const contextMatches = voloStatusContextKey === getProviderRuntimeContextKey(settings)
  const checking = !contextMatches || !voloStatusChecked
  const connected = contextMatches && voloStatus.connected
  const accountScope = getProviderAccountScope(settings)
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')
  const accountScopeRowClass = useIntegrationSubordinateRowClass('text-xs')
  const credentialCopy = hasRemoteProviderRuntime(settings)
    ? translate(
        'auto.components.settings.volo.integration.remote',
        'Sign in to Volo with Google. The session is sent to the selected remote runtime and stored there with runtime-supported encryption.'
      )
    : translate(
        'auto.components.settings.volo.integration.local',
        'Sign in to Volo with Google — the same login as the Volo app. The session is stored locally and encrypted when local runtime storage supports it.'
      )

  const handleTest = async (): Promise<void> => {
    setTesting(true)
    setTestOk(null)
    const result = await testVoloConnection()
    if (!mountedRef.current) {
      return
    }
    setTestOk(result.ok)
    setTesting(false)
  }

  return (
    <IntegrationCardShell
      settingsSectionId={VOLO_INTEGRATION_SECTION_ID}
      icon={<VoloIcon className="size-5" />}
      name="Volo"
      description={
        connected
          ? voloStatus.viewer?.displayName ||
            translate('auto.components.settings.volo.integration.connected', 'Volo connected')
          : checking
            ? translate(
                'auto.components.settings.volo.integration.checking',
                'Checking Volo access before showing setup actions.'
              )
            : translate(
                'auto.components.settings.volo.integration.idle',
                'Browse Volo boards and start workspaces from tasks.'
              )
      }
      checking={checking}
      statusTone={connected ? 'connected' : 'attention'}
      statusLabel={
        connected
          ? translate('auto.components.settings.volo.integration.statusConnected', 'Connected')
          : translate(
              'auto.components.settings.volo.integration.statusNotConnected',
              'Not connected'
            )
      }
      actions={
        !checking ? (
          <Button
            variant={connected ? 'outline' : 'default'}
            size="sm"
            onClick={() => setDialogOpen(true)}
          >
            {connected
              ? translate('auto.components.settings.volo.integration.update', 'Sign in again')
              : translate('auto.components.settings.volo.integration.connect', 'Connect Volo')}
          </Button>
        ) : null
      }
    >
      <IntegrationCardDetails>
        <p className="text-xs text-muted-foreground">{credentialCopy}</p>
        {connected ? (
          <div className={subordinateRowClass}>
            <Button variant="ghost" size="sm" onClick={() => void handleTest()} disabled={testing}>
              {testing ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
              {translate('auto.components.settings.volo.integration.test', 'Test')}
            </Button>
            {testOk === true ? <CheckCircle2 className="size-3.5 text-muted-foreground" /> : null}
            <Button variant="ghost" size="sm" onClick={() => void disconnectVolo()}>
              <Unlink className="size-3.5" />
              {translate('auto.components.settings.volo.integration.disconnect', 'Disconnect')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void checkVoloConnection()}>
              {translate('auto.components.settings.volo.integration.refresh', 'Refresh')}
            </Button>
          </div>
        ) : null}
        <div className={accountScopeRowClass}>
          <ProviderHostScopeControl labelPrefix="Volo" scope={accountScope} />
        </div>
        {connected ? (
          <VoloBoardPreferencesSection
            settings={settings}
            connectionIdentity={voloStatusContextKey}
          />
        ) : null}
      </IntegrationCardDetails>
      <VoloConnectDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConnected={() => void checkVoloConnection()}
      />
    </IntegrationCardShell>
  )
}

function VoloBoardPreferencesSection({
  settings,
  connectionIdentity
}: {
  settings: RuntimeVoloSettings
  connectionIdentity: string | null
}): React.JSX.Element {
  const [boards, setBoards] = useState<VoloBoard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { selectedBoardId, visibleColumnIdsByBoard, selectBoard, setVisibleColumnIds } =
    useVoloBoardPreferences()

  const target = getVoloRuntimeTarget(settings)
  const targetEnvId = target.kind === 'environment' ? target.environmentId : null

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    const requestSettings = targetEnvId ? { activeRuntimeEnvironmentId: targetEnvId } : null
    voloListBoards(requestSettings)
      .then((data) => {
        if (!cancelled) {
          setBoards(data)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load Volo boards.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [connectionIdentity, targetEnvId])

  const selectedBoard = boards.find((b) => b.id === selectedBoardId)
  const visibleVoloColumnIds = selectedBoardId
    ? (visibleColumnIdsByBoard[selectedBoardId] ?? null)
    : null
  const allColumnIds = selectedBoard?.columns ? selectedBoard.columns.map((c) => c.id) : []

  return (
    <div className="border-t border-border/50 pt-4 mt-3 space-y-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          {translate('auto.components.settings.volo.defaultBoardLabel', 'Default Board')}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground h-8">
              <LoaderCircle className="size-3.5 animate-spin" />
              <span>
                {translate('auto.components.settings.volo.loadingBoards', 'Loading boards...')}
              </span>
            </div>
          ) : error ? (
            <span className="text-xs text-destructive h-8 flex items-center">{error}</span>
          ) : boards.length > 0 ? (
            <>
              <Select
                value={selectedBoardId ?? undefined}
                onValueChange={(value) => selectBoard(value)}
              >
                <SelectTrigger className="h-8 w-[220px] rounded-md border-border/50 bg-muted/50 text-xs font-medium shadow-sm">
                  <SelectValue
                    placeholder={translate(
                      'auto.components.TaskPage.voloSelectBoard',
                      'Select a board'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {boards.map((board) => (
                    <SelectItem key={board.id} value={board.id}>
                      {board.icon ? `${board.icon} ${board.name}` : board.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedBoard && selectedBoard.columns && selectedBoard.columns.length > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-border/50 bg-muted/50 text-xs font-medium shadow-sm px-3"
                    >
                      {visibleVoloColumnIds === null ||
                      visibleVoloColumnIds.length === selectedBoard.columns.length
                        ? translate('auto.components.TaskPage.voloColumns', 'Columns')
                        : `${translate('auto.components.TaskPage.voloColumns', 'Columns')} · ${
                            visibleVoloColumnIds.length
                          }/${selectedBoard.columns.length}`}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2 flex flex-col gap-1.5" align="start">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1.5 mb-1 px-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {translate('auto.components.TaskPage.voloColumnsLabel', 'Columns')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVisibleColumnIds(selectedBoard.id, null)}
                        className="text-[10px] font-medium text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
                      >
                        {translate('auto.components.TaskPage.voloAllColumns', 'All')}
                      </button>
                    </div>
                    <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto scrollbar-sleek popover-scroll-content">
                      {[...selectedBoard.columns]
                        .sort((a, b) => a.order - b.order)
                        .map((column) => {
                          const currentlyVisibleIds = visibleVoloColumnIds ?? allColumnIds
                          const isChecked = currentlyVisibleIds.includes(column.id)
                          return (
                            <label
                              key={column.id}
                              className="flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-muted/50 cursor-pointer text-xs transition-colors"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    const nextIds = [...currentlyVisibleIds, column.id]
                                    if (nextIds.length === allColumnIds.length) {
                                      setVisibleColumnIds(selectedBoard.id, null)
                                    } else {
                                      setVisibleColumnIds(selectedBoard.id, nextIds)
                                    }
                                  } else {
                                    setVisibleColumnIds(
                                      selectedBoard.id,
                                      currentlyVisibleIds.filter((id) => id !== column.id)
                                    )
                                  }
                                }}
                              />
                              <span className="truncate flex-1 font-medium text-left">
                                {column.name}
                              </span>
                              {column.color ? (
                                <span
                                  className="size-2 rounded-full shrink-0"
                                  style={{ backgroundColor: column.color }}
                                />
                              ) : null}
                            </label>
                          )
                        })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}
            </>
          ) : (
            <span className="text-xs text-muted-foreground h-8 flex items-center">
              {translate('auto.components.settings.volo.noBoards', 'No boards found')}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

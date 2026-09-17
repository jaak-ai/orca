import type {
  VoloConnectArgs,
  VoloCreateTaskArgs,
  VoloTaskFilter,
  VoloTaskUpdate
} from '../../shared/volo-types'
import {
  connect as connectVolo,
  connectFromSavedCredentials as connectVoloFromSavedCredentials,
  disconnect as disconnectVolo,
  getStatus as getVoloStatus,
  testConnection as testVoloConnection
} from '../volo/client'
import {
  createTask as createVoloTask,
  getTask as getVoloTask,
  listBoards as listVoloBoards,
  listMembers as listVoloMembers,
  listTasks as listVoloTasks,
  moveTask as moveVoloTask,
  updateTask as updateVoloTask
} from '../volo/tasks'

export class RuntimeVoloCommands {
  voloConnect(args: VoloConnectArgs): ReturnType<typeof connectVolo> {
    return connectVolo(args)
  }

  voloConnectFromSavedCredentials(): ReturnType<typeof connectVoloFromSavedCredentials> {
    return connectVoloFromSavedCredentials()
  }

  voloDisconnect(): { ok: true } {
    return disconnectVolo()
  }

  voloStatus(): ReturnType<typeof getVoloStatus> {
    return getVoloStatus()
  }

  voloReadStatus(): ReturnType<typeof getVoloStatus> {
    return getVoloStatus()
  }

  voloTestConnection(): ReturnType<typeof testVoloConnection> {
    return testVoloConnection()
  }

  voloListBoards(): ReturnType<typeof listVoloBoards> {
    return listVoloBoards()
  }

  voloListMembers(boardId: string): ReturnType<typeof listVoloMembers> {
    return listVoloMembers(boardId)
  }

  voloListTasks(boardId: string, filter?: VoloTaskFilter): ReturnType<typeof listVoloTasks> {
    return listVoloTasks(boardId, filter)
  }

  voloGetTask(taskCode: string): ReturnType<typeof getVoloTask> {
    return getVoloTask(taskCode)
  }

  voloCreateTask(args: VoloCreateTaskArgs): ReturnType<typeof createVoloTask> {
    return createVoloTask(args)
  }

  voloUpdateTask(
    boardId: string,
    taskId: string,
    updates: VoloTaskUpdate
  ): ReturnType<typeof updateVoloTask> {
    return updateVoloTask(boardId, taskId, updates)
  }

  voloMoveTask(boardId: string, taskId: string, columnId: string): ReturnType<typeof moveVoloTask> {
    return moveVoloTask(boardId, taskId, columnId)
  }
}

import { z } from 'zod'
import { OptionalPlainString, OptionalString, requiredString } from './rpc-param-primitives'

export const Connect = z.object({
  apiUrl: OptionalPlainString,
  apiToken: requiredString('API token is required'),
  webUrl: OptionalPlainString
})

export const BoardId = z.object({
  boardId: requiredString('Board ID is required')
})

export const ListTasks = z.object({
  boardId: OptionalString,
  filter: z.enum(['assigned', 'all', 'done']).optional()
})

export const TaskCode = z.object({
  taskCode: requiredString('Task code is required')
})

export const CreateTask = z.object({
  boardId: requiredString('Board ID is required'),
  title: requiredString('Title is required'),
  columnId: requiredString('Column is required'),
  description: OptionalPlainString,
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigneeId: OptionalString
})

export const UpdateTask = z.object({
  boardId: requiredString('Board ID is required'),
  taskId: requiredString('Task ID is required'),
  updates: z.object({
    title: OptionalString,
    description: OptionalString,
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    assigneeId: z.union([z.string(), z.null()]).optional()
  })
})

export const MoveTask = z.object({
  boardId: requiredString('Board ID is required'),
  taskId: requiredString('Task ID is required'),
  columnId: requiredString('Column is required')
})

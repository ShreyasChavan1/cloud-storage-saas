import { z } from 'zod'

const nameField = z
  .string()
  .min(1, 'Name is required')
  .max(255)
  .regex(/^[^/\0]+$/, 'Name cannot contain a path separator')

export const listFilesSchema = z.object({
  query: z.object({
    path: z.string().optional(),
  }),
})

export const uploadFileSchema = z.object({
  query: z.object({
    path: z.string().optional(),
  }),
})

export const deleteFileSchema = z.object({
  query: z.object({
    path: z.string().min(1, 'path is required'),
  }),
})

export const renameFileSchema = z.object({
  body: z.object({
    path: z.string().min(1, 'path is required'),
    newName: nameField,
  }),
})

export const createFolderSchema = z.object({
  body: z.object({
    path: z.string().optional(),
    name: nameField,
  }),
})

export const moveFileSchema = z.object({
  body: z.object({
    from: z.string().min(1, 'from is required'),
    to: z.string().min(1, 'to is required'),
  }),
})

export const copyFileSchema = z.object({
  body: z.object({
    from: z.string().min(1, 'from is required'),
    to: z.string().min(1, 'to is required'),
  }),
})

export const downloadFileSchema = z.object({
  query: z.object({
    path: z.string().min(1, 'path is required'),
  }),
})

export type RenameFileInput = z.infer<typeof renameFileSchema>['body']
export type CreateFolderInput = z.infer<typeof createFolderSchema>['body']
export type MoveFileInput = z.infer<typeof moveFileSchema>['body']
export type CopyFileInput = z.infer<typeof copyFileSchema>['body']

import { z } from 'zod'

export const assetCategories = [
  'SEWING_MACHINE', 'MANNEQUIN', 'COMPUTER', 'PHONE', 'TOOL', 'FURNITURE', 'VEHICLE', 'UNIFORM', 'OTHER',
] as const

export const assetStatuses = ['AVAILABLE', 'ASSIGNED', 'DAMAGED', 'RETIRED'] as const

export const createAssetSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: z.enum(assetCategories),
  serialNumber: z.string().max(100).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  notes: z.string().max(500).optional(),
})

export const updateAssetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(assetCategories).optional(),
  serialNumber: z.string().max(100).optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  status: z.enum(assetStatuses).optional(),
  notes: z.string().max(500).optional(),
})

export const assignAssetSchema = z.object({
  assetId: z.string().min(1),
  employeeId: z.string().min(1),
  note: z.string().max(300).optional(),
})

export type CreateAssetData = z.infer<typeof createAssetSchema>
export type UpdateAssetData = z.infer<typeof updateAssetSchema>

'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { createAssetSchema, updateAssetSchema, assignAssetSchema } from '@/lib/validations/asset'

export async function createAsset(raw: Record<string, unknown>) {
  const parsed = createAssetSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const first = Object.values(errors).flat()[0]
    return { error: first || 'Invalid input' }
  }

  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  const asset = await db.asset.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      serialNumber: parsed.data.serialNumber || null,
      purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null,
      purchasePrice: parsed.data.purchasePrice || null,
      notes: parsed.data.notes || null,
    },
  })

  revalidatePath('/manager/assets')
  return { id: asset.id }
}

export async function updateAsset(id: string, raw: Record<string, unknown>) {
  const parsed = updateAssetSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const first = Object.values(errors).flat()[0]
    return { error: first || 'Invalid input' }
  }

  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  await db.asset.update({
    where: { id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.category !== undefined && { category: parsed.data.category }),
      ...(parsed.data.serialNumber !== undefined && { serialNumber: parsed.data.serialNumber || null }),
      ...(parsed.data.purchaseDate !== undefined && { purchaseDate: parsed.data.purchaseDate ? new Date(parsed.data.purchaseDate) : null }),
      ...(parsed.data.purchasePrice !== undefined && { purchasePrice: parsed.data.purchasePrice || null }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes || null }),
    },
  })

  revalidatePath('/manager/assets')
  return { success: true }
}

export async function getAssets() {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return []
  }

  const assets = await db.asset.findMany({
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { employee: { select: { firstName: true, lastName: true } } },
        take: 1,
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return assets.map((a) => ({ ...a, purchasePrice: a.purchasePrice === null ? null : Number(a.purchasePrice) }))
}

export async function getAssetDetail(id: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return null
  }

  const asset = await db.asset.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, department: true } } },
        orderBy: { assignedAt: 'desc' },
      },
    },
  })

  if (!asset) return null
  return { ...asset, purchasePrice: asset.purchasePrice === null ? null : Number(asset.purchasePrice) }
}

export async function assignAsset(assetId: string, employeeId: string, note?: string) {
  const parsed = assignAssetSchema.safeParse({ assetId, employeeId, note })
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const first = Object.values(errors).flat()[0]
    return { error: first || 'Invalid input' }
  }

  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  await db.assetAssignment.create({
    data: { assetId: parsed.data.assetId, employeeId: parsed.data.employeeId, note: parsed.data.note || null },
  })

  await db.asset.update({ where: { id: assetId }, data: { status: 'ASSIGNED' } })

  revalidatePath('/manager/assets')
  return { success: true }
}

export async function returnAsset(assignmentId: string, assetId: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  await db.assetAssignment.update({
    where: { id: assignmentId },
    data: { returnedAt: new Date() },
  })

  const activeAssignments = await db.assetAssignment.count({
    where: { assetId, returnedAt: null },
  })

  await db.asset.update({
    where: { id: assetId },
    data: { status: activeAssignments > 0 ? 'ASSIGNED' : 'AVAILABLE' },
  })

  revalidatePath('/manager/assets')
  return { success: true }
}

export async function getMyAssets() {
  const session = await auth()
  if (!session?.user) return []

  const employee = await db.employee.findUnique({ where: { userId: session.user.id } })
  if (!employee) return []

  return db.assetAssignment.findMany({
    where: { employeeId: employee.id, returnedAt: null },
    include: { asset: true },
    orderBy: { assignedAt: 'desc' },
  })
}

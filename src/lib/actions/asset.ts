'use server'

import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function createAsset(data: {
  name: string
  category: string
  serialNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  notes?: string
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  const asset = await db.asset.create({
    data: {
      name: data.name,
      category: data.category,
      serialNumber: data.serialNumber || null,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      purchasePrice: data.purchasePrice || null,
      notes: data.notes || null,
    },
  })

  revalidatePath('/manager/assets')
  return { id: asset.id }
}

export async function updateAsset(id: string, data: {
  name?: string
  category?: string
  serialNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  status?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  await db.asset.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.serialNumber !== undefined && { serialNumber: data.serialNumber || null }),
      ...(data.purchaseDate !== undefined && { purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null }),
      ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice || null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
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

  return db.asset.findMany({
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
}

export async function getAssetDetail(id: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return null
  }

  return db.asset.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { employee: { select: { id: true, firstName: true, lastName: true, department: true } } },
        orderBy: { assignedAt: 'desc' },
      },
    },
  })
}

export async function assignAsset(assetId: string, employeeId: string, note?: string) {
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    return { error: 'Unauthorized' }
  }

  await db.assetAssignment.create({
    data: { assetId, employeeId, note: note || null },
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

import { PrismaClient, type Prisma } from '@prisma/client'

import { logger } from '@/lib/logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'production'
        ? [{ emit: 'event', level: 'error' }]
        : ['warn', 'error'],
  })

if (process.env.NODE_ENV === 'production') {
  ;(db as PrismaClient<Prisma.PrismaClientOptions, 'error'>).$on(
    'error',
    (e) => {
      logger.error(e.message)
    }
  )
} else {
  globalForPrisma.prisma = db
}

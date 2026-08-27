import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { db } from './db'
import { signInSchema } from './validations/auth'
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from './rate-limit'
import { env } from './env'
import type { Role } from '@/lib/types'

declare module 'next-auth' {
  interface User {
    role?: Role
    name?: string
  }
  interface Session {
    user: {
      id: string
      email: string
      role: Role
      name?: string
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: Role
    id?: string
    name?: string
    tokenVersion?: number
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,

  providers: [
    Credentials({
      async authorize(credentials) {
        const rlEmail = typeof credentials?.email === 'string' ? credentials.email.toLowerCase() : ''
        const rlKey = rlEmail ? `signin:${rlEmail}` : ''
        if (rlKey && !checkRateLimit(rlKey).ok) return null

        const fail = () => {
          if (rlKey) recordFailedAttempt(rlKey)
          return null
        }

        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return fail()

        const { email, password } = parsed.data
        const user = await db.user.findUnique({ where: { email } })

        if (!user || !user.isActive) return fail()

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash)
        if (!passwordsMatch) return fail()

        if (user.role === 'EMPLOYEE') return fail()

        if (rlKey) resetRateLimit(rlKey)

        const employee = await db.employee.findUnique({ where: { userId: user.id } })
        const name = employee ? `${employee.firstName} ${employee.lastName}` : user.email.split('@')[0]

        return {
          id: user.id,
          email: user.email,
          role: user.role as Role,
          name,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
})

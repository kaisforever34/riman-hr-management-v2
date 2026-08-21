import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { db } from './db'
import { signInSchema } from './validations/auth'
import { checkRateLimit, resetRateLimit } from './rate-limit'
import { env } from './env'
import type { Role } from '@prisma/client'

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
        if (rlEmail) {
          const rl = checkRateLimit(`signin:${rlEmail}`)
          if (!rl.ok) return null
        }

        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await db.user.findUnique({ where: { email } })

        if (!user || !user.isActive) return null

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash)
        if (!passwordsMatch) return null

        if (rlEmail) resetRateLimit(`signin:${rlEmail}`)

        const employee = await db.employee.findUnique({ where: { userId: user.id } })
        const name = employee ? `${employee.firstName} ${employee.lastName}` : user.email.split('@')[0]

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name,
          tokenVersion: user.tokenVersion,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.name = user.name
        token.tokenVersion =
          (user as { tokenVersion?: number }).tokenVersion ?? 0
        return token
      }
      if (token.id) {
        try {
          const u = await db.user.findUnique({
            where: { id: token.id as string },
            select: { isActive: true, tokenVersion: true },
          })
          if (!u || !u.isActive || u.tokenVersion !== token.tokenVersion) {
            return {} as typeof token
          }
        } catch {
          return {} as typeof token
        }
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as Role
        session.user.id = token.id as string
        session.user.name = token.name as string
      }
      return session
    },
  },
})

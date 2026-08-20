import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authConfig } from './auth.config'
import { db } from './db'
import { signInSchema } from './validations/auth'
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
  }
}

const secret = process.env.AUTH_SECRET
if (!secret && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET must be set in production')
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,

  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = signInSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data
        const user = await db.user.findUnique({ where: { email } })

        if (!user || !user.isActive) return null

        const passwordsMatch = await bcrypt.compare(password, user.passwordHash)
        if (!passwordsMatch) return null

        const employee = await db.employee.findUnique({ where: { userId: user.id } })
        const name = employee ? `${employee.firstName} ${employee.lastName}` : user.email.split('@')[0]

        return { id: user.id, email: user.email, role: user.role, name }
      },
    }),
  ],
  session: { strategy: 'jwt' },
})

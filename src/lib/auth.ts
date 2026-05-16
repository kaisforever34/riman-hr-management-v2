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
  }
  interface Session {
    user: {
      id: string
      email: string
      role: Role
    }
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role?: Role
    id?: string
  }
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

        return { id: user.id, email: user.email, role: user.role }
      },
    }),
  ],
  session: { strategy: 'jwt' },
})

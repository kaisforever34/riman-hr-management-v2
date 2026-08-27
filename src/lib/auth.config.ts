import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@/lib/types'
import { db } from './db'

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.name = user.name
        token.tokenVersion = (user as { tokenVersion?: number }).tokenVersion ?? 0
        return token
      }
      if (token.id) {
        try {
          const u = await db.user.findUnique({
            where: { id: token.id as string },
            select: { isActive: true, tokenVersion: true },
          })
          if (!u || !u.isActive || u.tokenVersion !== token.tokenVersion) {
            return null
          }
        } catch {
          return null
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
  providers: [],
} satisfies NextAuthConfig
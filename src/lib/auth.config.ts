import type { NextAuthConfig } from 'next-auth'
import type { Role } from '@/lib/types'

// Edge-safe config shared with the Next.js middleware. It must NOT import
// Prisma (or anything that instantiates PrismaClient), because Prisma cannot
// run in the Edge runtime. Session revocation (isActive/tokenVersion) is
// enforced in the Node runtime via the jwt callback in ./auth.
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

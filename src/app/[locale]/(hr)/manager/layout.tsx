import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const role = session.user.role
  if (role !== 'HR_ADMIN' && role !== 'MANAGER') {
    redirect('/dashboard')
  }

  return <>{children}</>
}

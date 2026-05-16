import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function ManagerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const role = session.user.role
  if (role !== 'HR_ADMIN' && role !== 'MANAGER') {
    redirect(`/${locale}/dashboard`)
  }

  return <>{children}</>
}

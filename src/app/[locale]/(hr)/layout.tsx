import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HrLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar role={session.user.role} />
      <div className="lg:ps-64">
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen bg-[#07091A]">
      <Sidebar role={session.user.role} />
      <div className="ms-52 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-7">{children}</main>
      </div>
    </div>
  )
}

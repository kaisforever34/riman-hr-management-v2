import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function HrLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  return (
    <div className="min-h-screen bg-[#07091A]">
      <Sidebar role={session.user.role} />
      <div className="ms-0 md:ms-60 min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 p-4 md:p-7 pt-14 md:pt-4">{children}</main>
      </div>
    </div>
  )
}

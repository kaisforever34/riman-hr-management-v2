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
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-1 min-h-0">
        <Sidebar role={session.user.role} />
        <div className="ms-0 md:ms-60 flex flex-col flex-1 min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-7 pt-14 md:pt-4">{children}</main>
          <footer className="px-4 md:px-7 py-3 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between">
            <span>Riman HR Management</span>
            <span>Powered by <span className="font-semibold text-primary">KAIS</span></span>
          </footer>
        </div>
      </div>
    </div>
  )
}

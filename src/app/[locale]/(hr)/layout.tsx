import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default function HrLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="lg:ps-64">
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}

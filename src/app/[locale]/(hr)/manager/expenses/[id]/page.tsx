import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExpenseDetail } from '@/lib/actions/expense'
import ExpenseDetailClient from './expense-detail-client'
export const dynamic = 'force-dynamic'


export default async function ExpenseDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const expense = await getExpenseDetail(id)
  if (!expense) notFound()

  return <ExpenseDetailClient expense={JSON.parse(JSON.stringify(expense))} locale={locale} />
}

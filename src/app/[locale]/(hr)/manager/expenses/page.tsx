import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExpenses } from '@/lib/actions/expense'
import ExpensesListClient from './expenses-list-client'
export const dynamic = 'force-dynamic'


export default async function ManagerExpensesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const expenses = await getExpenses()
  return <ExpensesListClient expenses={JSON.parse(JSON.stringify(expenses))} locale={locale} />
}

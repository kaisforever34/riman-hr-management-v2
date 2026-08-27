import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExpenses } from '@/lib/actions/expense'
import { getAllActiveEmployees } from '@/lib/queries/attendance'
import ExpensesListClient from './expenses-list-client'
export const dynamic = 'force-dynamic'


export default async function ManagerExpensesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const [expenses, employees] = await Promise.all([getExpenses(), getAllActiveEmployees()])
  return (
    <ExpensesListClient
      expenses={JSON.parse(JSON.stringify(expenses))}
      employees={employees.map(e => ({ id: e.id, firstName: e.firstName, lastName: e.lastName }))}
      locale={locale}
    />
  )
}

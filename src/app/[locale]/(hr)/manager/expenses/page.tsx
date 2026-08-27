import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getExpenses } from '@/lib/actions/expense'
import { resolveSelectedEmployee } from '@/lib/queries/employee-picker'
import ExpensesListClient from './expenses-list-client'
export const dynamic = 'force-dynamic'


export default async function ManagerExpensesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ employee?: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user || (session.user.role !== 'HR_ADMIN' && session.user.role !== 'MANAGER')) {
    redirect(`/${locale}/auth/signin`)
  }

  const { employee: employeeParam } = await searchParams
  const { employee, employees } = await resolveSelectedEmployee(employeeParam)

  const expenses = await getExpenses(employee?.id)
  return (
    <ExpensesListClient
      expenses={JSON.parse(JSON.stringify(expenses))}
      employees={employees}
      employeeId={employee?.id ?? ''}
      locale={locale}
    />
  )
}

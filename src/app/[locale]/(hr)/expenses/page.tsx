import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getMyExpenses } from '@/lib/actions/expense'
import EmployeeExpensesClient from './employee-expenses-client'
export const dynamic = 'force-dynamic'


export default async function EmployeeExpensesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  const expenses = await getMyExpenses()
  return <EmployeeExpensesClient expenses={JSON.parse(JSON.stringify(expenses))} locale={locale} />
}

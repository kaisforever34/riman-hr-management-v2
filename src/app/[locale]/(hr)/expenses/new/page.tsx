import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import NewExpenseClient from './new-expense-client'
export const dynamic = 'force-dynamic'


export default async function NewExpensePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user) redirect(`/${locale}/auth/signin`)

  return <NewExpenseClient locale={locale} />
}

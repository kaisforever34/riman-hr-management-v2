import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  
  if (session) {
    redirect(`/${locale}/dashboard`)
  }
  
  redirect(`/${locale}/auth/signin`)
}

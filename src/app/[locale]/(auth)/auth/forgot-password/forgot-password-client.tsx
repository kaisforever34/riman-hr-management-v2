'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { forgotPassword } from '@/lib/actions/employee'
import { KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function ForgotPasswordClient() {
  const t = useTranslations('forgotPassword')
  const params = useParams()
  const locale = params.locale as string
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setNewPassword('')
    setLoading(true)

    try {
      const result = await forgotPassword(email)
      if ('error' in result && result.error) {
        setError(result.error)
      } else {
        setNewPassword(result.newPassword ?? '')
      }
    } catch {
      setError(t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl bg-[#0D1028] border border-[rgba(255,255,255,0.065)] p-6">
      <div className="mb-6">
        <h2 className="font-syne text-lg font-bold text-[#E0E6F4]">
          {t('title')}
        </h2>
        <p className="mt-1 text-[13px] text-[#8B93A8]">
          {t('subtitle')}
        </p>
      </div>

      {newPassword ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.15)] px-3.5 py-2.5">
            <CheckCircle2 className="h-4 w-4 text-[#22C55E] mt-0.5 flex-shrink-0" />
            <span className="text-[13px] text-[#22C55E]">{t('success')}</span>
          </div>

          <div>
            <Label className="text-[#8B93A8]">{t('newPasswordLabel')}</Label>
            <div className="mt-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] px-3.5 py-2.5">
              <code className="text-[14px] text-[#D4A843] font-mono">{newPassword}</code>
            </div>
          </div>

          <Link href={`/${locale}/auth/signin`}>
            <Button variant="outline" className="w-full justify-center border-[rgba(255,255,255,0.1)] text-[#E0E6F4] hover:bg-[rgba(255,255,255,0.05)]">
              <ArrowLeft className="h-4 w-4" />
              Back to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] px-3.5 py-2.5">
              <AlertCircle className="h-4 w-4 text-[#EF4444] mt-0.5 flex-shrink-0" />
              <span className="text-[13px] text-[#EF4444]">{error}</span>
            </div>
          )}

          <div>
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@riman.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {loading ? t('submitting') : t('submit')}
          </Button>
        </form>
      )}
    </div>
  )
}

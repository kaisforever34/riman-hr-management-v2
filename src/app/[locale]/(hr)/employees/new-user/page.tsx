'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createUser } from '@/lib/actions/employee'
import { getAllActiveEmployees } from '@/lib/queries/attendance'
import { ArrowLeft, UserPlus, Eye, EyeOff, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const ROLES = [
  { value: 'EMPLOYEE', labelKey: 'roleEmployee' },
  { value: 'MANAGER', labelKey: 'roleManager' },
  { value: 'HR_ADMIN', labelKey: 'roleHrAdmin' },
] as const

export default function AddUserPage() {
  const t = useTranslations('addUser')
  const tc = useTranslations('common')
  const { locale } = useParams<{ locale: string }>()
  const [employees, setEmployees] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [createdPassword, setCreatedPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [autoPassword, setAutoPassword] = useState(false)

  useState(() => {
    getAllActiveEmployees().then(setEmployees).catch(() => {})
  })

  const handleCopy = () => {
    navigator.clipboard.writeText(createdPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError('')
    setCreatedPassword('')
    setLoading(true)
    const form = new FormData(e.currentTarget)
    if (autoPassword) form.delete('password')
    const result = await createUser(form)
    setLoading(false)
    if (result?.error) {
      setServerError(result.error)
    } else if (result?.passwordGenerated) {
      // password was auto-generated but not returned for security — user must set one
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/employees`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="me-2 h-4 w-4" />
            {tc('back')}
          </Button>
        </Link>
        <h1 className="font-syne text-2xl font-bold text-[#E0E6F4]">{t('title')}</h1>
      </div>
      <p className="text-[13px] text-[#8B93A8]">{t('subtitle')}</p>

      {createdPassword && (
        <Card className="border-green-700/30 bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-400 text-sm">{t('success')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-[#0D1028] px-3 py-1.5 rounded font-mono">{createdPassword}</code>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 w-7 p-0">
                {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            <p className="text-xs text-[#8B93A8] mt-2">{t('passwordShown')}</p>
          </CardContent>
        </Card>
      )}

      {serverError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{serverError}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-[#D4A843]" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  required
                  className="bg-[#0D1028]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{t('role')}</Label>
                <Select name="role" required>
                  <SelectTrigger className="bg-[#0D1028]">
                    <SelectValue placeholder={t('role')} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeId">{t('linkedEmployee')}</Label>
              <Select name="employeeId">
                <SelectTrigger className="bg-[#0D1028]">
                  <SelectValue placeholder={t('selectEmployee')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('selectEmployee')}</SelectItem>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.id.slice(0, 6)})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('password')}</Label>
                <label className="flex items-center gap-2 text-xs text-[#8B93A8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPassword}
                    onChange={(e) => setAutoPassword(e.target.checked)}
                    className="rounded border-[#4A5168]"
                  />
                  {t('generatePassword')}
                </label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('passwordPlaceholder')}
                  disabled={autoPassword}
                  minLength={autoPassword ? undefined : 8}
                  className={cn('bg-[#0D1028]', autoPassword && 'opacity-50')}
                />
                {!autoPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute end-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              {autoPassword && (
                <p className="text-xs text-[#8B93A8]">{t('noPassword')}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? <span>{t('saving')}</span> : <><UserPlus className="me-2 h-4 w-4" />{t('saveUser')}</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { employeeFormSchema, type EmployeeFormData, departments, maritalStatuses, countries } from '@/lib/validations/employee'
import { createEmployee } from '@/lib/actions/employee'
import { ArrowLeft, ChevronDown, ChevronUp, Save } from 'lucide-react'
import Link from 'next/link'

type SectionKey = 'personal' | 'job' | 'bank' | 'emergency'

const DAYS = [
  { value: 0, key: 'sun' },
  { value: 1, key: 'mon' },
  { value: 2, key: 'tue' },
  { value: 3, key: 'wed' },
  { value: 4, key: 'thu' },
  { value: 5, key: 'fri' },
  { value: 6, key: 'sat' },
] as const

function generateEmployeeCode() {
  const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  return `EMP-${num}`
}

export default function AddEmployeePage() {
  const t = useTranslations('employeesAdd')
  const tc = useTranslations('common')
  const { locale } = useParams<{ locale: string }>()
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(['personal', 'job'])
  )
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      employeeCode: generateEmployeeCode(),
      role: 'EMPLOYEE',
      workWeek: [0, 1, 2, 3, 4],
    },
  })

  function toggleSection(section: SectionKey) {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  async function onSubmit(data: EmployeeFormData) {
    setServerError('')
    setLoading(true)

    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => formData.append(key, String(v)))
      } else if (value !== undefined && value !== null) {
        formData.append(key, value as string)
      }
    })

    const result = await createEmployee(formData)

    if (result?.error) {
      setServerError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/employees`}
          className={buttonVariants({ variant: 'ghost', size: 'icon' })}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
        </div>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Section 1: Personal Information */}
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('personal')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span>{t('personalInfo')}</span>
              {expandedSections.has('personal') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.has('personal') && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('firstName')} *</Label>
                  <Input id="firstName" {...register('firstName')} disabled={loading} />
                  {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('lastName')} *</Label>
                  <Input id="lastName" {...register('lastName')} disabled={loading} />
                  {errors.lastName && <p className="text-sm text-red-500">{errors.lastName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('email')} *</Label>
                  <Input id="email" type="email" {...register('email')} disabled={loading} />
                  {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')} *</Label>
                  <Input id="password" type="password" {...register('password')} disabled={loading} />
                  {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">{t('phoneNumber')}</Label>
                  <Input id="phoneNumber" {...register('phoneNumber')} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">{t('dateOfBirth')} *</Label>
                  <Input id="dateOfBirth" type="date" {...register('dateOfBirth')} disabled={loading} />
                  {errors.dateOfBirth && <p className="text-sm text-red-500">{errors.dateOfBirth.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('nationality')} *</Label>
                  <Select onValueChange={(v) => setValue('nationality', v ?? '')} value={watch('nationality')} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder={t('nationality')} /></SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.nationality && <p className="text-sm text-red-500">{errors.nationality.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('maritalStatus')}</Label>
                  <Select onValueChange={(v) => setValue('maritalStatus', v ?? undefined)} value={watch('maritalStatus')} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder={t('maritalStatus')} /></SelectTrigger>
                    <SelectContent>
                      {maritalStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Job Details */}
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('job')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span>{t('jobDetails')}</span>
              {expandedSections.has('job') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.has('job') && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employeeCode">{t('employeeCode')} *</Label>
                  <Input id="employeeCode" {...register('employeeCode')} disabled={loading} />
                  {errors.employeeCode && <p className="text-sm text-red-500">{errors.employeeCode.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">{t('jobTitle')} *</Label>
                  <Input id="jobTitle" {...register('jobTitle')} disabled={loading} />
                  {errors.jobTitle && <p className="text-sm text-red-500">{errors.jobTitle.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('department')} *</Label>
                  <Select onValueChange={(v) => setValue('department', v ?? '')} value={watch('department')} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder={t('department')} /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.department && <p className="text-sm text-red-500">{errors.department.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hireDate">{t('hireDate')} *</Label>
                  <Input id="hireDate" type="date" {...register('hireDate')} disabled={loading} />
                  {errors.hireDate && <p className="text-sm text-red-500">{errors.hireDate.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salary">{t('salary')} *</Label>
                  <Input id="salary" {...register('salary')} placeholder="5000.00" disabled={loading} />
                  {errors.salary && <p className="text-sm text-red-500">{errors.salary.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('role')} *</Label>
                  <Select onValueChange={(v) => setValue('role', (v ?? 'EMPLOYEE') as 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE')} value={watch('role')} disabled={loading}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">{t('roleEmployee')}</SelectItem>
                      <SelectItem value="MANAGER">{t('roleManager')}</SelectItem>
                      <SelectItem value="HR_ADMIN">{t('roleHrAdmin')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>{t('workWeek')} *</Label>
                  <div className="flex flex-wrap gap-4">
                    {DAYS.map((day) => (
                      <label key={day.value} className="flex items-center gap-2 text-sm font-normal">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          value={day.value}
                          disabled={loading}
                          {...register('workWeek')}
                        />
                        {t(`days.${day.key}`)}
                      </label>
                    ))}
                  </div>
                  {errors.workWeek && <p className="text-sm text-red-500">{errors.workWeek.message}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 3: Bank Details (optional) */}
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('bank')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span className="flex items-center gap-2">
                {t('bankDetails')}
                <Badge variant="secondary" className="text-xs">{t('optional')}</Badge>
              </span>
              {expandedSections.has('bank') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.has('bank') && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">{t('bankName')}</Label>
                  <Input id="bankName" {...register('bankName')} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">{t('iban')}</Label>
                  <Input id="iban" {...register('iban')} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swift">{t('swift')}</Label>
                  <Input id="swift" {...register('swift')} disabled={loading} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 4: Emergency Contact (optional) */}
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('emergency')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span className="flex items-center gap-2">
                {t('emergencyContact')}
                <Badge variant="secondary" className="text-xs">{t('optional')}</Badge>
              </span>
              {expandedSections.has('emergency') ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedSections.has('emergency') && (
              <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">{t('emergencyContactName')}</Label>
                  <Input id="emergencyContactName" {...register('emergencyContactName')} disabled={loading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">{t('emergencyContactPhone')}</Label>
                  <Input id="emergencyContactPhone" {...register('emergencyContactPhone')} disabled={loading} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link
            href={`/${locale}/employees`}
            className={buttonVariants({ variant: 'outline' })}
          >
            {tc('cancel')}
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? t('saving') : <><Save className="me-2 h-4 w-4" />{t('save')}</>}
          </Button>
        </div>
      </form>
    </div>
  )
}

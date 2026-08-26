'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { departments, maritalStatuses, countries } from '@/lib/validations/employee'
import { updateEmployee } from '@/lib/actions/employee'
import { ArrowLeft, ChevronDown, ChevronUp, Save } from 'lucide-react'
import Link from 'next/link'

const editEmployeeSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  phoneNumber: z.string().optional(),
  jobTitle: z.string().min(1, 'Required').max(100),
  department: z.string().min(1, 'Required'),
  nationality: z.string().min(1, 'Required'),
  dateOfBirth: z.string().min(1, 'Required'),
  maritalStatus: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  managerId: z.string().optional(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  salary: z.string().min(1, 'Required').regex(/^\d+(\.\d{1,2})?$/, 'Invalid format'),
})

type EditEmployeeFormData = z.infer<typeof editEmployeeSchema>

type SectionKey = 'personal' | 'job' | 'bank' | 'emergency'

interface EditEmployeeClientProps {
  employee: {
    id: string
    firstName: string
    lastName: string
    phoneNumber: string
    jobTitle: string
    department: string
    nationality: string
    dateOfBirth: string
    maritalStatus: string
    emergencyContactName: string
    emergencyContactPhone: string
    managerId: string
    bankName: string
    iban: string
    swift: string
    salary: string
  }
  managers: { id: string; firstName: string; lastName: string }[]
  locale: string
}

export function EditEmployeeClient({ employee, managers, locale }: EditEmployeeClientProps) {
  const t = useTranslations('editEmployee')
  const tc = useTranslations('common')
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
  } = useForm<EditEmployeeFormData>({
    resolver: zodResolver(editEmployeeSchema),
    defaultValues: {
      firstName: employee.firstName,
      lastName: employee.lastName,
      phoneNumber: employee.phoneNumber,
      jobTitle: employee.jobTitle,
      department: employee.department,
      nationality: employee.nationality,
      dateOfBirth: employee.dateOfBirth,
      maritalStatus: employee.maritalStatus,
      emergencyContactName: employee.emergencyContactName,
      emergencyContactPhone: employee.emergencyContactPhone,
      managerId: employee.managerId,
      bankName: employee.bankName,
      iban: employee.iban,
      swift: employee.swift,
      salary: employee.salary,
    },
  })

  const managerIdValue = watch('managerId')
  const managerSelectValue = managerIdValue != null ? managerIdValue : 'none'

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

  async function onSubmit(data: EditEmployeeFormData) {
    setServerError('')
    setLoading(true)

    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as string)
      }
    })

    const result = await updateEmployee(employee.id, formData)

    if (result?.error) {
      setServerError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/${locale}/employees/${employee.id}`}
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
                  <Label htmlFor="salary">{t('salary')} *</Label>
                  <Input id="salary" {...register('salary')} placeholder="5000.00" disabled={loading} />
                  {errors.salary && <p className="text-sm text-red-500">{errors.salary.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('manager')}</Label>
                  <Select onValueChange={(v) => setValue('managerId', v === 'none' ? '' : v ?? '')} value={managerSelectValue} disabled={loading}>
                    <SelectTrigger><SelectValue placeholder={t('manager')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('noManager')}</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.firstName} {m.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('bank')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span className="flex items-center gap-2">
                {t('bankDetails')}
                <Badge variant="secondary" className="text-xs">{tc('optional') || 'Optional'}</Badge>
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

        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => toggleSection('emergency')}
              className="flex w-full items-center justify-between p-4 font-medium"
            >
              <span className="flex items-center gap-2">
                {t('emergencyContact')}
                <Badge variant="secondary" className="text-xs">{tc('optional') || 'Optional'}</Badge>
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
            href={`/${locale}/employees/${employee.id}`}
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

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
import { submitLeaveSchema, type SubmitLeaveData } from '@/lib/validations/leave'
import { submitLeave } from '@/lib/actions/leave'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface SubmitLeaveFormProps {
  leaveTypes: { id: string; name: string; requiresAttachment: boolean }[]
  locale: string
}

export default function SubmitLeaveForm({ leaveTypes, locale }: SubmitLeaveFormProps) {
  const t = useTranslations('leave')
  const tc = useTranslations('common')
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SubmitLeaveData>({
    resolver: zodResolver(submitLeaveSchema),
  })

  const selectedType = leaveTypes.find((lt) => lt.id === watch('leaveTypeId'))

  async function onSubmit(data: SubmitLeaveData) {
    setServerError('')
    setLoading(true)

    const formData = new FormData()
    formData.append('leaveTypeId', data.leaveTypeId)
    formData.append('startDate', data.startDate)
    formData.append('endDate', data.endDate)
    formData.append('isHalfDay', isHalfDay ? 'true' : 'false')
    if (isHalfDay && data.halfDayPeriod) formData.append('halfDayPeriod', data.halfDayPeriod)
    formData.append('reason', data.reason)
    if (attachmentFile) formData.append('attachment', attachmentFile)

    const result = await submitLeave(formData)
    if (result?.error) {
      setServerError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/${locale}/leave`} className="text-sm text-blue-600 hover:underline">
          <ArrowLeft className="me-1 inline h-4 w-4" />
          {tc('back')}
        </Link>
        <h1 className="text-2xl font-bold">{t('submitNew')}</h1>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">{serverError}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-2">
              <Label>{t('type')} *</Label>
              <Select onValueChange={(v) => setValue('leaveTypeId', v ?? '')} value={watch('leaveTypeId') || ''}>
                <SelectTrigger><SelectValue placeholder={t('selectType')} /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>{lt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.leaveTypeId && <p className="text-sm text-red-500">{errors.leaveTypeId.message}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">{t('startDate')} *</Label>
                <Input id="startDate" type="date" {...register('startDate')} disabled={loading} />
                {errors.startDate && <p className="text-sm text-red-500">{errors.startDate.message}</p>}
              </div>
              {!isHalfDay && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">{t('endDate')} *</Label>
                  <Input id="endDate" type="date" {...register('endDate')} disabled={loading} />
                  {errors.endDate && <p className="text-sm text-red-500">{errors.endDate.message}</p>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isHalfDay} onChange={(e) => setIsHalfDay(e.target.checked)} />
                {t('halfDay')}
              </label>
              {isHalfDay && (
                <Select onValueChange={(v) => setValue('halfDayPeriod', v ?? '')} value={watch('halfDayPeriod') || ''}>
                  <SelectTrigger><SelectValue placeholder={t('halfDayPeriod')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">{t('morning')}</SelectItem>
                    <SelectItem value="afternoon">{t('afternoon')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">{t('reason')} *</Label>
              <textarea
                id="reason"
                {...register('reason')}
                className="w-full rounded-lg border border-input bg-transparent p-2 text-sm"
                rows={3}
                disabled={loading}
              />
              {errors.reason && <p className="text-sm text-red-500">{errors.reason.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">
                {t('attachment')}
                {selectedType?.requiresAttachment && <span className="text-red-500"> *</span>}
              </Label>
              <Input
                id="attachment"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                disabled={loading}
              />
              {selectedType?.requiresAttachment && (
                <p className="text-xs text-muted-foreground">{t('validation.sickRequiresAttachment')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Link href={`/${locale}/leave`} className={buttonVariants({ variant: 'outline' })}>
            {tc('cancel')}
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? t('submitting') : t('submitNew')}
          </Button>
        </div>
      </form>
    </div>
  )
}

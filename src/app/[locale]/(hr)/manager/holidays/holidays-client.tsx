'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createHoliday, deleteHoliday } from '@/lib/actions/holiday'
import { Trash2 } from 'lucide-react'

interface HolidaysClientProps {
  holidays: any[]
}

export default function HolidaysClient({ holidays }: HolidaysClientProps) {
  const t = useTranslations('holidays')
  const [saving, setSaving] = useState(false)

  async function handleCreate(formData: FormData) {
    setSaving(true)
    const res = await createHoliday(formData)
    if (res?.error) toast.error(res.error)
    setSaving(false)
  }

  async function handleDelete(formData: FormData) {
    const res = await deleteHoliday(formData)
    if (res?.error) toast.error(res.error)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="rounded-lg border bg-[#0D1028] p-5 max-w-md">
        <h2 className="mb-4 font-medium">{t('addTitle')}</h2>
        <form action={handleCreate} className="space-y-3">
          <Input name="name" placeholder={t('name')} required maxLength={100} />
          <Input name="nameAr" placeholder={t('nameAr')} maxLength={100} />
          <Input name="date" type="date" required />
          <Button type="submit" size="xs" disabled={saving}>
            {t('add')}
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-[#0D1028]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[rgba(255,255,255,0.03)] text-left">
              <th className="p-3 font-medium">{t('date')}</th>
              <th className="p-3 font-medium">{t('name')}</th>
              <th className="p-3 font-medium">{t('nameAr')}</th>
              <th className="p-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {holidays.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-3 text-center text-[#8B93A8]">
                  {t('empty')}
                </td>
              </tr>
            ) : (
              holidays.map((holiday) => (
                <tr key={holiday.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="p-3">
                    {new Date(holiday.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-3 font-medium">{holiday.name}</td>
                  <td className="p-3">{holiday.nameAr || '-'}</td>
                  <td className="p-3 text-end">
                    <form action={handleDelete}>
                      <input type="hidden" name="id" value={holiday.id} />
                      <Button type="submit" size="xs" variant="ghost" aria-label={t('delete')}>
                        <Trash2 className="h-3 w-3 text-[#EF4444]" />
                      </Button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

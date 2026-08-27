'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { deleteReview } from '@/lib/actions/performance'
import { EmployeePicker } from '@/components/employee-picker'
import { Plus, Trash2, Eye } from 'lucide-react'
import { useState } from 'react'
import { useParams } from 'next/navigation'

interface ReviewData {
  id: string
  employeeId: string
  employeeName: string
  department: string
  year: number
  quarter: number
  overallRating: string | null
  status: string
  createdAt: string
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
}

interface Props {
  employeeId: string
  reviews: ReviewData[]
  employees: EmployeeData[]
}

export function PerformanceClient({ employeeId, reviews, employees }: Props) {
  const t = useTranslations('performance')
  const router = useRouter()
  const { locale } = useParams<{ locale: string }>()
  const [filterQuarter, setFilterQuarter] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [message, setMessage] = useState('')

  const currentYear = new Date().getFullYear()

  const filtered = reviews.filter(r => {
    if (employeeId && r.employeeId !== employeeId) return false
    if (filterQuarter && r.quarter !== parseInt(filterQuarter)) return false
    if (filterYear && r.year !== parseInt(filterYear)) return false
    if (filterStatus && r.status !== filterStatus) return false
    return true
  })

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return
    const form = new FormData()
    form.set('id', id)
    const result = await deleteReview(form)
    if (result?.error) setMessage(result.error)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex items-center gap-2">
          <EmployeePicker employees={employees} employeeId={employeeId} label={t('selectEmployee')} />
          <Button onClick={() => router.push(`/${locale}/manager/performance/new?employee=${employeeId}`)}>
            <Plus className="me-2 h-4 w-4" />
            {t('newReview')}
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded-md bg-[rgba(239,68,68,0.08)] p-3 text-sm text-[#EF4444]">{message}</div>
      )}

      <div className="flex flex-wrap gap-2">
        <select className="rounded border bg-[#0D1028] px-3 py-2 text-sm" value={filterQuarter} onChange={e => setFilterQuarter(e.target.value)}>
          <option value="">{t('allQuarters')}</option>
          {[1, 2, 3, 4].map(q => (
            <option key={q} value={q}>{t(`q${q}`)}</option>
          ))}
        </select>
        <select className="rounded border bg-[#0D1028] px-3 py-2 text-sm" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
          <option value="">{t('allYears')}</option>
          {[currentYear, currentYear - 1, currentYear - 2].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select className="rounded border bg-[#0D1028] px-3 py-2 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{t('allStatuses')}</option>
          <option value="DRAFT">{t('statusValues.DRAFT')}</option>
          <option value="COMPLETED">{t('statusValues.COMPLETED')}</option>
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                  <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('department')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('year')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('quarter')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('overallRating')}</th>
                  <th className="px-4 py-3 text-start font-medium">{t('status')}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[#8B93A8]">{t('noReviews')}</td>
                  </tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                    <td className="px-4 py-3">{r.employeeName}</td>
                    <td className="px-4 py-3">{r.department}</td>
                    <td className="px-4 py-3">{r.year}</td>
                    <td className="px-4 py-3">{t(`q${r.quarter}`)}</td>
                    <td className="px-4 py-3">{r.overallRating ? t(`ratingValues.${r.overallRating}`) : '-'}</td>
                    <td className="px-4 py-3">{t(`statusValues.${r.status}`)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/${locale}/manager/performance/${r.id}`)}>
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="h-3 w-3 text-audit-red" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

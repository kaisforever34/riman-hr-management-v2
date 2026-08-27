'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'

interface TerminationRecord {
  id: string
  employeeName: string
  employeeCode: string
  department: string
  jobTitle: string
  terminationDate: string
  yearsOfService: number
  lastSalary: number
  eosbAmount: number
}

export default function TerminationsClient({ records }: { records: TerminationRecord[] }) {
  const t = useTranslations('terminations')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-[#8B93A8]">{t('subtitle')}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#8B93A8]">{t('noRecords')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-[rgba(255,255,255,0.03)]">
                    <th className="px-4 py-3 text-start font-medium">{t('employee')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('department')}</th>
                    <th className="px-4 py-3 text-start font-medium">{t('terminationDate')}</th>
                    <th className="px-4 py-3 text-end font-medium">{t('yearsOfService')}</th>
                    <th className="px-4 py-3 text-end font-medium">{t('lastSalary')}</th>
                    <th className="px-4 py-3 text-end font-medium">{t('eosb')}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-[rgba(255,255,255,0.03)]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.employeeName}</div>
                        <div className="text-xs text-[#8B93A8]">{r.employeeCode} · {r.jobTitle}</div>
                      </td>
                      <td className="px-4 py-3 text-[#8B93A8]">{r.department}</td>
                      <td className="px-4 py-3 text-[#8B93A8]">{format(new Date(r.terminationDate), 'dd MMM yyyy')}</td>
                      <td className="px-4 py-3 text-end">{r.yearsOfService.toFixed(2)} yrs</td>
                      <td className="px-4 py-3 text-end">{r.lastSalary.toLocaleString()} AED</td>
                      <td className="px-4 py-3 text-end font-medium text-[#EFC254]">{r.eosbAmount.toLocaleString()} AED</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarClientProps {
  requests: any[]
  locale: string
}

export default function CalendarClient({ requests }: CalendarClientProps) {
  const t = useTranslations('managerLeaves')
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  function getRequestsForDay(day: number) {
    return requests.filter((r: any) => {
      const start = new Date(r.startDate)
      const end = new Date(r.endDate)
      const date = new Date(year, month, day)
      return date >= start && date <= end
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('calendar')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-32 text-center font-medium">{monthNames[month]} {year}</span>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b">
          {dayNames.map((d) => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-24 border-b border-r p-1" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dayRequests = getRequestsForDay(day)
            return (
              <div key={day} className="min-h-24 border-b border-r p-1">
                <p className="text-xs font-medium">{day}</p>
                <div className="mt-1 space-y-0.5">
                  {dayRequests.map((r: any) => (
                    <div
                      key={r.id}
                      className="truncate rounded bg-[rgba(75,139,240,0.1)] px-1 py-0.5 text-[10px] text-inquiry-blue"
                      title={`${r.employee.firstName} ${r.employee.lastName} - ${r.leaveType.name}`}
                    >
                      {r.employee.firstName}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmployeeCard } from './employee-card'
import { EmployeeDetail } from './employee-detail'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  jobTitle: string
  department: string
  employeeCode: string
  email: string
  phone: string | null
  emergencyContact: string | null
  emergencyPhone: string | null
  joinDate: string | null
  isManager: boolean
}

interface Props {
  managers: EmployeeData[]
  staff: EmployeeData[]
}

export function DirectoryClient({ managers, staff }: Props) {
  const t = useTranslations('directory')
  const [query, setQuery] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [selected, setSelected] = useState<EmployeeData | null>(null)

  const allEmployees = useMemo(() => [...managers, ...staff], [managers, staff])

  const departments = useMemo(
    () => [...new Set(allEmployees.map((e) => e.department))].sort(),
    [allEmployees]
  )

  const filteredManagers = useMemo(() => {
    return managers.filter((e) => {
      if (deptFilter && e.department !== deptFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [managers, deptFilter, query])

  const filteredStaff = useMemo(() => {
    return staff.filter((e) => {
      if (deptFilter && e.department !== deptFilter) return false
      if (query) {
        const q = query.toLowerCase()
        return (
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.jobTitle.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [staff, deptFilter, query])

  const grouped = useMemo(() => {
    const map = new Map<string, EmployeeData[]>()
    for (const emp of filteredStaff) {
      const dept = emp.department || 'Other'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(emp)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredStaff])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ledger-text-muted" />
          <Input
            name="q"
            placeholder={t('search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <select
          className="rounded border bg-card px-3 py-2 text-sm"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">{t('allDepartments')}</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="space-y-8">
        {filteredManagers.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-warning-amber uppercase tracking-wider mb-3">
              {t('management')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredManagers.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onClick={() => setSelected(emp)}
                  variant="gold"
                />
              ))}
            </div>
          </div>
        )}
        {grouped.map(([dept, emps]) => (
          <div key={dept}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {dept} ({emps.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {emps.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  employee={emp}
                  onClick={() => setSelected(emp)}
                />
              ))}
            </div>
          </div>
        ))}
        {filteredManagers.length === 0 && grouped.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            {t('noResults')}
          </div>
        )}
      </div>

      {selected && (
        <EmployeeDetail
          employee={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

'use client'

import { useRouter, usePathname } from 'next/navigation'

interface EmployeePickerProps {
  employees: { id: string; firstName: string; lastName: string }[]
  employeeId: string
  label: string
}

export function EmployeePicker({ employees, employeeId, label }: EmployeePickerProps) {
  const router = useRouter()
  const pathname = usePathname()

  if (employees.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] text-[#8B93A8]">{label}</span>
      <select
        className="rounded-lg border border-[rgba(255,255,255,0.065)] bg-[#0D1028] px-3 py-2 text-[13px] text-[#E0E6F4] outline-none focus-visible:border-[rgba(212,168,67,0.4)]"
        value={employeeId}
        onChange={e => router.push(`${pathname}?employee=${e.target.value}`)}
      >
        {employees.map(emp => (
          <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
        ))}
      </select>
    </div>
  )
}

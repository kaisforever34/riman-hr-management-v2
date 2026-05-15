'use client'

import { Avatar } from '@/components/shared'

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
  employee: EmployeeData
  onClick: () => void
  variant?: 'default' | 'gold'
}

export function EmployeeCard({ employee: e, onClick, variant = 'default' }: Props) {
  const ini = `${e.firstName[0]}${e.lastName[0]}`.toUpperCase()

  const borderCls = variant === 'gold'
    ? 'border-[rgba(212,168,67,0.3)] bg-[rgba(212,168,67,0.04)]'
    : 'border-[rgba(255,255,255,0.065)] bg-[#0D1028]'

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 rounded-xl ${borderCls} p-4 text-start transition-all duration-150 hover:border-[rgba(255,255,255,0.13)] hover:bg-[rgba(255,255,255,0.02)] cursor-pointer`}
    >
      <Avatar ini={ini} sz={44} />
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold text-[#E0E6F4] truncate">
          {e.firstName} {e.lastName}
        </div>
        <div className="text-[12.5px] text-muted-foreground truncate mt-0.5">
          {e.jobTitle}
        </div>
        <div className="mt-1">
          <span className="inline-block text-[10.5px] font-medium px-2 py-0.5 rounded-full bg-[rgba(212,168,67,0.12)] text-[#D4A843] border border-[rgba(212,168,67,0.2)]">
            {e.department}
          </span>
        </div>
      </div>
    </button>
  )
}

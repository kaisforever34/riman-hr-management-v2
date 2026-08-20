'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { X, Mail, Phone, Hash, Calendar, AlertTriangle } from 'lucide-react'
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
  onClose: () => void
}

export function EmployeeDetail({ employee: e, onClose }: Props) {
  const t = useTranslations('directory')

  useEffect(() => {
    const handler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const ini = `${e.firstName[0]}${e.lastName[0]}`.toUpperCase()

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 end-0 z-50 w-full max-w-sm bg-[#0D1028] border-s border-[rgba(255,255,255,0.065)] shadow-2xl overflow-y-auto animate-slide-in">
        <div className="p-6">
          <div className="flex justify-between items-start mb-8">
            <Avatar ini={ini} sz={56} />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#8B93A8] hover:text-[#E0E6F4] hover:bg-[rgba(255,255,255,0.05)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <h2 className="text-xl font-bold text-[#E0E6F4] font-syne">
            {e.firstName} {e.lastName}
          </h2>
          <p className="text-sm text-[#8B93A8] mt-1">{e.jobTitle}</p>
          <div className="mt-3">
            <span className="inline-block text-[11px] font-medium px-2.5 py-1 rounded-full bg-[rgba(212,168,67,0.12)] text-[#D4A843] border border-[rgba(212,168,67,0.2)]">
              {e.department}
            </span>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-[#8B93A8] shrink-0" />
              <a href={`mailto:${e.email}`} className="text-[#4B8BF0] hover:underline truncate">
                {e.email}
              </a>
            </div>
            {e.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone size={16} className="text-[#8B93A8] shrink-0" />
                <span className="text-[#E0E6F4]">{e.phone}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Hash size={16} className="text-[#8B93A8] shrink-0" />
              <span className="text-[#8B93A8]">{e.employeeCode}</span>
            </div>
            {e.joinDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar size={16} className="text-[#8B93A8] shrink-0" />
                <span className="text-[#8B93A8]">
                  {new Date(e.joinDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {(e.emergencyContact || e.emergencyPhone) && (
            <div className="mt-8 pt-6 border-t border-[rgba(255,255,255,0.065)]">
              <div className="flex items-center gap-2 text-sm font-medium text-[#F59E0B] mb-3">
                <AlertTriangle size={14} />
                {t('emergencyContact')}
              </div>
              {e.emergencyContact && (
                <p className="text-sm text-[#E0E6F4]">{e.emergencyContact}</p>
              )}
              {e.emergencyPhone && (
                <p className="text-sm text-[#8B93A8] mt-1">{e.emergencyPhone}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

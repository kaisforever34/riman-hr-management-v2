'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { completeOnboardingTask, skipTask } from '@/lib/actions/onboarding'
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

type TaskItem = {
  id: string
  status: string
  assignedTo: string
  completedAt: string | null
  formData: unknown
  notes: string | null
  taskTemplate: {
    titleEn: string
    titleAr: string
    category: string
  }
}

type OnboardingDetail = {
  id: string
  type: string
  status: string
  reason: string | null
  startedAt: string
  completedAt: string | null
  employee: {
    firstName: string
    lastName: string
    jobTitle: string
    department: string
    employeeCode: string
  }
  tasks: TaskItem[]
}

export default function OnboardingDetailClient({ record, locale }: { record: OnboardingDetail; locale: string }) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [completing, setCompleting] = useState<string | null>(null)

  const total = record.tasks.length
  const done = record.tasks.filter((t) => t.status === 'COMPLETED').length
  const pendingEmployee = record.tasks.filter((t) => t.assignedTo === 'EMPLOYEE' && t.status === 'PENDING').length
  const pendingManager = record.tasks.filter((t) => t.assignedTo === 'MANAGER' && t.status === 'PENDING').length

  async function handleComplete(taskId: string) {
    setCompleting(taskId)
    await completeOnboardingTask(taskId)
    setCompleting(null)
    router.refresh()
  }

  async function handleSkip(taskId: string) {
    setCompleting(taskId)
    await skipTask(taskId)
    setCompleting(null)
    router.refresh()
  }

  const statusColors: Record<string, string> = {
    IN_PROGRESS: 'bg-[#D4A843] text-[#07091A]',
    COMPLETED: 'bg-[#22A854] text-white',
    PENDING: 'bg-[#8B93A8] text-white',
    CANCELLED: 'bg-[#EF4444] text-white',
  }

  return (
    <div className="p-6 max-w-3xl">
      <Link href={`/${locale}/manager/${record.type.toLowerCase()}`} className="inline-flex items-center gap-1 text-[#8B93A8] hover:text-[#E0E6F4] text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t('back')}
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">
            {record.employee.firstName} {record.employee.lastName}
          </h1>
          <p className="text-sm text-[#8B93A8]">
            {record.employee.jobTitle} &middot; {record.employee.department}
            {record.reason && <span> &middot; {record.reason}</span>}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[record.status] || 'bg-[#8B93A8] text-white'}`}>
          {record.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#0D1028] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
          <div className="text-2xl font-bold text-[#D4A843]">{done}/{total}</div>
          <div className="text-xs text-[#8B93A8]">{t('tasksCompleted')}</div>
        </div>
        <div className="bg-[#0D1028] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
          <div className="text-2xl font-bold text-[#E0E6F4]">{pendingEmployee}</div>
          <div className="text-xs text-[#8B93A8]">{t('pendingEmployee')}</div>
        </div>
        <div className="bg-[#0D1028] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
          <div className="text-2xl font-bold text-[#E0E6F4]">{pendingManager}</div>
          <div className="text-xs text-[#8B93A8]">{t('pendingManager')}</div>
        </div>
      </div>

      <div className="space-y-2">
        {record.tasks.map((task) => {
          const isDone = task.status === 'COMPLETED'
          const isManagerTask = task.assignedTo === 'MANAGER'
          return (
            <div
              key={task.id}
              className={`flex items-center gap-3 p-3 rounded-xl border ${
                isDone
                  ? 'bg-[#0D1028] border-[rgba(34,168,84,0.2)]'
                  : isManagerTask
                    ? 'bg-[rgba(212,168,67,0.04)] border-[#D4A84333]'
                    : 'bg-[#0D1028] border-[rgba(255,255,255,0.065)]'
              }`}
            >
              {isDone ? (
                <CheckCircle className="w-5 h-5 text-[#22A854] flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-[#D4A843] flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[#E0E6F4]">{task.taskTemplate.titleEn}</span>
                <span className="text-xs text-[#8B93A8] ml-2">
                  {task.assignedTo === 'EMPLOYEE' ? t('employee') : t('manager')}
                  {task.completedAt && ` · ${new Date(task.completedAt).toLocaleDateString()}`}
                </span>
              </div>

              {!isDone && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleComplete(task.id)}
                    disabled={completing === task.id}
                    className="px-3 py-1.5 bg-[#D4A843] text-[#07091A] rounded-lg text-xs font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50"
                  >
                    {completing === task.id ? '...' : t('complete')}
                  </button>
                  <button
                    onClick={() => handleSkip(task.id)}
                    disabled={completing === task.id}
                    className="px-3 py-1.5 bg-[#0F1120] text-[#8B93A8] border border-[rgba(255,255,255,0.1)] rounded-lg text-xs font-medium hover:text-[#E0E6F4] transition-colors disabled:opacity-50"
                  >
                    {t('skip')}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

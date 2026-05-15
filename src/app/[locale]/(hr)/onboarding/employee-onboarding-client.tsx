'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { completeOnboardingTask } from '@/lib/actions/onboarding'
import { CheckCircle, Circle } from 'lucide-react'

type TaskItem = {
  id: string
  status: string
  assignedTo: string
  formData: unknown
  taskTemplate: {
    id: string
    titleEn: string
    titleAr: string
    category: string
  }
}

type OnboardingData = {
  id: string
  type: string
  status: string
  tasks: TaskItem[]
}

export default function EmployeeOnboardingClient({ record }: { record: OnboardingData | null; locale: string }) {
  const t = useTranslations('onboarding')
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  if (!record) {
    return (
      <div className="p-6 text-center">
        <p className="text-[#8B93A8]">{t('noActiveOnboarding')}</p>
      </div>
    )
  }

  const total = record.tasks.length
  const done = record.tasks.filter((t) => t.status === 'COMPLETED').length
  const myTasks = record.tasks.filter((t) => t.assignedTo === 'EMPLOYEE')
  const pendingTasks = myTasks.filter((t) => t.status === 'PENDING')

  async function handleComplete(taskId: string) {
    setLoading(taskId)
    await completeOnboardingTask(taskId)
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-syne font-bold text-[#E0E6F4]">{t('employeeTitle')}</h1>
        <p className="text-sm text-[#8B93A8]">{t('employeeSubtitle')}</p>
      </div>

      <div className="bg-[#0D0F1A] rounded-xl p-4 border border-[rgba(255,255,255,0.065)] mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-[#E0E6F4]">{t('yourChecklist')}</span>
          {pendingTasks.length > 0 && (
            <span className="px-2 py-0.5 bg-[#D4A843] text-[#07091A] rounded-full text-xs font-medium">
              {pendingTasks.length} {t('remaining')}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {myTasks.map((task) => {
            const isDone = task.status === 'COMPLETED'
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isDone
                    ? 'bg-[#0F1120] border-[rgba(34,168,84,0.2)]'
                    : 'bg-[#0F1120] border-[#D4A84333]'
                }`}
              >
                {isDone ? (
                  <CheckCircle className="w-5 h-5 text-[#22A854] flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-[#D4A843] flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <span className="text-sm text-[#E0E6F4]">{task.taskTemplate.titleEn}</span>
                  <span className="text-xs text-[#8B93A8] ml-2">
                    {task.taskTemplate.category === 'FORM' ? t('form') : t('document')}
                  </span>
                </div>

                {!isDone && (
                  <button
                    onClick={() => handleComplete(task.id)}
                    disabled={loading === task.id}
                    className="px-3 py-1 bg-[#D4A843] text-[#07091A] rounded-lg text-xs font-medium hover:bg-[#C49A3A] transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {loading === task.id ? '...' : task.taskTemplate.category === 'FORM' ? t('fillForm') : t('upload')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-[#0D0F1A] rounded-xl p-4 border border-[rgba(255,255,255,0.065)]">
        <div className="text-sm text-[#8B93A8]">
          {t('progress')}: {done}/{total} {t('tasksCompleted')}
        </div>
      </div>
    </div>
  )
}

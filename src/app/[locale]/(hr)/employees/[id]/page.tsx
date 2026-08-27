import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import { DeactivateButton } from '../deactivate-button'
import { ResetPasswordButton } from '../reset-password-button'

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await params
  const t = await getTranslations('employeeDetail')

  const session = await auth()
  if (!session?.user) return notFound()

  const employee = await db.employee.findUnique({
    where: { id },
    include: { user: true, manager: { include: { user: true } } },
  })

  if (!employee) return notFound()

  const canManage = session.user.role === 'HR_ADMIN' || session.user.role === 'MANAGER'

  const workWeek = JSON.parse(employee.workWeek) as number[]
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/employees`}
            className={buttonVariants({ variant: 'ghost', size: 'icon' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-muted-foreground">{employee.jobTitle} — {employee.department}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Link
              href={`/${locale}/employees/${id}/edit`}
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <Edit className="me-1 h-3.5 w-3.5" />
              {t('edit')}
            </Link>
          )}
          {session.user.role === 'HR_ADMIN' && (
            <>
              <ResetPasswordButton userId={employee.userId} />
              <DeactivateButton userId={employee.userId} />
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('personalInfo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('employeeCode')}</span>
              <span>{employee.employeeCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('email')}</span>
              <span>{employee.user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('phoneNumber')}</span>
              <span>{employee.phoneNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('dateOfBirth')}</span>
              <span>{employee.dateOfBirth.toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('gender')}</span>
              <span>{employee.gender || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('nationality')}</span>
              <span>{employee.nationality}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('maritalStatus')}</span>
              <span>{employee.maritalStatus || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('status')}</span>
              <Badge variant={employee.isActive ? 'default' : 'secondary'}>
                {employee.isActive ? t('active') : t('inactive')}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('jobDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('jobTitle')}</span>
              <span>{employee.jobTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('department')}</span>
              <span>{employee.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('salary')}</span>
              <span>{employee.salary.toLocaleString()} AED</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span className="text-muted-foreground">{t('basicSalary')}</span>
              <span>{(employee.basicSalary || 0).toLocaleString()} AED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('housingAllowance')}</span>
              <span>{(employee.housingAllowance || 0).toLocaleString()} AED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('transportAllowance')}</span>
              <span>{(employee.transportAllowance || 0).toLocaleString()} AED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('otherAllowances')}</span>
              <span>{(employee.otherAllowances || 0).toLocaleString()} AED</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('manager')}</span>
              <span>{employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('workWeek')}</span>
              <span>{workWeek.map((d) => dayNames[d]).join(', ')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('contractVisa')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('contractType')}</span>
              <span>{employee.contractType ? t(`contract_${employee.contractType.toLowerCase()}`) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('contractStartDate')}</span>
              <span>{employee.contractStartDate ? employee.contractStartDate.toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('contractEndDate')}</span>
              <span>{employee.contractEndDate ? employee.contractEndDate.toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('probationEndDate')}</span>
              <span>{employee.probationEndDate ? employee.probationEndDate.toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('visaExpiryDate')}</span>
              <span>{employee.visaExpiryDate ? employee.visaExpiryDate.toLocaleDateString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('iqamaNumber')}</span>
              <span>{employee.iqamaNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('iqamaExpiryDate')}</span>
              <span>{employee.iqamaExpiryDate ? employee.iqamaExpiryDate.toLocaleDateString() : '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('bankDetails')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('bankName')}</span>
              <span>{employee.bankName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('iban')}</span>
              <span>{employee.iban || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('swift')}</span>
              <span>{employee.swift || '—'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('emergencyContact')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('emergencyContactName')}</span>
              <span>{employee.emergencyContactName || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('emergencyContactPhone')}</span>
              <span>{employee.emergencyContactPhone || '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

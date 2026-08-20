import { db } from '@/lib/db'

export async function getPayrollPeriods() {
  return db.payrollPeriod.findMany({
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: {
      _count: { select: { payslips: true } },
    },
  })
}

export async function getPayrollPeriod(id: string) {
  return db.payrollPeriod.findUnique({
    where: { id },
    include: {
      payslips: {
        include: {
          employee: { select: { firstName: true, lastName: true, department: true } },
        },
        orderBy: { employeeId: 'asc' },
      },
    },
  })
}

export async function getPayslip(id: string) {
  return db.payslip.findUnique({
    where: { id },
    include: {
      payrollPeriod: true,
      employee: {
        select: {
          firstName: true,
          lastName: true,
          department: true,
          jobTitle: true,
          salary: true,
        },
      },
    },
  })
}

export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await db.appSetting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function getActiveEmployeesForPayroll() {
  return db.employee.findMany({
    where: { isActive: true, salary: { gt: 0 } },
    orderBy: { firstName: 'asc' },
  })
}

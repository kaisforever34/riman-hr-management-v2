import { PrismaClient, Role, AttendanceStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function uaeDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

function getUaeToday(): Date {
  const now = new Date()
  const uae = new Date(now.getTime() + 4 * 60 * 60 * 1000)
  return uaeDate(uae.getUTCFullYear(), uae.getUTCMonth() + 1, uae.getUTCDate())
}

function isWeekend(d: Date): boolean {
  const uae = new Date(d.getTime() + 4 * 60 * 60 * 1000)
  const day = uae.getUTCDay()
  return day === 5 || day === 6
}

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10)
  const empPasswordHash = await bcrypt.hash('employee123', 10)

  // ── Admin ──
  await prisma.user.upsert({
    where: { email: 'admin@riman.com' },
    update: {},
    create: {
      email: 'admin@riman.com',
      passwordHash,
      role: Role.HR_ADMIN,
      employee: {
        create: {
          firstName: 'System',
          lastName: 'Admin',
          employeeCode: 'HR-001',
          dateOfBirth: new Date('1990-01-01'),
          nationality: 'AE',
          jobTitle: 'HR Director',
          department: 'HR',
          hireDate: new Date('2020-01-01'),
          salary: 25000.00,
        },
      },
    },
  })

  // ── Leave Types ──
  const leaveTypes = [
    { name: 'Annual', nameAr: 'إجازة سنوية', defaultDays: 30, isPaid: true, requiresAttachment: false },
    { name: 'Sick', nameAr: 'إجازة مرضية', defaultDays: 15, isPaid: true, requiresAttachment: true },
    { name: 'Personal', nameAr: 'إجازة شخصية', defaultDays: 5, isPaid: false, requiresAttachment: false },
    { name: 'Maternity', nameAr: 'إجازة أمومة', defaultDays: 90, isPaid: true, requiresAttachment: false },
    { name: 'Paternity', nameAr: 'إجازة أبوة', defaultDays: 5, isPaid: true, requiresAttachment: false },
    { name: 'Hajj/Umrah', nameAr: 'إجازة حج وعمرة', defaultDays: 21, isPaid: true, requiresAttachment: false },
    { name: 'Compassionate', nameAr: 'إجازة وفاة', defaultDays: 3, isPaid: true, requiresAttachment: false },
    { name: 'Unpaid', nameAr: 'إجازة بدون راتب', defaultDays: 0, isPaid: false, requiresAttachment: false },
  ]

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({ where: { name: lt.name }, update: {}, create: lt })
  }

  // ── Onboarding / Offboarding Task Templates ──
  const onboardingTasks: { type: string; titleEn: string; titleAr: string; category: string; roles: Role[]; order: number; isRequired: boolean }[] = [
    // Onboarding: FORM tasks (employee fills)
    { type: 'ONBOARDING', titleEn: 'Personal Information', titleAr: 'المعلومات الشخصية', category: 'FORM', roles: [Role.EMPLOYEE], order: 1, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Bank Account Details', titleAr: 'تفاصيل الحساب البنكي', category: 'FORM', roles: [Role.EMPLOYEE], order: 2, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Emergency Contact', titleAr: 'جهة الاتصال في الطوارئ', category: 'FORM', roles: [Role.EMPLOYEE], order: 3, isRequired: true },
    // Onboarding: DOCUMENT tasks (employee uploads)
    { type: 'ONBOARDING', titleEn: 'Passport Copy', titleAr: 'نسخة جواز السفر', category: 'DOCUMENT', roles: [Role.EMPLOYEE], order: 4, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Visa / ID', titleAr: 'الإقامة / الهوية', category: 'DOCUMENT', roles: [Role.EMPLOYEE], order: 5, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Certificate / Qualification', titleAr: 'الشهادات / المؤهلات', category: 'DOCUMENT', roles: [Role.EMPLOYEE], order: 6, isRequired: false },
    // Onboarding: MANAGER_ACTION tasks
    { type: 'ONBOARDING', titleEn: 'Assign Workspace / Locker', titleAr: 'تخصيص مساحة عمل / خزانة', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 7, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Uniform Fitting', titleAr: 'تجهيز الزي الرسمي', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 8, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Policy Review & Acknowledgment', titleAr: 'مراجعة السياسات والتوقيع', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 9, isRequired: true },
    // Offboarding: FORM
    { type: 'OFFBOARDING', titleEn: 'Exit Interview', titleAr: 'مقابلة الخروج', category: 'FORM', roles: [Role.EMPLOYEE], order: 1, isRequired: true },
    // Offboarding: MANAGER_ACTION
    { type: 'OFFBOARDING', titleEn: 'Collect Keys / Access Cards', titleAr: 'استلام المفاتيح / بطاقات الدخول', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 2, isRequired: true },
    { type: 'OFFBOARDING', titleEn: 'Return Uniform / Equipment', titleAr: 'إعادة الزي الرسمي / المعدات', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 3, isRequired: true },
    { type: 'OFFBOARDING', titleEn: 'Final Settlement Notification', titleAr: 'إشعار التسوية النهائية', category: 'MANAGER_ACTION', roles: [Role.HR_ADMIN, Role.MANAGER], order: 4, isRequired: true },
  ]

  await prisma.onboardingTask.deleteMany()
  for (const task of onboardingTasks) {
    await prisma.onboardingTask.create({ data: task })
  }

  // ── Performance Criteria ──
  const criteria = [
    { name: 'Punctuality', nameAr: 'الالتزام بالمواعيد' },
    { name: 'Quality of Work', nameAr: 'جودة العمل' },
    { name: 'Teamwork', nameAr: 'العمل الجماعي' },
    { name: 'Attendance', nameAr: 'الحضور' },
    { name: 'Compliance', nameAr: 'الامتثال للسياسات' },
  ]

  for (const c of criteria) {
    await prisma.reviewCriteria.upsert({ where: { name: c.name }, update: {}, create: c })
  }

  // ── Sample Employees ──
  const sampleEmployees = [
    { email: 'ahmed@riman.com', firstName: 'Ahmed', lastName: 'Hassan', code: 'EMP-001', dob: uaeDate(1988, 5, 12), nationality: 'AE', jobTitle: 'Store Manager', department: 'Retail', hireDate: uaeDate(2021, 3, 1), salary: 8000.00, role: Role.MANAGER },
    { email: 'fatima@riman.com', firstName: 'Fatima', lastName: 'Ali', code: 'EMP-002', dob: uaeDate(1995, 8, 22), nationality: 'AE', jobTitle: 'Sales Associate', department: 'Retail', hireDate: uaeDate(2022, 6, 15), salary: 3500.00, role: Role.EMPLOYEE },
    { email: 'mohammed@riman.com', firstName: 'Mohammed', lastName: 'Rashed', code: 'EMP-003', dob: uaeDate(1990, 11, 3), nationality: 'AE', jobTitle: 'Warehouse Supervisor', department: 'Warehouse', hireDate: uaeDate(2020, 9, 1), salary: 5000.00, role: Role.MANAGER },
    { email: 'sara@riman.com', firstName: 'Sara', lastName: 'Khalid', code: 'EMP-004', dob: uaeDate(1998, 2, 14), nationality: 'AE', jobTitle: 'Admin Assistant', department: 'Admin', hireDate: uaeDate(2023, 1, 10), salary: 4000.00, role: Role.EMPLOYEE },
    { email: 'omar@riman.com', firstName: 'Omar', lastName: 'Said', code: 'EMP-005', dob: uaeDate(1993, 7, 30), nationality: 'AE', jobTitle: 'Cashier', department: 'Retail', hireDate: uaeDate(2022, 11, 20), salary: 3000.00, role: Role.EMPLOYEE },
  ]

  const createdEmployees: { id: string; email: string; hireDate: Date; role: Role }[] = []

  for (const emp of sampleEmployees) {
    const user = await prisma.user.upsert({
      where: { email: emp.email },
      update: { role: emp.role },
      create: {
        email: emp.email,
        passwordHash: empPasswordHash,
        role: emp.role,
        employee: {
          create: {
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeCode: emp.code,
            dateOfBirth: emp.dob,
            nationality: emp.nationality,
            jobTitle: emp.jobTitle,
            department: emp.department,
            hireDate: emp.hireDate,
            salary: emp.salary,
          },
        },
      },
      include: { employee: { select: { id: true, hireDate: true } } },
    })
    createdEmployees.push({ id: user.employee!.id, email: emp.email, hireDate: user.employee!.hireDate, role: emp.role })
  }

  // ── Manager assignments: employees report to a manager in their department ──
  const managersByDept = new Map<string, string>()
  for (const emp of createdEmployees) {
    if (emp.role === Role.MANAGER) {
      const record = sampleEmployees.find((s) => s.email === emp.email)
      if (record) managersByDept.set(record.department, emp.id)
    }
  }
  for (const emp of createdEmployees) {
    if (emp.role === Role.MANAGER) continue
    const record = sampleEmployees.find((s) => s.email === emp.email)
    if (!record) continue
    const managerId = managersByDept.get(record.department) ?? null
    await prisma.employee.update({ where: { id: emp.id }, data: { managerId } })
  }

  // ── Leave Balances for Current Year ──
  const leaveTypeRecords = await prisma.leaveType.findMany()
  const today = getUaeToday()
  const currentYear = today.getUTCFullYear()

  for (const emp of createdEmployees) {
    for (const lt of leaveTypeRecords) {
      const yearStart = new Date(Date.UTC(currentYear, 0, 1))
      const yearEnd = new Date(Date.UTC(currentYear + 1, 0, 1))
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId_yearStart: { employeeId: emp.id, leaveTypeId: lt.id, yearStart } },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          yearStart,
          yearEnd,
          allocated: lt.defaultDays,
          carriedOver: 0,
          used: 0,
        },
      })
    }
  }

  // ── Attendance Records (last 30 days, weekdays only) ──
  const workStart = { hour: 11, minute: 30 }

  for (let i = 30; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    if (isWeekend(d)) continue

    for (const emp of createdEmployees) {
      const rand = Math.random()
      let status: AttendanceStatus = AttendanceStatus.PRESENT
      let checkInHour = 11
      let checkInMin = 30 + Math.floor(Math.random() * 15)
      let lateMinutes = 0
      let checkOutHour = 20
      let checkOutMin = 15 + Math.floor(Math.random() * 20)
      const earlyLeaveMinutes = 0

      if (rand < 0.1) {
        // 10% chance absent
        status = AttendanceStatus.ABSENT
        checkInHour = 0; checkInMin = 0; checkOutHour = 0; checkOutMin = 0
      } else if (rand < 0.25) {
        // 15% chance late
        status = AttendanceStatus.LATE
        checkInHour = 11
        checkInMin = 45 + Math.floor(Math.random() * 45)
        lateMinutes = (checkInHour - workStart.hour) * 60 + (checkInMin - workStart.minute)
      }

      const checkInDate = new Date(d.getTime())
      checkInDate.setUTCHours(checkInHour, checkInMin, 0, 0)
      const checkOutDate = new Date(d.getTime())
      checkOutDate.setUTCHours(checkOutHour, checkOutMin, 0, 0)

      const recordDate = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))

      await prisma.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: emp.id, date: recordDate } },
        update: {},
        create: {
          employeeId: emp.id,
          date: recordDate,
          checkIn: status !== 'ABSENT' ? checkInDate : null,
          checkOut: status !== 'ABSENT' ? checkOutDate : null,
          status,
          lateMinutes,
          earlyLeaveMinutes: earlyLeaveMinutes,
          checkInMethod: 'CLICK',
        },
      })
    }
  }

  // ── Payroll Period - Last Month ──
  const lastMonth = today.getUTCMonth() === 0 ? 12 : today.getUTCMonth()
  const lastMonthYear = today.getUTCMonth() === 0 ? currentYear - 1 : currentYear

  const existingPeriod = await prisma.payrollPeriod.findUnique({
    where: { month_year: { month: lastMonth, year: lastMonthYear } },
  })

  if (!existingPeriod) {
    const period = await prisma.payrollPeriod.create({
      data: {
        month: lastMonth,
        year: lastMonthYear,
        status: 'DRAFT',
      },
    })

    const appSetting = await prisma.appSetting.upsert({
      where: { key: 'TRANSPORTATION_AMOUNT' },
      update: {},
      create: { key: 'TRANSPORTATION_AMOUNT', value: '500' },
    })

    const transportAmount = parseInt(appSetting.value)

    for (const emp of createdEmployees) {
      const employee = await prisma.employee.findUnique({ where: { id: emp.id } })
      if (!employee) continue

      const attendanceRecords = await prisma.attendanceRecord.findMany({
        where: {
          employeeId: emp.id,
          date: {
            gte: new Date(Date.UTC(lastMonthYear, lastMonth - 1, 1)),
            lt: new Date(Date.UTC(lastMonthYear, lastMonth, 1)),
          },
        },
      })

      const absentDays = attendanceRecords.filter(r => r.status === 'ABSENT').length
      const lateMinutesTotal = attendanceRecords.reduce((sum, r) => sum + r.lateMinutes, 0)
      const basicSalary = Number(employee.salary)
      const dailyRate = basicSalary / 30
      const absenceDeduction = dailyRate * absentDays
      const lateDeduction = lateMinutesTotal > 0 ? Math.min(lateMinutesTotal * 2, 200) : 0
      const transportDeduction = transportAmount
      const netPay = basicSalary - absenceDeduction - lateDeduction - transportDeduction

      await prisma.payslip.create({
        data: {
          payrollPeriodId: period.id,
          employeeId: emp.id,
          basicSalary,
          transportationDeduction: transportDeduction,
          absenceDeduction,
          lateDeduction,
          netPay: Math.max(netPay, 0),
        },
      })
    }
  }

  // ── Performance Reviews ──
  const reviewCriteria = await prisma.reviewCriteria.findMany({ where: { isBase: true } })
  const lastQuarter = Math.ceil(lastMonth / 3)
  const reviewQuarter = lastQuarter === 1 ? 4 : lastQuarter - 1
  const reviewYear = lastQuarter === 1 ? lastMonthYear - 1 : lastMonthYear

  const existingReview = await prisma.performanceReview.findFirst({
    where: { employeeId: createdEmployees[0].id, year: reviewYear, quarter: reviewQuarter },
  })

  if (!existingReview) {
    for (let i = 0; i < Math.min(3, createdEmployees.length); i++) {
      const emp = createdEmployees[i]
      const ratings = reviewCriteria.map(c => ({
        criteriaId: c.id,
        rating: ['EXCEEDS', 'MEETS', 'MEETS', 'MEETS', 'BELOW'][Math.floor(Math.random() * 5)] as 'EXCEEDS' | 'MEETS' | 'BELOW',
        comment: '',
      }))

      const values: Record<string, number> = { EXCEEDS: 3, MEETS: 2, BELOW: 1 }
      const avg = ratings.reduce((sum, r) => sum + values[r.rating], 0) / ratings.length
      const overall = avg >= 2.6 ? 'EXCEEDS' : avg >= 1.6 ? 'MEETS' : 'BELOW'

      await prisma.performanceReview.create({
        data: {
          employeeId: emp.id,
          year: reviewYear,
          quarter: reviewQuarter,
          overallRating: overall,
          comments: `${emp.email.split('@')[0]} performed well this quarter.`,
          bonusRecommendation: overall === 'EXCEEDS' ? 500 : overall === 'MEETS' ? 200 : 0,
          status: 'COMPLETED',
          ratings: { create: ratings.map(r => ({ criteriaId: r.criteriaId, rating: r.rating, comment: r.comment })) },
          goals: {
            create: [
              { description: `Improve ${['sales performance', 'inventory accuracy', 'customer service'][i]}` },
              { description: 'Complete training module', targetDate: new Date(Date.UTC(currentYear, 5, 30)) },
            ],
          },
        },
      })
    }
  }

  // ── Sample Company Documents ──
  const adminEmployee = await prisma.employee.findFirst({
    where: { user: { email: 'admin@riman.com' } },
  })

  if (adminEmployee) {
    const adminUserId = (await prisma.user.findUnique({ where: { email: 'admin@riman.com' } }))!.id

    const existingPolicies = await prisma.companyDocument.findFirst({ where: { category: 'POLICY' } })
    if (!existingPolicies) {
      await prisma.companyDocument.create({
        data: {
          category: 'POLICY',
          title: 'Employee Code of Conduct',
          fileName: 'code-of-conduct.pdf',
          filePath: '/uploads/documents/company/sample-policy.pdf',
          fileSize: 245760,
          fileType: 'application/pdf',
          notes: 'Company policies and procedures manual',
          uploadedById: adminUserId,
        },
      })
    }

    const existingForms = await prisma.companyDocument.findFirst({ where: { category: 'FORM' } })
    if (!existingForms) {
      await prisma.companyDocument.create({
        data: {
          category: 'FORM',
          title: 'Leave Request Form',
          fileName: 'leave-request-form.pdf',
          filePath: '/uploads/documents/company/sample-form.pdf',
          fileSize: 102400,
          fileType: 'application/pdf',
          notes: 'Standard leave request template',
          uploadedById: adminUserId,
        },
      })
    }
  }

  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  Riman HR — Seed Complete')
  console.log('═══════════════════════════════════════════')
  console.log('')
  console.log('  Admin:  admin@riman.com / admin123')
  console.log('  Employees:')
  for (const emp of sampleEmployees) {
    console.log(`    ${emp.email} / employee123`)
  }
  console.log('')
  console.log('  Departments: Retail, Warehouse, Admin')
  console.log('  Sample data: attendance (30 days), payroll (last month), performance reviews, company docs')
  console.log('')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

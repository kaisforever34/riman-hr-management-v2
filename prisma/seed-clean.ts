import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

// Clean delivery seed: creates ONLY what a customer needs to start —
// the initial HR Admin account plus standard reference data (leave types,
// onboarding/offboarding templates, performance criteria). It intentionally
// creates NO employees, attendance, payroll, reviews, or documents.
const prisma = new PrismaClient()

const DEFAULT_ADMIN_EMAIL = 'admin@riman.com'
const DEFAULT_ADMIN_PASSWORD = 'Admin@123'

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10)

  // ── Initial HR Admin ──
  await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {},
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      passwordHash,
      role: 'HR_ADMIN',
      employee: {
        create: {
          firstName: 'System',
          lastName: 'Admin',
          employeeCode: 'HR-001',
          dateOfBirth: new Date('1990-01-01'),
          nationality: 'AE',
          jobTitle: 'HR Admin',
          department: 'HR',
          hireDate: new Date('2020-01-01'),
          salary: 0,
          gender: 'Male',
          basicSalary: 0,
          housingAllowance: 0,
          transportAllowance: 0,
          otherAllowances: 0,
          contractType: 'INDEFINITE',
          contractStartDate: new Date('2020-01-01'),
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
  const onboardingTasks: { type: string; titleEn: string; titleAr: string; category: string; roles: string[]; order: number; isRequired: boolean }[] = [
    { type: 'ONBOARDING', titleEn: 'Personal Information', titleAr: 'المعلومات الشخصية', category: 'FORM', roles: ['EMPLOYEE'], order: 1, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Bank Account Details', titleAr: 'تفاصيل الحساب البنكي', category: 'FORM', roles: ['EMPLOYEE'], order: 2, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Emergency Contact', titleAr: 'جهة الاتصال في الطوارئ', category: 'FORM', roles: ['EMPLOYEE'], order: 3, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Passport Copy', titleAr: 'نسخة جواز السفر', category: 'DOCUMENT', roles: ['EMPLOYEE'], order: 4, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Visa / ID', titleAr: 'الإقامة / الهوية', category: 'DOCUMENT', roles: ['EMPLOYEE'], order: 5, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Certificate / Qualification', titleAr: 'الشهادات / المؤهلات', category: 'DOCUMENT', roles: ['EMPLOYEE'], order: 6, isRequired: false },
    { type: 'ONBOARDING', titleEn: 'Assign Workspace / Locker', titleAr: 'تخصيص مساحة عمل / خزانة', category: 'MANAGER_ACTION', roles: ['HR_ADMIN', 'MANAGER'], order: 7, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Uniform Fitting', titleAr: 'تجهيز الزي الرسمي', category: 'MANAGER_ACTION', roles: ['HR_ADMIN', 'MANAGER'], order: 8, isRequired: true },
    { type: 'ONBOARDING', titleEn: 'Policy Review & Acknowledgment', titleAr: 'مراجعة السياسات والتوقيع', category: 'MANAGER_ACTION', roles: ['HR_ADMIN', 'MANAGER'], order: 9, isRequired: true },
    { type: 'OFFBOARDING', titleEn: 'Exit Interview', titleAr: 'مقابلة الخروج', category: 'FORM', roles: ['EMPLOYEE'], order: 1, isRequired: true },
    { type: 'OFFBOARDING', titleEn: 'Collect Keys / Access Cards', titleAr: 'استلام المفاتيح / بطاقات الدخول', category: 'MANAGER_ACTION', roles: ['HR_ADMIN', 'MANAGER'], order: 2, isRequired: true },
    { type: 'OFFBOARDING', titleEn: 'Return Uniform / Equipment', titleAr: 'إعادة الزي الرسمي / المعدات', category: 'MANAGER_ACTION', roles: ['HR_ADMIN', 'MANAGER'], order: 3, isRequired: true },
    { type: 'OFFBOARDING', titleEn: 'Final Settlement Notification', titleAr: 'إشعار التسوية النهائية', category: 'MANAGER_ACTION', roles: ['HR_ADMIN', 'MANAGER'], order: 4, isRequired: true },
  ]
  await prisma.onboardingTask.deleteMany()
  for (const task of onboardingTasks) {
    await prisma.onboardingTask.create({ data: { ...task, roles: JSON.stringify(task.roles) } })
  }

  // ── Performance Review Criteria ──
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

  console.log('')
  console.log('═══════════════════════════════════════════')
  console.log('  Clean delivery seed complete')
  console.log('═══════════════════════════════════════════')
  console.log(`  Admin login: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`)
  console.log('  Reference data: leave types, onboarding/offboarding templates, review criteria')
  console.log('  No employees, attendance, payroll, reviews, or documents were created.')
  console.log('')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

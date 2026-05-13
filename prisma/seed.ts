import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10)

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
    await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: {},
      create: lt,
    })
  }

  console.log('Seed complete: admin@riman.com / admin123')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

import { PrismaClient, Role } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

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

  console.log('Seed complete: admin@riman.com / admin123')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

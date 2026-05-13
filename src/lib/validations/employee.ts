import { z } from 'zod'

export const employeeFormSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Required'),
  nationality: z.string().min(1, 'Required'),
  maritalStatus: z.string().optional(),
  employeeCode: z.string().min(1, 'Required').max(20),
  jobTitle: z.string().min(1, 'Required').max(100),
  department: z.string().min(1, 'Required'),
  hireDate: z.string().min(1, 'Required'),
  salary: z.string().min(1, 'Required').regex(/^\d+(\.\d{1,2})?$/, 'Invalid format'),
  role: z.enum(['HR_ADMIN', 'MANAGER', 'EMPLOYEE']).default('EMPLOYEE'),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  swift: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
})

export type EmployeeFormData = z.infer<typeof employeeFormSchema>

export const departments = ['HR', 'Finance', 'IT', 'Operations', 'Sales', 'Marketing', 'Legal', 'Executive'] as const

export const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'] as const

export const countries = [
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IN', name: 'India' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PH', name: 'Philippines' },
  { code: 'BD', name: 'Bangladesh' },
  { code: 'JO', name: 'Jordan' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
] as const
